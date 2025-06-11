module.exports = {
    name: 'autoreact',
    description: 'Auto-react to ABZTech',

    async onMessage(sock, msg) {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const targetJid = '233268374753@s.whatsapp.net';
        const reactionEmoji = '✨';

        if (sender === targetJid) {
            try {
                await sock.sendMessage(from, {
                    react: {
                        text: reactionEmoji,
                        key: msg.key
                    }
                });
            } catch (err) {
                console.error('❌ Auto-react error:', err);
            }
        }
    }
};
