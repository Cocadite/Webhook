require("dotenv").config();
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const BOT_API_KEY = process.env.BOT_API_KEY;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once("ready", () => {
  console.log("🤖 Webhook Bot online:", client.user.tag);
});

function botAuth(req, res, next) {
  const auth = String(req.headers.authorization || "");
  if (auth !== `Bearer ${BOT_API_KEY}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.post("/webhook/approved", botAuth, async (req, res) => {
  const { userId, nick, discordTag } = req.body || {};
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(userId);
    await member.roles.add(ROLE_ID);

    if (LOG_CHANNEL_ID) {
      const ch = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (ch) ch.send(`✅ **Cargo aplicado**\nUser: ${discordTag || userId}\nNick: ${nick || "-"}`);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to give role" });
  }
});

client.login(DISCORD_TOKEN);
app.listen(3000, "0.0.0.0", () => console.log("🚀 Webhook server ativo na porta 3000"));
