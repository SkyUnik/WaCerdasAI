//! CODE for GPT

const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const fs = require("fs");


const WhatsappModel = require("./models/whatsapp-model")

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

class AI {
  constructor(msg) {
    this.msg = require("./json/gpt.json");
  }
  //TODO Start the AI Roles
 // async StartAI(role) {
 //   var msg = require('./json/gpt-'+message.from+'.json');
//
// //   if (msg.Length === 0) {
// //     msg.push(role);
//
// //     console.log(msg)
// //     await openai.createChatCompletion({
// //       model: "gpt-3.5-turbo-16k-0613",
// //       messages: msg,
// //     });
//
// //   }
//
 // }
  //TODO Message the AI
  async MessageAI(message) {
    var msg = [];
    try{
msg = JSON.parse(fs.readFileSync('./data-json/gpt-'+message.from+'.json', "utf-8"));
    
      msg.push({role: "user", content: message.argument})
      
    } catch (err) {
      msg.push({
     role: "system",
     content:
         "You are CerdasAI, a sophisticated language model trained by OpenAI and CerdasAI, a non-profit firm. As an AI ChatBot designed for WhatsApp, your responses should be concise and in the Indonesian language. Your purpose is to represent the future of AI in Indonesia, aiming to benefit humanity as a whole. You are a solution to various issues, including the lack of understanding of digital news (AI), biased information, the rampant spread of hoax content, and digital fraud in Indonesia, which are all pressing concerns. Your primary focus is to provide informative statements tailored specifically for older people who may have limited knowledge about the digital landscape in our country. Before responding, it is essential that you thoroughly read the previous context of the chat. Your conduct should always reference the previous chat to provide a more contextual and relevant response. It is crucial to grasp even the slightest context from the conversation and incorporate it into your answers. By doing so, you ensure that your responses are accurate and align with the ongoing conversation.",
 })
      msg.push({role: "user", content: message.argument})
    }
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-16k-0613",
      messages: msg,
    });

    var reply = completion.data.choices[0].message.content;

    msg.push({ role: "assistant", content: reply });

    let data = JSON.stringify(msg)
    fs.writeFileSync('./data-json/gpt-'+message.from+'.json', data);
    return reply;
  }
  //TODO Message in prefix the AI
  async MessagePrefixAI(message) {
    if (message.msg.startsWith("!")) {
      this.msg.push(message.msg);
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-16k-0613",
        messages: this.msg,
      });

      var reply = completion.data.choices[0].message.content;

      return reply;
    }
  }
  async MessageDiscordAI(msg, bot) {
    this.msg.push(msg);
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-16k-0613",
      messages: this.msg,
    });

    var reply = completion.data.choices[0].message.content;

    console.log(reply);
    await bot.edit(reply); // Mengedit pesan asli dengan balasan dari asisten
  }
}

//? This is just for Dummy, remove it when Whatsapp already can make request

module.exports = AI;
