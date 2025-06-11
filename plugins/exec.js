const util = require('util');
const axios = require('axios');

const owners = [
    '25770239992037@lid',
    '233533763772@s.whatsapp.net'
];

module.exports = {
    name: 'exec',
    aliases: ['>'],
    description: 'Execute JavaScript code (Owner only)',

    async execute() {},

    async onMessage(sock, msg) {
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (!body.startsWith('>')) return;

        const code = body.slice(1).trim();

        if (!owners.includes(sender)) {
            return await sock.sendMessage(from, {
                text: '⛔ You are not authorized to use this command.'
            }, { quoted: msg });
        }

        try {
            let result = await eval(`(async () => { ${code} })()`);
            let output = typeof result === 'string' ? result : util.inspect(result, { depth: 1 });

            const imgUrl = 'https://i.ibb.co/KpcF9Gnf/4f41074aab5a035fcac5e111911b2456-1.jpg';
            const thumbnailBuffer = (await axios.get(imgUrl, { responseType: 'arraybuffer' })).data;

            await sock.sendMessage(from, {
                text: `☑️ Result: 「 ${output} 」`,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    externalAdReply: {
                        title: 'ABZTech Exec',
                        body: 'ABZTech Console',
                        thumbnail: thumbnailBuffer,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        sourceUrl: 'https://ab-tech-api.vercel.app/'
                    }
                }
            }, { quoted: msg });

        } catch (err) {
            await sock.sendMessage(from, {
                text: `❌ Error: 「 ${err.message} 」`
            }, { quoted: msg });
        }
    }
};
