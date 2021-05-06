import { IEvent } from "./index";

import moment from "moment";
import { CategoryChannel } from "discord.js";
import _, { countBy } from "lodash";
import Discord from "discord.js";
import admin from "firebase-admin";
import { EventEmitter } from "node:stream";
import "discord-reply";

export const getAllChannelsUnderCategoryChannel = async (
  client: Discord.Client
): Promise<Discord.GuildChannel[]> => {
  // @ts-ignore
  const cc: CategoryChannel = await client.channels.fetch(
    // @ts-ignore
    process.env.CHANNEL_CATEGORY_ID
  );

  return cc.children.array();
};
export const updateHowToChannel = async (client: Discord.Client) => {
  // Also update course id list in HOWTOCHANNEL
  const howToChannel = (await client.channels.fetch(
    // @ts-ignore
    process.env.HOWTO_CHANNEL_ID
  )) as Discord.TextChannel;

  const headerMsgRef = await howToChannel.messages.fetch(
    //@ts-ignore
    process.env.COURSE_ID_LIST_HEADER_ID
  );

  const courseListMsgRef = await howToChannel.messages.fetch(
    //@ts-ignore
    process.env.COURSE_ID_LIST_ID
  );

  const courses = await admin.firestore().collection("channels").get();

  let newCourseList = "";
  courses.forEach((snap) => {
    newCourseList = newCourseList.length
      ? `${newCourseList}\n${snap.id} = ${snap.data().channelName}`
      : `${snap.id} = ${snap.data().channelName}`;
  });
  await headerMsgRef.edit(
    `**Available course_id** *(Updated ${new Date().toLocaleString()})*`
  );
  if (newCourseList.length)
    await courseListMsgRef.edit("`" + newCourseList + "`");
};

export const createChannel = async (
  client: Discord.Client,
  channelName: string
): Promise<Discord.TextChannel> => {
  // @ts-ignore
  // const everyoneRole = await // @ts-ignore
  // (await client.guilds.fetch(process.env.SERVER_ID)).roles.fetch(
  //   process.env.EVERYONE_ROLE_ID
  // );

  /* const name = message.author.username;
message.guild.createChannel(name, 'text')
    .then(r => {
        r.overwritePermissions(client.id, { VIEW_CHANNEL: true });
        r.overwritePermissions(everyoneRole, { VIEW_CHANNEL: false });
    })
    .catch(console.error); */

  // @ts-ignore
  const guild = await client.guilds.fetch(process.env.SERVER_ID);
  if (!process.env.EVERYONE_ROLE_ID || !process.env.CHANNEL_CATEGORY_ID)
    throw new Error("");
  let newChannel = await guild.channels.create(channelName, {
    parent: process.env.CHANNEL_CATEGORY_ID,
    permissionOverwrites: [
      { id: process.env.EVERYONE_ROLE_ID, deny: ["VIEW_CHANNEL"] },
      { id: process.env.EVERYONE_ROLE_ID, deny: ["MANAGE_MESSAGES"] },
      { id: process.env.EVERYONE_ROLE_ID, deny: ["KICK_MEMBERS"] },
      { id: process.env.EVERYONE_ROLE_ID, deny: ["MANAGE_CHANNELS"] },
      { id: process.env.EVERYONE_ROLE_ID, deny: ["SEND_MESSAGES"] },
    ],
  });

  // After creating channel, save its id in channels collection
  await admin
    .firestore()
    .collection("channels")
    .doc(newChannel.id)
    .set({ channelName });

  await newChannel.setTopic(channelName);

  await updateHowToChannel(client);

  return newChannel;
};

const getEmbeddedMsg = (event: IEvent): Discord.MessageEmbed => {
  const deadline = (event.deadline as admin.firestore.Timestamp).toDate();
  return new Discord.MessageEmbed()
    .setColor("#0099ff")
    .setTitle(event.eventTitle)
    .setURL(event.link)
    .addFields(
      { name: "Deadline", value: deadline.toLocaleString() },
      { name: "Time Left", value: moment(deadline).fromNow(), inline: true }
    )
    .setFooter(`Last updated: ${new Date().toLocaleString()}`)
    .attachFiles([event.pic])
    .setImage(`attachment://${event.eventId}.png`);
};

export const announceToChannel = async (
  event: IEvent,
  client: Discord.Client,
  change: "added" | "modified" | "removed"
) => {
  let existing = await getAllChannelsUnderCategoryChannel(client);

  const existingChannel = existing.find((c) => {
    return (c as Discord.TextChannel).topic === event.courseTitle;
  });

  let channelToAnnounce = existingChannel;

  // If no channel exists, create a channel under category channel
  if (!channelToAnnounce) {
    channelToAnnounce = await createChannel(client, event.courseTitle);
    // await channelToAnnounce.setTopic(event.courseTitle);
  }

  const channel = channelToAnnounce as Discord.TextChannel;
  // Then announce

  // If server restarted, prevent from bot from reannouncements
  const db = admin.firestore();
  const data = (
    await db.collection("messages").doc(event.eventId).get()
  ).data();

  switch (change) {
    case "added":
      //
      if (!data) {
        // Announce
        const msg = await channel.send(getEmbeddedMsg(event));

        // After announcement, save messageId for future actions
        await db
          .collection("messages")
          .doc(event.eventId)
          .set({ messageId: msg.id });
      } else {
        console.log(
          `${event.eventId} not announced because it was already created. Updating instead...`
        );
        await (await channel.messages.fetch(data.messageId)).edit(
          getEmbeddedMsg(event)
        );
      }
      break;

    case "modified":
      if (data) {
        console.log("Modifying...");
        const msg = await (await channel.messages.fetch(data.messageId)).edit(
          getEmbeddedMsg(event)
        );
        console.log(msg.id, " was modified");
        // @ts-ignore
        // await msg.lineReply("**⚠️ The teacher just updated this event**");
        break;
      } else {
        console.log("Error: no message found to modify.");
      }

    default:
      break;
  }

  //   if()
};
