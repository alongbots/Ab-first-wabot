const axios = require('axios');

module.exports = {
    name: 'ytm',
    description: 'Download YouTube audio by searching a video',
    aliases: ['play'],

    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        const body = args.join(' ');
        if (!body) {
            await sock.sendMessage(from, { text: '✳️ What do you want me to search for on YouTube?' }, { quoted: msg });
            return;
        }

        try {
            
            await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
            const query = encodeURIComponent(body);
            const response = await axios.get(`https://ab-yts.abrahamdw882.workers.dev?query=${query}`);
            const results = response.data;

            if (!results || results.length === 0) {
                await sock.sendMessage(from, { text: '❌ No results found for that query.' }, { quoted: msg });
                return;
            }

            const firstResult = results[0];
            const downloadRes = await axios.get(`https://ab-proytdl.abrahamdw882.workers.dev/?url=${encodeURIComponent(firstResult.url)}`);
            const downloadData = downloadRes.data;

            const audioUrl = downloadData?.audio?.[0]?.download;
            if (!audioUrl) {
                await sock.sendMessage(from, { text: '❌ No downloadable audio found.' }, { quoted: msg });
                return;
            }

            const thumbBuffer = (await axios.get(firstResult.thumbnail, { responseType: 'arraybuffer' })).data;

            const caption = `*✨ ${firstResult.title} ✨*\n───────────────\n🖇️ *Link*: ${firstResult.url}\n⏱️ *Duration*: ${firstResult.duration?.timestamp || 'N/A'}\n👁️ *Views*: ${firstResult.views || 'N/A'}\n🎬 *Channel*: ${firstResult.author?.name || 'Unknown'}\n\n*Made with 💖 by ABZTech Bot*`;

            await sock.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                ptt: false,
                caption: caption,
                jpegThumbnail: thumbBuffer,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    externalAdReply: {
                        title: firstResult.title,
                        body: firstResult.author?.name || 'Unknown Artist',
                        mediaType: 2,
                        thumbnail: thumbBuffer,
                        mediaUrl: firstResult.url,
                        sourceUrl: firstResult.url,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error('YT Play Error:', err.message || err);
            await sock.sendMessage(from, { text: '❌ Failed to fetch or send the audio.' }, { quoted: msg });
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        }
    },

    async onMessage() {} 
};
