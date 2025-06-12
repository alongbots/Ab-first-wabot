const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http');
const QRCode = require('qrcode');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const useSQLAuthState = require('./creds');

const BOT_PREFIX = '.';
const PLUGIN_FOLDER = './plugins';
const PORT = process.env.PORT || 3000;

let latestQR = '';
let botStatus = 'disconnected';

async function startBot() {
    const { state, saveCreds } = await useSQLAuthState();

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        keepAliveIntervalMs: 10000,
    });

    setInterval(() => {
        console.log(`[${new Date().toLocaleString()}] Bot is still running...`);
    }, 5 * 60 * 1000);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr) QRCode.toDataURL(qr, (err, url) => !err && (latestQR = url));

        if (connection === 'close') {
            botStatus = 'disconnected';
            const code = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output.statusCode : 0;
            const shouldReconnect = code !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) setTimeout(startBot, 10000);
        } else if (connection === 'open') {
            botStatus = 'connected';
            console.log('Bot is connected');
            try {
                await sock.sendMessage(sock.user.id, { text: '✅ Bot linked successfully.' });
            } catch (e) { console.error('Error sending message:', e); }
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
                    await sock.sendMessage(from, { text: '❌ Error running command.' }, { quoted: msg });
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
    });
}

startBot();

http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/qr') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(latestQR ? `
            <html><body style="background:#111;color:#fff;text-align:center;">
                <h2>Scan QR Code</h2>
                <img src="${latestQR}" style="max-width:90vw;border:10px solid white;" />
            </body></html>` : 'QR not generated yet.');
    } else if (url.pathname === '/watch') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'online', botStatus, time: new Date().toISOString() }));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Server running. Use /qr to view QR.');
    }
}).listen(PORT, () => {
    console.log(`HTTP Server running at http://localhost:${PORT}`);
});
