import { IEvent } from "./index";
import { CategoryChannel } from "discord.js";
import _ from "lodash";
import Discord from "discord.js";
import admin from "firebase-admin";

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

export const createChannel = async (
  client: Discord.Client,
  channelName: string
): Promise<Discord.TextChannel> => {
  // @ts-ignore
  const guild = await client.guilds.fetch(process.env.SERVER_ID);
  return guild.channels.create(channelName, {
    parent: process.env.CHANNEL_CATEGORY_ID,
  });
};

export const announceToChannel = async (
  event: IEvent,
  client: Discord.Client,
  change: "added" | "modified" | "removed"
) => {
  const db = admin.firestore();
  let existing = await getAllChannelsUnderCategoryChannel(client);

  const existingChannel = existing.find((c) => {
    return (c as Discord.TextChannel).topic === event.courseTitle;
  });

  let channelToAnnounce = existingChannel;

  // If no channel exists, create a channel under category channel
  if (!channelToAnnounce) {
    channelToAnnounce = await createChannel(client, event.courseTitle);
    await channelToAnnounce.setTopic(event.courseTitle);
  }

  const channel = channelToAnnounce as Discord.TextChannel;
  // Then announce
  switch (change) {
    case "added":
      // If server restarted, prevent from bot from reannouncements
      const db = admin.firestore();
      const data = (
        await db.collection("messages").doc(event.eventId).get()
      ).data();
      //
      if (!data) {
        // Announce
        const msg = await channel.send(event.link);

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
          event.eventId
        );
      }
      break;

    case "modified":
      // const msg = await channel.send("hhhhh");
      break;

    default:
      break;
  }

  //   if()
};
