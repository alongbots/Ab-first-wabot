const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const QRCode = require('qrcode');
const { Boom } = require('@hapi/boom');
const sqlite3 = require('sqlite3').verbose();

const BOT_PREFIX = '.';
const SESSION_FILE = './ab-session.json';
const PLUGIN_FOLDER = './plugins';
const PORT = process.env.PORT || 1000;

let latestQR = '';
let botStatus = 'disconnected';
let presenceInterval = null;

const db = new sqlite3.Database('./session.db');

db.run(`CREATE TABLE IF NOT EXISTS session_file (
    id INTEGER PRIMARY KEY,
    content TEXT
);`, async (err) => {
    if (err) {
        console.error("Failed to create session table:", err);
        process.exit(1);
    }

    await restoreSession();
    startBot();
});

function restoreSession() {
    return new Promise((resolve) => {
        db.get("SELECT content FROM session_file WHERE id = 1", (err, row) => {
            if (err) return console.error("DB restore error:", err);
            if (row?.content) {
                fs.writeFileSync(SESSION_FILE, row.content, 'utf8');
            }
            resolve();
        });
    });
}

function saveSessionToDB() {
    if (fs.existsSync(SESSION_FILE)) {
        const content = fs.readFileSync(SESSION_FILE, 'utf8');
        db.run("INSERT OR REPLACE INTO session_file (id, content) VALUES (1, ?)", [content]);
    }
}

async function startBot() {
    const { state, saveState } = useSingleFileAuthState(SESSION_FILE);

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        keepAliveIntervalMs: 10000,
        markOnlineOnConnect: true,
        syncFullHistory: true
    });

    setInterval(() => {
        console.log(`[${new Date().toLocaleString()}] Bot is still running...`);
    }, 5 * 60 * 1000);

    sock.ws.on('close', (code, reason) => {
        console.warn(`⚠️ WebSocket closed! Code: ${code}, Reason: ${reason}`);
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            QRCode.toDataURL(qr, (err, url) => {
                if (!err) latestQR = url;
            });
        }

        if (connection === 'close') {
            botStatus = 'disconnected';
            if (presenceInterval) clearInterval(presenceInterval);

            const statusCode = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode
                : 0;

            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);

            if (shouldReconnect) {
                console.log('Reconnecting in 10 seconds...');
                setTimeout(() => startBot(), 10000);
            } else {
                console.log('Session logged out. Cleaning up...');
                try {
                    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
                } catch (err) {
                    console.error('Failed to delete session file:', err);
                }

                db.run("DELETE FROM session_file", (err) => {
                    if (err) console.error('Failed to clear session DB:', err);
                    else console.log('✅ Cleared session DB');
                });

                setTimeout(() => startBot(), 3000);
            }
        } else if (connection === 'open') {
            botStatus = 'connected';
            console.log('Bot is connected');

            if (!presenceInterval) {
                presenceInterval = setInterval(() => {
                    if (sock?.ws?.readyState === 1) {
                        sock.sendPresenceUpdate('available');
                    }
                }, 10000);
            }

            try {
                const userJid = sock.user.id;
                await sock.sendMessage(userJid, { text: 'Bot linked successfully.' });
            } catch (err) {
                console.error('Could not send confirmation message:', err);
            }
        }
    });

    sock.ev.on('creds.update', async () => {
        await saveState();
        saveSessionToDB();
    });

    const plugins = new Map();
    const pluginPath = path.join(__dirname, PLUGIN_FOLDER);

    fs.readdirSync(pluginPath).forEach(file => {
        if (file.endsWith('.js')) {
            const plugin = require(path.join(pluginPath, file));
            if (plugin.name && typeof plugin.execute === 'function') {
                plugins.set(plugin.name.toLowerCase(), plugin);
                if (Array.isArray(plugin.aliases)) {
                    plugin.aliases.forEach(alias => plugins.set(alias.toLowerCase(), plugin));
                }
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;

        try {
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            if (body.startsWith(BOT_PREFIX)) {
                const args = body.slice(BOT_PREFIX.length).trim().split(/\s+/);
                const commandName = args.shift().toLowerCase();
                const plugin = plugins.get(commandName);

                if (plugin) {
                    try {
                        await plugin.execute(sock, msg, args);
                    } catch (err) {
                        console.error(`Error in plugin "${commandName}":`, err);
                        await sock.sendMessage(from, { text: 'Error running command.' }, { quoted: msg });
                    }
                }
            }

            for (const plugin of plugins.values()) {
                if (typeof plugin.onMessage === 'function') {
                    try {
                        await plugin.onMessage(sock, msg);
                    } catch (err) {
                        console.error(`Error in plugin [${plugin.name}] onMessage:`, err);
                    }
                }
            }
        } catch (err) {
            if (err.message?.includes("Bad MAC")) {
                console.warn("Ignored Bad MAC decryption error from:", from);
            } else {
                console.error("Unexpected error handling message:", err);
            }
        }
    });
}

http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/qr') {
        if (latestQR) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <head><title>WhatsApp QR Code</title></head>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;color:white;flex-direction:column;">
                        <h2>Scan the QR Code to Link WhatsApp</h2>
                        <img src="${latestQR}" alt="QR Code" style="border:10px solid white; max-width: 90vw;" />
                    </body>
                </html>
            `);
        } else {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('No QR code available yet. Please wait...');
        }
    } else if (url.pathname === '/watch') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            botStatus,
            time: new Date().toISOString(),
            message: 'Bot server is alive'
        }));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Server is running. Visit /qr\n');
    }
}).listen(PORT, () => {
    console.log(`HTTP Server running at http://localhost:${PORT}`);
});
