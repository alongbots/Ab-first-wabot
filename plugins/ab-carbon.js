const axios = require('axios');

module.exports = {
  name: 'carbon',
  description: 'Generate a stylized code snippet using AB Carbon',
  async execute(sock, m, args) {
    let text = args.join(' ');
    if (!text && m.quoted?.message) {
      text =
        m.quoted.message.conversation ||
        m.quoted.message.extendedTextMessage?.text ||
        '';
    }

    if (!text) return await m.reply('Please provide text or reply to a message.');

    const theme = 'seti';

    try {
      const response = await axios.get(`https://ab-carbon.abrahamdw882.workers.dev/?q=${encodeURIComponent(text)}&theme=${theme}`, {
        responseType: 'arraybuffer'
      });
      const buffer = Buffer.from(response.data, 'binary');
      await sock.sendMessage(m.from, {
        image: buffer,
        caption: "Here's your stylized code snippet:"
      }, { quoted: m });

    } catch (err) {
      console.error('Error generating carbon image:', err);
      await m.reply('Failed to generate the stylized code snippet. Please try again later.');
    }
  }
};
