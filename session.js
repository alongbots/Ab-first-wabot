const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function downloadMultiFileAuthState(session, authDir = './auth_info_multi') {
    try {
        if (!session || !session.startsWith("xastral"))
            throw new Error("Invalid SESSION_ID format");

        const token = "70f80eb3dc8101d1f44be24b28aef7f5fc4d5c9781e4f4866405b9895044773c5b365ea985d28b325ac9403789999ed12a99c4666b9ff21d13122949d1f6fc15";
        const key = session.split("~")[1];
        const url = `https://hastebin.com/raw/${key}`;

        const config = {
            method: 'get',
            url,
            headers: { 'Authorization': `Bearer ${token}` }
        };

        const res = await axios(config);
        if (!res.data || !res.data.content) throw new Error("Session data missing");

        const sessionData = typeof res.data.content === 'string'
            ? JSON.parse(res.data.content)
            : res.data.content;

        if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

        for (const filename in sessionData) {
            const filePath = path.join(authDir, filename);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, typeof sessionData[filename] === 'string' 
    ? sessionData[filename] 
    : JSON.stringify(sessionData[filename]), 'utf8');
        }

        console.log(`✅ Auth files restored to ${authDir}`);
    } catch (error) {
        console.error(`❌ Failed to restore session:`, error.message);
    }
}

module.exports = { downloadMultiFileAuthState };
