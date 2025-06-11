const fetch = require('node-fetch');

module.exports = {
    name: 'chatbot',
    aliases: ['ai'],
    description: 'Toggle chatbot mode on/off',

    async execute(sock, msg, args, activeReplyMode) {
        const from = msg.key.remoteJid;

        if (activeReplyMode.has(from)) {
            activeReplyMode.delete(from);
            await sock.sendMessage(from, { text: '🤖 Chatbot mode deactivated.' }, { quoted: msg });
        } else {
            activeReplyMode.add(from);
            await sock.sendMessage(from, { text: '🤖 Chatbot mode activated. Reply to me!' }, { quoted: msg });
        }
    },

    async onMessage(sock, msg, activeReplyMode) {
        const from = msg.key.remoteJid;
        const isReplyToBot = msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user.id;

        if (activeReplyMode.has(from) && isReplyToBot) {
            const userText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            if (!userText) return;

            try {
                const res = await fetch(`https://ab-deepseekai.abrahamdw882.workers.dev/?q=${encodeURIComponent(userText)}`);
                const data = await res.json();
                const reply = data.response || '🤖 Sorry, I have no response.';

                await sock.sendMessage(from, { text: reply }, { quoted: msg });
            } catch (err) {
                console.error('Chatbot API error:', err);
                await sock.sendMessage(from, { text: '⚠️ AI failed to respond.' }, { quoted: msg });
            }
        }
    }
};
