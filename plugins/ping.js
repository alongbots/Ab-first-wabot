const os = require('os');

module.exports = {
    name: 'ping',
    aliases: ['status'],
    description: 'Check bot latency and system status',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;

        const uptime = os.uptime(); 
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
        const freeMem = (os.freemem() / 1024 / 1024).toFixed(2);
        const platform = os.platform();
        const cpuCount = os.cpus().length;
        const arch = os.arch();

        const response = `
🏓 *Pong!*
📡 *Bot Uptime:* ${(uptime / 60).toFixed(2)} mins
💻 *Platform:* ${platform} (${arch})
🧠 *CPU Cores:* ${cpuCount}
📦 *RAM:* ${freeMem} MB free / ${totalMem} MB total
`;

        await sock.sendMessage(from, { text: response.trim() }, { quoted: msg });
    }
};
