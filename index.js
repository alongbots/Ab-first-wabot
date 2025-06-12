const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const { useSQLiteAuthState } = require('./sqlite-auth');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const QRCode = require('qrcode');
const { Boom } = require('@hapi/boom');

// ===== CONFIGURATION ===== //
const BOT_PREFIX = '.';
const PLUGIN_FOLDER = './plugins';
const PORT = process.env.PORT || 3000;
// ========================= //

let latestQR = '';
let botStatus = 'disconnected';

async function startBot() {
    const { state, saveCreds } = useSQLiteAuthState();

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        keepAliveIntervalMs: 10000,
    });

    setInterval(() => {
        console.log(`[${new Date().toLocaleString()}] Bot is still running...`);
    }, 5 * 60 * 1000);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            QRCode.toDataURL(qr, (err, url) => {
                if (!err) latestQR = url;
            });
        }

        if (connection === 'close') {
            botStatus = 'disconnected';
            const statusCode = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode
                : 0;

            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);

            if (shouldReconnect) {
                console.log('Reconnecting in 10 seconds...');
                setTimeout(startBot, 10000);
            } else {
                console.log('Session logged out. Delete database to re-authenticate.');
            }
        } else if (connection === 'open') {
            botStatus = 'connected';
            console.log('Bot is connected');
            try {
                const userJid = sock.user.id;
                await sock.sendMessage(userJid, { text: 'Bot linked successfully.' });
            } catch (err) {
                console.error('Could not send confirmation message:', err);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    const plugins = new Map();
    const pluginPath = path.join(__dirname, PLUGIN_FOLDER);

    if (fs.existsSync(pluginPath)) {
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
    }

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

startBot();

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
