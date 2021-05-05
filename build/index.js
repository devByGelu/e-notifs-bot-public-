"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// const Discord = require('discord.js');
const discord_js_1 = __importDefault(require("discord.js"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const helpers_1 = require("./helpers");
require("dotenv").config();
require("discord-reply");
const serviceAccount = require("../e-notifs-firebase-adminsdk-9h46d-f5e1c444d9.json");
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(serviceAccount),
});
const db = firebase_admin_1.default.firestore();
const eventsRef = db.collection("events");
const client = new discord_js_1.default.Client({
    partials: ["MESSAGE", "REACTION", "CHANNEL"],
});
client.login(process.env.BOT_TOKEN);
// Adding reaction-role function
//@ts-ignore
client.on("ready", (msg) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    eventsRef.onSnapshot(function (querySnapshot) {
        return __awaiter(this, void 0, void 0, function* () {
            const changes = querySnapshot.docChanges();
            for (const change of changes) {
                if (change.type === "added") {
                    yield helpers_1.announceToChannel(change.doc.data(), client, change.type);
                }
                if (change.type === "modified") {
                    // If modified, announce that there is a change
                    yield helpers_1.announceToChannel(change.doc.data(), client, change.type);
                }
                if (change.type === "removed") {
                    console.log("Removed event: ", change.doc.data());
                    // If after removing no events left for that channel,
                    // Remove channel
                    // And unsubscribe all users from the course
                }
            }
            yield helpers_1.updateHowToChannel(client);
        });
    });
}));
client.on("message", (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (!msg.author.bot)
        if (msg.channel.id === process.env.HOWTO_CHANNEL_ID) {
            try {
                if (msg.content.includes("!sub")) {
                    if (msg.partial)
                        yield msg.fetch();
                    const targetChannelId = msg.content.split(" ")[1];
                    let channel = (yield client.channels.fetch(targetChannelId));
                    let perms = channel.permissionsFor(msg.author);
                    let canViewChannel = perms === null || perms === void 0 ? void 0 : perms.has("VIEW_CHANNEL");
                    yield channel.updateOverwrite(msg.author.id, {
                        VIEW_CHANNEL: !canViewChannel,
                    });
                    if (!canViewChannel === true)
                        msg.reply(`${channel.topic} 🟢`);
                    else {
                        msg.reply(`${channel.topic} 🔴`);
                    }
                }
                else if (msg.content.includes("?sub")) {
                    if (msg.partial)
                        yield msg.fetch();
                    const channels = (yield client.channels.fetch(
                    //@ts-ignore
                    process.env.CHANNEL_CATEGORY_ID)).children.array();
                    let reply = "";
                    for (const channel of channels) {
                        const { id, topic } = channel;
                        if (topic) {
                            let perms = channel.permissionsFor(msg.author);
                            let canViewChannel = perms === null || perms === void 0 ? void 0 : perms.has("VIEW_CHANNEL");
                            reply =
                                reply.length < 1
                                    ? `${canViewChannel ? "🟢" : "🔴"} ${topic} ( ${id} )`
                                    : `${reply}\n${canViewChannel ? "🟢" : "🔴"} ${topic} ( ${id} )`;
                        }
                    }
                    return msg.reply("\n" + reply);
                }
            }
            catch (error) {
                msg.reply("I couldn't understand your command.");
            }
        }
}));
