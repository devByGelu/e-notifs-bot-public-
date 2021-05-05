// const Discord = require('discord.js');
import Discord, {
  CategoryChannel,
  Guild,
  GuildAuditLogsEntry,
} from "discord.js";
import admin from "firebase-admin";
import { announceToChannel, updateHowToChannel } from "./helpers";
import _, { includes } from "lodash";
require("dotenv").config();
const serviceAccount = require("../e-notifs-firebase-adminsdk-9h46d-f5e1c444d9.json");
export type IEvent = {
  link: string;
  eventId: string;
  pic: string;
  deadline: Date;
  courseTitle: string;
};
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const eventsRef = db.collection("events");

const client = new Discord.Client({
  partials: ["MESSAGE", "REACTION", "CHANNEL"],
});

client.login(process.env.BOT_TOKEN);
// Adding reaction-role function

//@ts-ignore
client.on("ready", async (msg) => {
  // @ts-ignore
  eventsRef.onSnapshot(async function (
    querySnapshot: FirebaseFirestore.QuerySnapshot<IEvent>
  ) {
    const changes = querySnapshot.docChanges();
    for (const change of changes) {
      if (change.type === "added") {
        await announceToChannel(change.doc.data(), client, change.type);
      }
      if (change.type === "modified") {
        // If modified, announce that there is a change
        console.log("Modified city: ", change.doc.data());
      }
      if (change.type === "removed") {
        console.log("Removed event: ", change.doc.data());
        // If after removing no events left for that channel,

        // Remove channel

        // And unsubscribe all users from the course
      }
    }
    await updateHowToChannel(client);
  });
});

client.on("message", async (msg) => {
  if (!msg.author.bot)
    if (msg.channel.id === process.env.HOWTO_CHANNEL_ID) {
      try {
        if (msg.content.includes("!sub")) {
          if (msg.partial) await msg.fetch();
          const targetChannelId = msg.content.split(" ")[1];
          let channel = (await client.channels.fetch(
            targetChannelId
          )) as Discord.TextChannel;

          let perms = channel.permissionsFor(msg.author);

          let canViewChannel = perms?.has("VIEW_CHANNEL");

          await channel.updateOverwrite(msg.author.id, {
            VIEW_CHANNEL: !canViewChannel,
          });

          if (!canViewChannel === true) msg.reply(`${channel.topic} 🟢`);
          else {
            msg.reply(`${channel.topic} 🔴`);
          }
        } else if (msg.content.includes("?sub")) {
        }
      } catch (error) {
        msg.reply("I couldn't understand your command.");
      }
      // (msg.channel as Discord.TextChannel).updateOverwrite(msg.author.id, {
      //   VIEW_CHANNEL: true,
      // });
      // msg.channel.send("hello");
    }
});
