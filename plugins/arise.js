const axios = require('axios');

module.exports = {
    name: 'autorise',
    description: 'Auto reply to trigger keywords like "arise", "test", "bot", etc.',

    async execute() {},

    async onMessage(sock, m) {
        if (m.isBot || !m.text) return;

        const triggerRegex = /\b(arise|test|bot|rise)\b/i;

        if (triggerRegex.test(m.text.trim())) {
            const info = '*BOT ACTIVE AND RUNNING...*';
            const imgUrl = 'https://i.ibb.co/KpcF9Gnf/4f41074aab5a035fcac5e111911b2456-1.jpg';
            const author = 'ABZTech';
            const botname = 'ABZTech Bot';
            const sourceUrl = 'https://ab-tech-api.vercel.app/';

            try {
                const thumbnailBuffer = (await axios.get(imgUrl, { responseType: 'arraybuffer' })).data;

                await m.send(info, {
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        externalAdReply: {
                            title: author,
                            body: botname,
                            thumbnail: thumbnailBuffer,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            sourceUrl
                        }
                    }
                });
            } catch (err) {
                console.error('❌ Error sending preview message:', err);
                await m.reply('⚠️ Failed to send auto-response.');
            }
        }
    }
};
