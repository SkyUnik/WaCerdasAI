//! Code for Discord

const AI  = require("./gpt")

var robot = new AI([])
robot.StartAI({ role: "system", content: "Stay in character. Namamu Udin!" })

const Discord = require("discord.js");
const client = new Discord.Client({
    intents: [
      Discord.GatewayIntentBits.Guilds,
      Discord.GatewayIntentBits.GuildMessages,
      Discord.GatewayIntentBits.MessageContent
    ]
  })

  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`)
  })
  
  
  client.on('messageCreate', async (message) => { //TODO Ngirim Request Bot ketika ada pesan dikirim //Send request when there is a message sent
  
    if (message.author.bot) return;
    if(message.content.startsWith("?")){
        const loadingMessage = await message.reply("Mohon tunggu sebentar..."); // Menyimpan pesan loading sebagai objek Message //save loading message as object message
        robot.MessageDiscordAI({ role: "user", content: message.content.replace("? ", "")}, loadingMessage)
    }
  });
  
  client.login(process.env.dcapi)
  