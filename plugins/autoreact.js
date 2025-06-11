module.exports = {
    name: 'autoreact',
    description: 'Auto-react to ABZTech messages',

    async execute() {},

    async onMessage(sock, msg) {
        try {
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;

            
            const normalizedSender = `${sender.split('@')[0]}@s.whatsapp.net`;
            const targetJid = '233533763772@s.whatsapp.net'; 
            const reactionEmoji = '✨';

            console.log('🔍 Normalized sender:', normalizedSender);

            if (normalizedSender === targetJid) {
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
