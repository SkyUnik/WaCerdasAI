// spellchecker: disable

const {
  makeWASocket,
  BufferJSON,
  downloadMediaMessage,
  useMultiFileAuthState,
  DisconnectReason,
  proto,
  MessageType,
  MessageOptions,
  Mimetype,
} = require("@whiskeysockets/baileys");
const path = require("path");
const fs = require("fs");
const { writeFile } = require("fs/promises");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
// const { fileType } = require("file-type");

const prefix = "."; // Prefix to be used, can be '!' or '.' etc

const AI = require("./gpt");
var robot = new AI([]);
// robot.StartAI({
//     role: "system",
//     content:
//         "You are CerdasAI, a sophisticated language model trained by OpenAI and CerdasAI, a non-profit firm. As an AI ChatBot designed for WhatsApp, your responses should be concise and in the Indonesian language. Your purpose is to represent the future of AI in Indonesia, aiming to benefit humanity as a whole. You are a solution to various issues, including the lack of understanding of digital news (AI), biased information, the rampant spread of hoax content, and digital fraud in Indonesia, which are all pressing concerns. Your primary focus is to provide informative statements tailored specifically for older people who may have limited knowledge about the digital landscape in our country. Before responding, it is essential that you thoroughly read the previous context of the chat. Your conduct should always reference the previous chat to provide a more contextual and relevant response. It is crucial to grasp even the slightest context from the conversation and incorporate it into your answers. By doing so, you ensure that your responses are accurate and align with the ongoing conversation.",
// });

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_CerdasAI");
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    generateHighQualityLinkPreview: true,
    logger: pino({ level: "silent" }),
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error instanceof Boom
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : false;
      console.log(
        "Koneksi Mati Gegara: ",
        lastDisconnect.error,
        "\nRekoneksi Ga Nih: ",
        shouldReconnect
      );
      // reconnect if not logged out
      if (shouldReconnect) {
        console.log("[CONSOLE]: Memulai Koneksi Ulang");
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("[CONSOLE]: Established Connection");
    }
  });

  // Main function of listening to WhatsApp Messages
  sock.ev.on("messages.upsert", async (m_raw) => {
    let m = m_raw.messages[0];

    if (
      // m.key.fromMe ||
      Object.keys(m).length === 0 ||
      m.broadcast
    ) {
      return;
    }

    let WhatsAppMessage = {
      id: null,
      sender: null,
      name: null,
      from: null,
      isGroup: false,
      command: null,
      broadcast: null,
      argument: null,
      type: {
        msg: null,
        quotedMsg: null,
      },
      msg: null,
      containMedia: {
        msg: false,
        quotedMsg: false,
      },
      quotedMsg: null,
    };
    const botnumber = sock.user.id.replace(/:(\d+)@s.whatsapp.net$/, "@s.whatsapp.net");

    const MSGgroup = extractfromGroup(m.key?.remoteJid);
    WhatsAppMessage.id = m.key.id;
    WhatsAppMessage.name = m.pushName;
    WhatsAppMessage.sender = MSGgroup ? m.key?.participant : m.key?.remoteJid;
    WhatsAppMessage.from = m.key?.remoteJid;
    WhatsAppMessage.isGroup = MSGgroup ? true : false;
    WhatsAppMessage.type = {
      msg: Object?.keys(m.message ? m.message : null).find(
        (key) => m?.message[key]?.contextInfo || m?.message[key]?.caption
      ),
    };

    WhatsAppMessage.msg =
      m.message?.conversation ||
      m.message[WhatsAppMessage.type.msg]?.text ||
      m.message[WhatsAppMessage.type.msg]?.caption ||
      m.message[WhatsAppMessage.type.msg]?.selectedDisplayText ||
      m.message[WhatsAppMessage.type.msg]?.description ||
      m.message[WhatsAppMessage.type.msg]?.contentText ||
      m.message[WhatsAppMessage.type.msg]?.title;

    // if (WhatsAppMessage.msg === undefined || WhatsAppMessage.msg === null) {
    //     WhatsAppMessage.msg = "";
    // }
    WhatsAppMessage.command = WhatsAppMessage.msg?.startsWith(prefix)
      ? WhatsAppMessage.msg
        ?.replace(/^\s+|\s+$/g, "")
        .split(/\s+/)[0]
        .toLowerCase()
      : null;
    WhatsAppMessage.broadcast = m.broadcast;
    WhatsAppMessage.quotedMsg = m.message[WhatsAppMessage.type.msg]?.contextInfo?.quotedMessage
      ? m.message[WhatsAppMessage.type.msg]?.contextInfo?.quotedMessage
      : undefined;

    if (WhatsAppMessage.quotedMsg !== undefined) {
      WhatsAppMessage.type.quotedMsg = Object.keys(WhatsAppMessage.quotedMsg)[0];
      WhatsAppMessage.quotedMsg = new proto.Message(
        m.message[WhatsAppMessage.type.msg]?.contextInfo.quotedMessage
      );
    }

    const containsImageMessage = ["imageMessage"].includes(WhatsAppMessage.type.msg);
    const containsQuotedImageMessage =
      WhatsAppMessage.quotedMsg !== undefined &&
      ["imageMessage"].includes(WhatsAppMessage.type.quotedMsg);

    WhatsAppMessage.containMedia = {
      quotedMsg: containsQuotedImageMessage
        ? {
          key: {
            remoteJid: WhatsAppMessage.sender,
            id: m.message[WhatsAppMessage.type.msg]?.contextInfo?.stanzaId,
            participant:
              m.message[WhatsAppMessage.type.msg]?.contextInfo?.participant,
            fromMe:
              botnumber ===
              m.message[WhatsAppMessage.type.msg]?.contextInfo?.participant,
          },
          message: new proto.Message(
            m.message[WhatsAppMessage.type.msg]?.contextInfo.quotedMessage
          ),
        }
        : false,
      msg: containsImageMessage ? m.message[WhatsAppMessage.type.msg] : false,
    };

    // let words =
    //     WhatsAppMessage.command?.startsWith(prefix) &&
    //     WhatsAppMessage.msg?.split(/\s+/).length >= 2
    //         ? WhatsAppMessage.msg?.replace(/^\s+|\s+$/g, "").split(/\s+/)
    //         : null;
    // words = words?.slice(1);
    WhatsAppMessage.argument = WhatsAppMessage.msg?.replace(/^\.+/, "");

    console.log("[MESSAGE]:", WhatsAppMessage);

    Object.keys(WhatsAppMessage.type).forEach((key) =>
      WhatsAppMessage.type[key] === undefined || WhatsAppMessage.type[key] === null
        ? (console.log(`${key} is undefined or null.`), console.log("[RAW_MESSAGE]:", m))
        : null
    );
    if (m.messageStubParameters?.[0] == "Message absent from node") {
      console.log("[NEW_MESSAGE]:", m);
      return;
    }
    if (WhatsAppMessage.command == prefix + "img") {
      await sock.sendPresenceUpdate("composing", WhatsAppMessage.from);

      if (
        ["stickerMessage"].includes(WhatsAppMessage.type.msg) ||
        ["stickerMessage"].includes(WhatsAppMessage.type.quotedMsg)
      ) {
        await sock.sendMessage(
          WhatsAppMessage.from,
          { text: "Im sorry but you cannot ask to download or save a sticker!" },
          { quoted: m }
        );
      }
      if (
        WhatsAppMessage.containMedia?.msg === false &&
        WhatsAppMessage.containMedia?.quotedMsg === false
      ) {
        console.log(WhatsAppMessage.containMedia?.msg === false);
        console.log(WhatsAppMessage.containMedia?.quotedMsg === false);
        await sock.sendMessage(
          WhatsAppMessage.from,
          {
            text: "❓To proceed with your request, please add an image file.",
          },
          { quoted: m }
        );
      } else {
        try {
          const downloadMSG = containsQuotedImageMessage
            ? WhatsAppMessage.containMedia?.quotedMsg
            : m;
          const pathget = downloadMSG.message.imageMessage?.mimetype;

          console.log(downloadMSG);
          const extensionClean = pathget.split("/")[1];
          console.log(extensionClean);
          let buffer_img = await downloadMediaMessage(
            downloadMSG,
            "buffer",
            {},
            {
              logger: pino({ level: "silent" }),
              reuploadRequest: sock.updateMediaMessage,
            }
          );
          const fullPath = String(
            `image/downloadedGambar-${WhatsAppMessage.id}.${extensionClean}`
          );
          await writeFile(fullPath, buffer_img);
          console.log(pathget, fullPath);
          await sock.sendMessage(
            WhatsAppMessage.from,
            {
              image: buffer_img,
              // await fs.readFileSync(fullPath),
              // mimetype: pathget,
            }
            // { quoted: m }
          );
        } catch (err) {
          await sock.sendMessage(
            WhatsAppMessage.from,
            { text: "Error saving image to file!" },
            { quoted: m }
          );
          console.error(err);
        }
      }
    } else if (
      WhatsAppMessage.msg?.startsWith(prefix) ||
      (!WhatsAppMessage.isGroup && WhatsAppMessage?.msg)
    ) {
      await sock.sendPresenceUpdate("composing", WhatsAppMessage.from);
      if (!WhatsAppMessage.argument) {
        await sock.sendMessage(
          WhatsAppMessage.from,
          {
            text: "❓To proceed on your request, please add a second argument.",
          },
          { quoted: m }
        );
      } else {
        await sock.sendMessage(WhatsAppMessage.from, {
          text: await robot.MessageAI(WhatsAppMessage),
        });
      }
    }
  });
}

function bufferToFile(buffer, filePath) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(filePath);
      }
    });
  });
}

function extractfromGroup(str) {
  const regex = /(\d+)@g\.us/;
  const match = str.match(regex);
  return match ? match[1] : null;
}

// Call the function once to start the WhatsApp connection
connectToWhatsApp();
