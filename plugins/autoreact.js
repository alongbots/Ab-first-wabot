module.exports = { 
    name: 'autoreact',
    description: 'Auto-react to ABZTech messages',

    async onMessage(sock, msg) {
        try {
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            const targetJid = '233533763772@s.whatsapp.net';
            const reactionEmoji = '✨';

            if (sender === targetJid) {
                await sock.sendMessage(from, {
                    react: {
                        text: reactionEmoji,
                        key: msg.key,
                    },
                });
            }
        } catch (err) {
            console.error('❌ Auto-react error:', err);
        }
    },
};
