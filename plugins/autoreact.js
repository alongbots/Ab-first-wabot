module.exports = {
    name: 'autoreact',
    description: 'Auto-react to ABZTech messages',

    async execute() {},

    async onMessage(sock, msg) {
        try {
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            const senderBase = sender.split('@')[0];

            console.log('🔍 Incoming message from:', senderBase);

            const targetNumber = '233533763772';
            const reactionEmoji = '✨';

            if (senderBase === targetNumber) {
                console.log('✨ Reacting to message...');
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
    }
};
