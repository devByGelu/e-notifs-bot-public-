// const Discord = require('discord.js');
import Discord, {
  CategoryChannel,
  Guild,
  GuildAuditLogsEntry,
} from "discord.js";
import admin from "firebase-admin";
import { announceToChannel } from "./helpers";
import _ from "lodash";
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
client.on("messageReactionAdd", async (reaction, user) => {
  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();
  if (user.bot) return;
  if (!reaction.message.guild) return;

  if (reaction.message.channel.id == "802209416685944862") {
    if (reaction.emoji.name === "🦊") {
      // await reaction.message.guild.members.cache
      //   .get(user.id)
      //   .roles.add("802208163776167977");
    }
    if (reaction.emoji.name === "🐯") {
      // await reaction.message.guild.members.cache
      //   .get(user.id)
      //   .roles.add("802208242696192040");
    }
    if (reaction.emoji.name === "🐍") {
      // await reaction.message.guild.members.cache
      //   .get(user.id)
      //   .roles.add("802208314766524526");
    }
  } else return;
});

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

        // And remove emoji

        // And unsubscribe all users from the course
      }
    }
  });
});

client.on("message", async (msg) => {});
// Listen to changes in Events collection
/* If */

// Listen to Reactions from the message in how-to-get-notifs text channel
