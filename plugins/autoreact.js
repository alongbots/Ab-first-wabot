module.exports = {
    name: 'autoreact',
    description: 'Auto-react to ABZTech messages',

    async execute() {},

    async onMessage(sock, msg) {
        try {
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;

            const targetNumber = '233533763772'; 
            const senderNumber = sender.split('@')[0]; 
            const reactionEmoji = '✨';

            console.log('🔍 Normalized sender:', senderNumber);

            if (senderNumber === targetNumber) {
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
