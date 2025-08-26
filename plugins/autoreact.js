module.exports = {
    name: 'autoreact',
    description: 'Auto-react to ABZTech messages',

    async execute() {},

    async onMessage(sock, m) {
        try {
            if (m.isBot || !m.message) return;

            const owners = [
                '25770239992037@lid',
                '233533763772@s.whatsapp.net'
            ];

            const reactionEmoji = '✨';

            if (owners.includes(m.sender)) {
                await m.react(reactionEmoji);
            }
        } catch (err) {
            console.error('❌ Auto-react error:', err);
        }
    }
};
