const fetch = require('node-fetch');

const chatbotUsers = new Set();

module.exports = {
    name: 'chatbot',
    description: 'Toggle AI Chatbot mode',

    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;

        if (chatbotUsers.has(from)) {
            chatbotUsers.delete(from);
            await sock.sendMessage(from, { text: '🤖 Chatbot *disabled* for this chat.' }, { quoted: msg });
        } else {
            chatbotUsers.add(from);
            await sock.sendMessage(from, { text: '🤖 Chatbot *enabled*! Reply to this message or send any text.' }, { quoted: msg });
        }
    },

    async onMessage(sock, msg) {
        const from = msg.key.remoteJid;
        const isBot = msg.key.fromMe;
        const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

        if (isBot || !chatbotUsers.has(from)) return;

        try {
            const q = encodeURIComponent(body);
            const apiUrl = `https://ab-tech-ai.abrahamdw882.workers.dev/?q=${q}`;

            const res = await fetch(apiUrl);
            const json = await res.json();

            const reply = json.response || '🤖 Sorry, I could not understand.';
            await sock.sendMessage(from, { text: reply }, { quoted: msg });
        } catch (err) {
            console.error('❌ Chatbot API error:', err);
            await sock.sendMessage(from, { text: '⚠️ Failed to get response from AI.' }, { quoted: msg });
        }
    }
};
