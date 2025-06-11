module.exports = {
    name: 'autoreact',
    description: 'Auto-react to ABZTech messages',

    async onMessage(sock, msg) {
        try {
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            console.log('🔍 Incoming message from:', sender);
            await sock.sendMessage(from, {
                react: {
                    text: '✨',
                    key: msg.key,
                },
            });

        } catch (err) {
            console.error('❌ Auto-react error:', err);
        }
    }
};
