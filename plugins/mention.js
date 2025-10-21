module.exports = {
    name: 'mention-owner',
    description: 'Auto reply + react when owner is tagged in a group',

    async execute() {},

    async onMessage(sock, m) {
        try {
            const text = m.body || m.text || m.message?.extendedTextMessage?.text || '';
           // console.log('New message:', text); YA FOR DEBUGS

            const owners = ['185452896239861','918731810311'];
            const isOwnerTagged = owners.some(owner => text.includes(`@${owner}`));
            if (!isOwnerTagged) return;

            //console.log('Owner was tagged!'); YA FOR DEBUGS

            const name = m.pushName || m.sender.split('@')[0];
            const audioUrl = 'https://files.catbox.moe/mlngid.mp3';
            const thumbnail = 'https://files.catbox.moe/8q5ttw.jpg';
            const quoted = {
                key: {
                    fromMe: false,
                    participant: m.sender,
                    ...(m.isGroup ? { remoteJid: m.from } : {}),
                },
                message: {
                    contactMessage: {
                        displayName: name,
                        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
                    },
                },
            };

            await m.send(
                {
                    audio: { url: audioUrl },
                    mimetype: 'audio/mpeg',
                    ptt: true,
                    waveform: [100, 0, 100, 0, 100, 0, 100],
                    fileName: 'OwnerTag',
                    contextInfo: {
                        mentionedJid: [m.sender],
                        externalAdReply: {
                            title: "You tagged my owner ALONG",
                            body: 'LORD ALONG',
                            thumbnailUrl: thumbnail,
                            sourceUrl: 'https://www.along-bots.zone.id',
                            mediaType: 1,
                            renderLargerThumbnail: true,
                        },
                    },
                },
                { quoted }
            );

            await m.react("✨");

        } catch (err) {
            console.error('❌ Mention-owner plugin error:', err);
        }
    }
};
