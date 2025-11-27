const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Boom } = require('@hapi/boom');
const sqlite3 = require('sqlite3').verbose();
const qrcode = require('qrcode-terminal');

const serializeMessage = require('./handler.js');

global.generateWAMessageFromContent = generateWAMessageFromContent;

// ===== CONFIGURATION ===== //
global.BOT_PREFIX = '.';
const AUTH_FOLDER = './auth_info_multi';
const PLUGIN_FOLDER = './plugins';
const PORT = process.env.PORT || 3000;

const owners = [
    '25770239992037@lid',
    '233533763772@s.whatsapp.net'
];
global.owners = owners;
// ========================= //

let botStatus = 'disconnected';
let presenceInterval = null;
const db = new sqlite3.Database('./session.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        filename TEXT PRIMARY KEY,
        content TEXT
    );`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );`);

    db.get("SELECT value FROM settings WHERE key = 'prefix'", (err, row) => {
        if (!err && row) {
            global.BOT_PREFIX = row.value;
            console.log(` Loaded prefix: ${global.BOT_PREFIX}`);
        }
        startBot();
    });
});

function restoreAuthFiles() {
    return new Promise((resolve) => {
        db.all("SELECT * FROM sessions", (err, rows) => {
            if (err) return console.error("DB restore error:", err);
            if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER);
            rows.forEach(row => {
                fs.writeFileSync(path.join(AUTH_FOLDER, row.filename), row.content, 'utf8');
            });
            resolve();
        });
    });
}

function saveAuthFilesToDB() {
    try {
        if (!fs.existsSync(AUTH_FOLDER)) return;
        fs.readdirSync(AUTH_FOLDER).forEach(file => {
            const filePath = path.join(AUTH_FOLDER, file);
            const content = fs.readFileSync(filePath, 'utf8');
            db.run("INSERT OR REPLACE INTO sessions (filename, content) VALUES (?, ?)", [file, content], (err) => {
                if (err) console.error(`Failed to save ${file}:`, err);
            });
        });
    } catch (error) {
        console.error('Error saving auth files to DB:', error);
    }
}

async function startBot() {
    console.log('🚀 Starting WhatsApp Bot...');
    await restoreAuthFiles();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }), // Reduced logging to avoid noise
        auth: state,
        browser: ['Ubuntu', 'Chrome', '22.04.4'], // Add browser info
        version: [2, 3000, 1023238217], // Add version info
        keepAliveIntervalMs: 10000,
        markOnlineOnConnect: false, // Set to false initially
        syncFullHistory: false, // Set to false to reduce load
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        emitOwnEvents: true,
        retryRequestDelayMs: 250
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin } = update;

        console.log('🔗 Connection update:', { connection, qr: !!qr });

        // Handle QR Code
        if (qr) {
            console.log('\n📱 SCAN THIS QR CODE TO LOGIN:');
            console.log('══════════════════════════════════════');
            qrcode.generate(qr, { small: true });
            console.log('══════════════════════════════════════');
            console.log('QR Code ready for scanning!');
        }

        if (connection === 'close') {
            botStatus = 'disconnected';
            if (presenceInterval) clearInterval(presenceInterval);

            const statusCode = (lastDisconnect?.error instanceof Boom) ? lastDisconnect.error.output.statusCode : 0;
            
            console.log(`🔌 Connection closed with status code: ${statusCode}`);
            console.log(`📋 Disconnect reason: ${DisconnectReason[statusCode] || 'Unknown'}`);

            if (statusCode === DisconnectReason.loggedOut) {
                console.log('🚪 Logged out. Cleaning up session...');
                if (fs.existsSync(AUTH_FOLDER)) fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                db.run("DELETE FROM sessions", (err) => { 
                    if (err) console.error('DB clear failed:', err); 
                });
                console.log('🔄 Restarting in 3 seconds...');
                setTimeout(() => startBot(), 3000);
            } else {
                console.log('🔄 Reconnecting in 5 seconds...');
                setTimeout(() => startBot(), 5000);
            }
        } else if (connection === 'open') {
            botStatus = 'connected';
            console.log('✅ Bot is connected successfully!');

            presenceInterval = setInterval(() => {
                if (sock?.ws?.readyState === 1) {
                    sock.sendPresenceUpdate('available');
                }
            }, 30000);

            try { 
                await sock.sendMessage(sock.user.id, { 
                    text: `🤖 Bot linked successfully!\n\nCurrent prefix: ${global.BOT_PREFIX}\nStatus: Connected ✅` 
                }); 
                console.log('📨 Welcome message sent to owner');
            } catch (err) { 
                console.error('Could not send welcome message:', err.message); 
            }
        } else if (connection === 'connecting') {
            console.log('🔄 Connecting to WhatsApp...');
            botStatus = 'connecting';
        }
    });

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        saveAuthFilesToDB();
    });

    // Handle connection errors
    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'close') {
            console.log('❌ Connection error:', update.lastDisconnect?.error?.message);
        }
    });

    const plugins = new Map();
    const pluginPath = path.join(__dirname, PLUGIN_FOLDER);
    try {
        if (fs.existsSync(pluginPath)) {
            fs.readdirSync(pluginPath).forEach(file => {
                if (file.endsWith('.js')) {
                    try {
                        const plugin = require(path.join(pluginPath, file));
                        if (plugin.name && typeof plugin.execute === 'function') {
                            plugins.set(plugin.name.toLowerCase(), plugin);
                            if (Array.isArray(plugin.aliases)) plugin.aliases.forEach(alias => plugins.set(alias.toLowerCase(), plugin));
                            console.log(`✅ Loaded plugin: ${plugin.name}`);
                        } else console.warn(`⚠️ Invalid plugin structure in ${file}`);
                    } catch (error) {
                        console.error(`❌ Failed to load plugin ${file}:`, error.message);
                    }
                }
            });
            console.log(`📦 Loaded ${plugins.size} plugins`);
        } else {
            console.log('⚠️ Plugins folder not found');
        }
    } catch (error) { 
        console.error('❌ Error loading plugins:', error); 
    }

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const rawMsg = messages[0];
        if (!rawMsg.message) return;

        const m = await serializeMessage(sock, rawMsg);

        if (m.body && m.body.startsWith(global.BOT_PREFIX)) {
            const args = m.body.slice(global.BOT_PREFIX.length).trim().split(/\s+/);
            const commandName = args.shift().toLowerCase();
            const plugin = plugins.get(commandName);
            if (plugin) {
                try { await plugin.execute(sock, m, args); }
                catch (err) { 
                    console.error(`❌ Plugin error (${commandName}):`, err); 
                    await m.reply('❌ Error running command.'); 
                }
            }
        }
        for (const plugin of plugins.values()) {
            if (typeof plugin.onMessage === 'function') {
                try { await plugin.onMessage(sock, m); }
                catch (err) { console.error(`❌ onMessage error (${plugin.name}):`, err); }
            }
        }
    });
}

// Simple HTTP server just to keep the process alive
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Server is Running. Check console for QR code.');
}).listen(PORT, () => console.log(`HTTP Server running at http://localhost:${PORT}`));    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );`);

    db.get("SELECT value FROM settings WHERE key = 'prefix'", (err, row) => {
        if (!err && row) {
            global.BOT_PREFIX = row.value;
            console.log(` Loaded prefix: ${global.BOT_PREFIX}`);
        }
        startBot();
    });
});

function restoreAuthFiles() {
    return new Promise((resolve) => {
        db.all("SELECT * FROM sessions", (err, rows) => {
            if (err) return console.error("DB restore error:", err);
            if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER);
            rows.forEach(row => {
                fs.writeFileSync(path.join(AUTH_FOLDER, row.filename), row.content, 'utf8');
            });
            resolve();
        });
    });
}

function saveAuthFilesToDB() {
    try {
        if (!fs.existsSync(AUTH_FOLDER)) return;
        fs.readdirSync(AUTH_FOLDER).forEach(file => {
            const filePath = path.join(AUTH_FOLDER, file);
            const content = fs.readFileSync(filePath, 'utf8');
            db.run("INSERT OR REPLACE INTO sessions (filename, content) VALUES (?, ?)", [file, content], (err) => {
                if (err) console.error(`Failed to save ${file}:`, err);
            });
        });
    } catch (error) {
        console.error('Error saving auth files to DB:', error);
    }
}

async function startBot() {
    console.log('🚀 Starting WhatsApp Bot...');
    await restoreAuthFiles();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const sock = makeWASocket({
        logger: pino({ level: 'info' }),
        auth: state,
        keepAliveIntervalMs: 10000,
        markOnlineOnConnect: true,
        syncFullHistory: true
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📱 Scan the QR code below to login:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            botStatus = 'disconnected';
            if (presenceInterval) clearInterval(presenceInterval);

            const statusCode = (lastDisconnect?.error instanceof Boom) ? lastDisconnect.error.output.statusCode : 0;

            if (statusCode !== DisconnectReason.loggedOut) {
                console.log('Connection closed. Reconnecting in 10 seconds...');
                setTimeout(() => startBot(), 10000);
            } else {
                console.log('Logged out. Cleaning up session...');
                if (fs.existsSync(AUTH_FOLDER)) fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                db.run("DELETE FROM sessions", (err) => { if (err) console.error('DB clear failed:', err); });
                setTimeout(() => startBot(), 3000);
            }
        } else if (connection === 'open') {
            botStatus = 'connected';
            console.log('✅ Bot is connected successfully!');

            presenceInterval = setInterval(() => {
                if (sock?.ws?.readyState === 1) sock.sendPresenceUpdate('available');
            }, 10000);

            try { 
                await sock.sendMessage(sock.user.id, { text: `Bot linked successfully!\nCurrent prefix: ${global.BOT_PREFIX}` }); 
            } catch (err) { 
                console.error('Could not send message:', err); 
            }
        }
    });

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        saveAuthFilesToDB();
    });

    const plugins = new Map();
    const pluginPath = path.join(__dirname, PLUGIN_FOLDER);
    try {
        fs.readdirSync(pluginPath).forEach(file => {
            if (file.endsWith('.js')) {
                try {
                    const plugin = require(path.join(pluginPath, file));
                    if (plugin.name && typeof plugin.execute === 'function') {
                        plugins.set(plugin.name.toLowerCase(), plugin);
                        if (Array.isArray(plugin.aliases)) plugin.aliases.forEach(alias => plugins.set(alias.toLowerCase(), plugin));
                        console.log(`✅ Loaded plugin: ${plugin.name}`);
                    } else console.warn(`⚠️ Invalid plugin structure in ${file}`);
                } catch (error) {
                    console.error(`❌ Failed to load plugin ${file}:`, error.message);
                }
            }
        });
        console.log(`📦 Loaded ${plugins.size} plugins`);
    } catch (error) { console.error('❌ Error loading plugins:', error); }

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const rawMsg = messages[0];
        if (!rawMsg.message) return;

        const m = await serializeMessage(sock, rawMsg);

        if (m.body.startsWith(global.BOT_PREFIX)) {
            const args = m.body.slice(global.BOT_PREFIX.length).trim().split(/\s+/);
            const commandName = args.shift().toLowerCase();
            const plugin = plugins.get(commandName);
            if (plugin) {
                try { await plugin.execute(sock, m, args); }
                catch (err) { console.error(`❌ Plugin error (${commandName}):`, err); await m.reply('Error running command.'); }
            }
        }
        for (const plugin of plugins.values()) {
            if (typeof plugin.onMessage === 'function') {
                try { await plugin.onMessage(sock, m); }
                catch (err) { console.error(`❌ onMessage error (${plugin.name}):`, err); }
            }
        }
    });
}

// Simple HTTP server just to keep the process alive
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Server is Running. Check console for QR code.');
}).listen(PORT, () => console.log(`HTTP Server running at http://localhost:${PORT}`));
