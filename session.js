// session.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const SESSION_ID = 'ABZTECH'; // i have to change this in my Hastebin key

async function downloadMultiFileAuthState(authDir = './auth_info_multi') {
  try {
    const url = `https://hastebin.com/raw/${SESSION_ID}`;
    const response = await axios.get(url);
    const sessionData = response.data;

    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

    for (const filename in sessionData) {
      fs.writeFileSync(path.join(authDir, filename), sessionData[filename], 'utf8');
    }

    console.log(`✅ Auth files restored to ${authDir}`);
  } catch (err) {
    console.error(`❌ Failed to restore session:`, err.message);
  }
}

module.exports = downloadMultiFileAuthState;
