const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ===== CONFIGURATION ===== //
const BOT_PREFIX = '.'; // Bot command prefix
const AUTH_FOLDER = './auth_info_multi'; // Folder for session
const PLUGIN_FOLDER = './plugins';
const PORT = process.env.PORT || 3000; 
// ========================= //

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // We'll use qrcode-terminal
        auth: state
    });

    // Show QR manually
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Bot is connected');
            // Send confirmation to your own number
            const userJid = sock.user.id;
            sock.sendMessage(userJid, { text: '✅ Bot linked successfully!' });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Load plugins
    const plugins = new Map();
    const pluginPath = path.join(__dirname, PLUGIN_FOLDER);
    fs.readdirSync(pluginPath).forEach(file => {
        if (file.endsWith('.js')) {
            const plugin = require(path.join(pluginPath, file));
            if (plugin.name && plugin.execute) {
                plugins.set(plugin.name, plugin);
                if (plugin.aliases) {
                    plugin.aliases.forEach(alias => plugins.set(alias, plugin));
                }
            }
        }
    });

    // Message handler
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (!body.startsWith(BOT_PREFIX)) return;

        const args = body.slice(BOT_PREFIX.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        const plugin = plugins.get(commandName);
        if (plugin) {
            try {
                await plugin.execute(sock, msg, args);
            } catch (err) {
                console.error(`❌ Error in plugin "${commandName}":`, err);
                await sock.sendMessage(from, { text: '⚠️ Error running command.' }, { quoted: msg });
            }
        }
    });
}

startBot();

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('working i guess\n');
}).listen(PORT, () => {
    console.log(`🌐 HTTP Server running at http://localhost:${PORT}`);
});
