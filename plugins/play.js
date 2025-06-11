const axios = require('axios');

let handler = async (m, { conn, text }) => {
  if (!text) throw '✳️ What do you want me to search for on YouTube?';

  try {
    await m.react('⏳');

    const query = encodeURIComponent(text);
    const response = await axios.get(`https://ab-yts.abrahamdw882.workers.dev?query=${query}`);
    const results = response.data;

    if (!results || results.length === 0) {
      throw 'No results found for the given query.';
    }

    const firstResult = results[0];

    const forwardMessage = `*✨ ${firstResult.title} ✨*\n───────────────\n🖇️ *Link*: ${firstResult.url}  \n⏱️ *Duration*: ${firstResult.duration?.timestamp || 'N/A'}  \n👁️ *Views*: ${firstResult.views || 'N/A'}  \n🎬 *Channel*: ${firstResult.author?.name || 'Unknown'}\n     *MADE WITH LOVE BY ABZTech Bot*`;

    const dlRes = await axios.get(`https://ab-proytdl.abrahamdw882.workers.dev/?url=${encodeURIComponent(firstResult.url)}`);
    const dlData = dlRes.data;

    if (!dlData?.audio?.[0]?.download) {
      throw '❌ No audio found for this video.';
    }

    const musicUrl = dlData.audio[0].download;
    const thumbRes = await axios.get(firstResult.thumbnail, { responseType: 'arraybuffer' });
    const thumbBuffer = Buffer.from(thumbRes.data, 'binary');

    await conn.sendMessage(m.chat, {
      audio: { url: musicUrl },
      mimetype: 'audio/mpeg',
      ptt: false,
      caption: forwardMessage,
      jpegThumbnail: thumbBuffer,
      contextInfo: {
        isForwarded: true,
        forwardingScore: 999,
        externalAdReply: {
          title: firstResult.title,
          body: `${firstResult.author?.name || 'Unknown Artist'}`,
          thumbnail: thumbBuffer,
          mediaType: 2,
          mediaUrl: firstResult.url,
          sourceUrl: firstResult.url,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m });

    await m.react('✅');

  } catch (err) {
    await m.react('❌');
    console.error('YT Play Error:', err.message || err);
    throw '❌ Failed to fetch or send the audio.';
  }
};

handler.help = ['ytm', 'play'].map(v => v + ' <query>');
handler.tags = ['downloader'];
handler.command = /^ytm|play$/i;

module.exports = handler;
