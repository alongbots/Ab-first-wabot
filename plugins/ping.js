const os = require('os');

module.exports = {
    name: 'ping',
    aliases: ['status'],
    description: 'Check bot latency and system status',

    async execute(sock, m, args) {
        const uptime = os.uptime();
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
        const freeMem = (os.freemem() / 1024 / 1024).toFixed(2);
        const platform = os.platform();
        const cpuCount = os.cpus().length;
        const arch = os.arch();

        const statusMessage = `
┌───⏱️ *pong!*
│
├ 🟢 *Status:* Online & Active
├ 🕰️ *Uptime:* ${(uptime / 60).toFixed(2)} mins
├ 🧠 *CPU Cores:* ${cpuCount}
├ 🖥️ *Platform:* ${platform} (${arch})
├ 📦 *RAM:* ${freeMem} MB Free / ${totalMem} MB Total
│
└────✨ *ABZTech*
        `.trim();

        await m.reply(statusMessage); 
    }
};
