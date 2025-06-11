const axios = require('axios');

module.exports = {
    name: 'testbot',
    description: 'Send a forwarded rich preview message',
    aliases: ['test', 'rise', 'arise', 'bot'],

    async execute(sock, msg) {
        const from = msg.key.remoteJid;
        const info = '*BOT ACTIVE AND RUNNING..*';
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
        } catch (err) {
            console.error('❌ Error sending preview message:', err);
        }
    }
};
