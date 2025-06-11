const process = require('process');

module.exports = {
    name: 'uptime',
    aliases: ['up'],
    description: 'Check how long the bot has been running.',
    async execute(sock, msg) {
        const from = msg.key.remoteJid;
        const uptime = process.uptime(); 

        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const formattedTime = `${hours}h ${minutes}m ${seconds}s`;

        await sock.sendMessage(from, { text: `⏱️ Bot Uptime: ${formattedTime}` }, { quoted: msg });
    }
};
