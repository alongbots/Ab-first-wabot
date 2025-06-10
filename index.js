// © 2025 Chanuka | Not for resale or redistribution without permission.
// Educational use only.


const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')

const pino = require('pino')

const qrcode = require('qrcode-terminal')

const axios = require('axios')

const os = require('os')

const prefix = '.ai'

const admin = ['your_number@s.whatsapp.net'] // don't add +

// Bot modes

let prefixMode = true

let publicMode = true

let chatMode = 'both'

let blockedUsers = []



const mediaContent = {

  anime: [

    'https://api.waifu.pics/sfw/waifu',

    'https://api.waifu.pics/sfw/neko',

    'https://api.waifu.pics/sfw/shinobu',

    'https://api.waifu.pics/sfw/megumin'

  ],

  memes: [

    'https://api.imgflip.com/get_memes',

    'https://meme-api.herokuapp.com/gimme'

  ],

  quotes: [

    'https://api.quotable.io/random',

    'https://zenquotes.io/api/random'

  ],

  facts: [

    'https://uselessfacts.jsph.pl/random.json?language=en',

    'https://api.api-ninjas.com/v1/facts'

  ]

}

async function startBot() {

  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({

    logger: pino({ level: 'silent' }),

    auth: state,

    printQRInTerminal: false

  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {

    if (qr) qrcode.generate(qr, { small: true })

    if (connection === 'close') {

      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut)

      if (shouldReconnect) setTimeout(() => startBot(), 3000)

    }

    if (connection === 'open') console.log('✅ Bot is online!')

  })

  // Anti-delete (test)

  sock.ev.on('messages.delete', async (m) => {

    const key = m.keys && m.keys[0]

    if (key) {

      const chat = key.remoteJid

      const participant = key.participant || chat

      await sock.sendMessage(chat, {

        text: `🛑 *Deleted message alert:*\n👤 @${participant.split('@')[0]}`,

        mentions: [participant]

      })

    }

  })

  sock.ev.on('messages.upsert', async ({ messages }) => {

    const msg = messages[0]

    if (!msg.message) return

    const jid = msg.key.remoteJid

    const isGroup = jid.endsWith('@g.us')

    const sender = msg.key.participant || msg.key.remoteJid

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

    const isAdmin = admin.includes(sender)

 

    if (chatMode === 'group' && !isGroup) return

    if (chatMode === 'private' && isGroup) return

    

    if (!publicMode && !isAdmin) return

    

    if (blockedUsers.includes(sender)) return

   

    const command = text.trim().toLowerCase()

    async function react(emoji) {

      try {

        await sock.sendMessage(jid, {

          react: { text: emoji, key: msg.key }

        })

      } catch (e) {

        console.log('React error:', e.message)

      }

    }

   

    if ((command === 'prefix:on' || command === 'prefix on') && isAdmin) {

      prefixMode = true

      await sock.sendMessage(jid, { text: '✅ Prefix mode is now ON\nUsers must use .ai before messages' })

      return react('✅')

    }

    if ((command === 'prefix:off' || command === 'prefix off') && isAdmin) {

      prefixMode = false

      await sock.sendMessage(jid, { text: '✅ Prefix mode is now OFF\nBot will respond to all messages' })

      return react('✅')

    }
    
    

    if ((command === 'mode:public' || command === 'mode public') && isAdmin) {

      publicMode = true

      await sock.sendMessage(jid, { text: '🌐 Bot is now PUBLIC\nAnyone can use the bot' })

      return react('🌐')

    }

    if ((command === 'mode:private' || command === 'mode private') && isAdmin) {

      publicMode = false

      await sock.sendMessage(jid, { text: '🔒 Bot is now PRIVATE\nOnly admins can use the bot' })

      return react('🔒')

    }

    

    if ((command === 'chat:group' || command === 'chat group') && isAdmin) {

      chatMode = 'group'

      await sock.sendMessage(jid, { text: '👥 Chat mode: GROUP ONLY\nBot will only work in groups' })

      return react('👥')

    }

    if ((command === 'chat:private' || command === 'chat private') && isAdmin) {

      chatMode = 'private'

      await sock.sendMessage(jid, { text: '📱 Chat mode: PRIVATE ONLY\nBot will only work in private chats' })

      return react('📱')

    }

    if ((command === 'chat:both' || command === 'chat both') && isAdmin) {

      chatMode = 'both'

      await sock.sendMessage(jid, { text: '💬 Chat mode: BOTH\nBot will work in groups and private chats' })

      return react('💬')

    }

    

    if (command === 'status' && isAdmin) {

      const statusText = `📊 *Bot Status*\n\n` +

        `🔧 *Prefix Mode:* ${prefixMode ? 'ON' : 'OFF'}\n` +

        `🌐 *Public Mode:* ${publicMode ? 'PUBLIC' : 'PRIVATE'}\n` +

        `💬 *Chat Mode:* ${chatMode.toUpperCase()}\n` +

        `🚫 *Blocked Users:* ${blockedUsers.length}\n` +

        `👑 *Admins:* ${admin.length}`

      

      await sock.sendMessage(jid, { text: statusText })

      return react('📊')

    }

    if (command === 'menu') {

      const menuText =
`《 🤖 BOT MENU 》

🧠 AI  
└➤ .ai <your text>

📸 MEDIA  
└➤ view anime  
└➤ view meme  
└➤ view quote  
└➤ view fact  
└➤ view cat  
└➤ view dog  
└➤ view nature

🔒 ADMIN ONLY  
└➤ prefix: on / off  
└➤ mode: public / private  
└➤ chat: group / private / both  
└➤ block <@user>  
└➤ unblock <@user>  
└➤ status

ℹ️ MISC  
└➤ alive  
└➤ menu`
      await sock.sendMessage(jid, { text: menuText })

      return react('📜')

    }

    if (command === 'alive') {

      const info = ` 🟢 *Bot Alive*\n\n` +

        `• *Host:* hide-portal928\n` +

        `• *Platform:* ${os.platform()}\n` +

        `• *Uptime:* ${(os.uptime()/60).toFixed(2)} mins\n` +

        `• *Owner:* +94766576559\n\n` +

        `• *Prefix Mode:* ${prefixMode ? 'ON' : 'OFF'}\n` +

        `• *Access Mode:* ${publicMode ? 'PUBLIC' : 'PRIVATE'}\n` +

        `• *Chat Mode:* ${chatMode.toUpperCase()}`

      

      const audios = [

        './audio_1.opus',

        './audio_2.opus',

        './audio_3.opus'

      ]

     

      const randomAudio = audios[Math.floor(Math.random() * audios.length)]

      try {

        const waifu = await axios.get('https://api.waifu.pics/sfw/waifu')

        await sock.sendMessage(jid, {

          image: { url: waifu.data.url },

          caption: info

        })

        await sock.sendMessage(jid, {

          audio: { url: randomAudio },

          ptt: true

        })

        return react('💗')

      } catch (e) {

        console.log('Alive command error:', e.message)

        await sock.sendMessage(jid, { text: info })

        try {

          await sock.sendMessage(jid, {

            audio: { url: randomAudio },

            ptt: true

          })

        } catch (audioError) {

          console.log('Audio error:', audioError.message)

        }

        return react('💗')

      }

    }

    if (command.startsWith('block') && isAdmin) {

      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid

      if (!mentioned || mentioned.length === 0) {

        await sock.sendMessage(jid, { text: '❗ Please mention someone to block.\nExample: block @username' })

        return react('❗')

      }

      

      const userToBlock = mentioned[0]

      if (admin.includes(userToBlock)) {

        await sock.sendMessage(jid, { text: '❌ Cannot block an admin!' })

        return react('❌')

      }

      

      if (!blockedUsers.includes(userToBlock)) {

        blockedUsers.push(userToBlock)

        await sock.sendMessage(jid, { 

          text: `🔒 Successfully blocked @${userToBlock.split('@')[0]}`, 

          mentions: mentioned 

        })

        return react('🔒')

      } else {

        await sock.sendMessage(jid, { 

          text: `⚠️ @${userToBlock.split('@')[0]} is already blocked`, 

          mentions: mentioned 

        })

        return react('⚠️')

      }

    }

    if (command.startsWith('unblock') && isAdmin) {

      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid

      if (!mentioned || mentioned.length === 0) {

        await sock.sendMessage(jid, { text: '❗ Please mention someone to unblock.\nExample: unblock @username' })

        return react('❗')

      }

      

      const userToUnblock = mentioned[0]

      if (blockedUsers.includes(userToUnblock)) {

        blockedUsers = blockedUsers.filter(id => id !== userToUnblock)

        await sock.sendMessage(jid, { 

          text: `🔓 Successfully unblocked @${userToUnblock.split('@')[0]}`, 

          mentions: mentioned 

        })

        return react('🔓')

      } else {

        await sock.sendMessage(jid, { 

          text: `⚠️ @${userToUnblock.split('@')[0]} is not blocked`, 

          mentions: mentioned 

        })

        return react('⚠️')

      }

    }

    

    if (command.startsWith('view ')) {

      const mediaType = command.split(' ')[1]

      

      try {

        await react('🔄') // Loading reaction

        

        switch (mediaType) {

          case 'anime':

            const animeApis = [

              'https://api.waifu.pics/sfw/waifu',

              'https://api.waifu.pics/sfw/neko',

              'https://api.waifu.pics/sfw/shinobu',

              'https://api.waifu.pics/sfw/megumin'

            ]

            const randomAnimeApi = animeApis[Math.floor(Math.random() * animeApis.length)]

            const animeRes = await axios.get(randomAnimeApi)

            

            await sock.sendMessage(jid, {

              image: { url: animeRes.data.url },

              caption: '🎌 *Random Anime Image*\n\n> Chanuka-KL'

            })

            return react('🎌')

          case 'meme':

            const memeRes = await axios.get('https://meme-api.herokuapp.com/gimme')

            

            await sock.sendMessage(jid, {

              image: { url: memeRes.data.url },

              caption: `😂 *${memeRes.data.title}*\n\n📱 From: r/${memeRes.data.subreddit}\n\n> Chanuka-KL`

            })

            return react('😂')

          case 'quote':

            const quoteRes = await axios.get('https://api.quotable.io/random')

            

            await sock.sendMessage(jid, {

              text: `💭 *Random Quote*\n\n"${quoteRes.data.content}"\n\n- ${quoteRes.data.author}\n\n> Chanuka-KL`

            })

            return react('💭')

          case 'fact':

            const factRes = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en')

            

            await sock.sendMessage(jid, {

              text: `🧠 *Random Fact*\n\n${factRes.data.text}\n\n> Chanuka-KL`

            })

            return react('🧠')

          case 'cat':

            const catRes = await axios.get('https://api.thecatapi.com/v1/images/search')

            

            await sock.sendMessage(jid, {

              image: { url: catRes.data[0].url },

              caption: '🐱 *Random Cat*\n\n> Chanuka-KL'

            })

            return react('🐱')

          case 'dog':

            const dogRes = await axios.get('https://dog.ceo/api/breeds/image/random')

            

            await sock.sendMessage(jid, {

              image: { url: dogRes.data.message },

              caption: '🐶 *Random Dog*\n\n> Chanuka-KL'

            })

            return react('🐶')

          case 'nature':

            const natureRes = await axios.get('https://api.unsplash.com/photos/random?query=nature&client_id=your_unsplash_key')

            

            const natureUrl = 'https://picsum.photos/800/600?random=' + Math.floor(Math.random() * 1000)

            

            await sock.sendMessage(jid, {

              image: { url: natureUrl },

              caption: '🌿 *Random Nature Image*\n\n> Chanuka-KL'

            })

            return react('🌿')

          default:

            await sock.sendMessage(jid, {

              text: '❗ *Available media types:*\n\n• view anime\n• view meme\n• view quote\n• view fact\n• view cat\n• view dog\n• view nature'

            })

            return react('❗')

        }

        

      } catch (e) {

        console.log('Media view error:', e.message)

        await sock.sendMessage(jid, { text: `❌ Error loading ${mediaType}: Service temporarily unavailable` })

        return react('❌')

      }

    }

   

    let prompt = null

    let shouldProcessAI = false

    if (prefixMode) {

      

      if (text.startsWith(prefix + ' ') || text === prefix) {

        prompt = text.slice(prefix.length).trim()

        shouldProcessAI = true

      }

    } else {

      

      if (text && !text.startsWith('prefix') && !text.startsWith('mode') && 

          !text.startsWith('chat') && !text.startsWith('block') && 

          !text.startsWith('unblock') && !text.startsWith('status') &&

          !text.startsWith('menu') && !text.startsWith('alive') && 

          !text.startsWith('view ')) {

        prompt = text.trim()

        shouldProcessAI = true

      }

    }

    if (shouldProcessAI && prompt) {

      try {

        await react('🔄')

        

        const res = await axios.get(`https://ab-tech-ai.abrahamdw882.workers.dev/?q=${encodeURIComponent(prompt)}`, {

          timeout: 30000 

        })

        

        if (res.data.success && res.data.response) {

          const replyText = `${res.data.response}\n\n> Chanuka-KL`

          await sock.sendMessage(jid, {

            text: replyText,

            mentions: [sender]

          }, { quoted: msg })

          

          return react('✅')

        } else {

          await sock.sendMessage(jid, { text: '❌ AI service returned no response' })

          return react('❌')

        }

      } catch (e) {

        console.log('AI Error:', e.message)

        await sock.sendMessage(jid, { text: '❌ AI Error: Service temporarily unavailable' })

        return react('❌')

      }

    }

  })

}



startBot().catch(console.error)