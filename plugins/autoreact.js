module.exports = {
    name: 'autoreact',
    description: 'Auto-react to ABZTech messages',

    async execute() {},

    async onMessage(sock, msg) {
        try {
            if (!msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;

            const owners = [
                '25770239992037@lid',
                '233533763772@s.whatsapp.net'
            ];

            const reactionEmoji = '✨';

            if (owners.includes(sender)) {
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
