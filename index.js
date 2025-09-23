// index.js
import express from "express";
import { Telegraf } from "telegraf";
import db from "./src/db.js";

// Load environment variables
const { BOT_TOKEN, DATABASE_URL } = process.env;

if (!BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN missing in environment variables");
}
if (!DATABASE_URL) {
  throw new Error("❌ DATABASE_URL missing in environment variables");
}

const app = express();
const bot = new Telegraf(BOT_TOKEN);

// --- Telegram bot handler ---
bot.start((ctx) => ctx.reply("🐾 Welcome to Glitch Pets!"));
bot.help((ctx) => ctx.reply("Type /start to begin your adventure!"));

bot.command("ping", (ctx) => ctx.reply("🏓 Pong!"));

// --- Database connection check ---
(async () => {
  try {
    const result = await db.query("SELECT NOW()");
    console.log("✅ DB OK:", result.rows[0].now);
  } catch (err) {
    console.error("❌ DB connection error:", err.message);
  }
})();

// --- Webhook / keepalive ---
app.get("/", (req, res) => {
  res.send("✅ Glitch Pets bot is running");
});

// --- Start server & bot ---
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Web server running on port ${PORT}`);
});

bot.launch().then(() => {
  console.log("🤖 Bot started successfully");
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
