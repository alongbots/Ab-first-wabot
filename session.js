const fs = require('fs');
const axios = require('axios');
const path = require('path');

const SESSION_ID = 'ABZTECH'; 

async function downloadSession(sessionId = SESSION_ID, savePath = './session/creds.json') {
  try {
    const url = `https://hastebin.com/raw/${sessionId}`;
    const res = await axios.get(url);
    
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(savePath, JSON.stringify(res.data, null, 2));
    console.log(`✅ Session file saved to ${savePath}`);
  } catch (err) {
    console.error('❌ Failed to download session:', err.message);
    throw err;
  }
}

module.exports = downloadSession;
