const axios = require('axios');

module.exports = {
    name: 'autotrigger',
    description: 'Auto reply to trigger keywords like "arise", "test", "bot", etc.',

    async execute() {}, 

    async onMessage(sock, msg) {
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        const triggerRegex = /\b(arise|test|bot|rise)\b/i;

        if (triggerRegex.test(body.trim())) {
            const info = '*BOT ACTIVE AND RUNNING...*';
            const imgUrl = 'https://i.ibb.co/KpcF9Gnf/4f41074aab5a035fcac5e111911b2456-1.jpg';
            const author = 'ABZTech';
            const botname = 'ABZTech Bot';
            const sourceUrl = 'https://ab-tech-api.vercel.app/';

            try {
                const thumbnailBuffer = (await axios.get(imgUrl, { responseType: 'arraybuffer' })).data;

                await sock.sendMessage(from, {
                    text: info,
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
                }, { quoted: msg });

                console.log(`✅ Auto-triggered reply to "${body.trim()}"`);
            } catch (err) {
                console.error('❌ Error sending preview message:', err);
            }
        }
    }
};
