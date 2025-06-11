const chatbotUsers = new Set();
const DEFAULT_AI_ENDPOINT = 'https://ab-techiai.abrahamdw882.workers.dev/';

module.exports = {
    name: 'chatbot',
    description: 'Toggle AI Chatbot mode',

    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;

        if (chatbotUsers.has(from)) {
            chatbotUsers.delete(from);
            await sock.sendMessage(from, 
                { text: '🤖 Chatbot *disabled* for this chat.' }, 
                { quoted: msg }
            );
        } else {
            chatbotUsers.add(from);
            await sock.sendMessage(from, 
                { text: '🤖 Chatbot *enabled*! I will now respond to messages in this chat.' }, 
                { quoted: msg }
            );
        }
    },

    async onMessage(sock, msg) {
        const from = msg.key.remoteJid;
        const isBot = msg.key.fromMe;
        const body = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || '';
        if (isBot || !chatbotUsers.has(from) || !body.trim()) return;

        try {
            const response = await fetch(DEFAULT_AI_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: body }]
                })
            });

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || 
                         "🤖 Sorry, I couldn't process your request.";

            await sock.sendMessage(from, { text: reply }, { quoted: msg });

        } catch (err) {
            console.error('Chatbot error:', err);
            await sock.sendMessage(from, 
                { text: '⚠️ An error occurred while processing your message.' }, 
                { quoted: msg }
            );
        }
    }
};
