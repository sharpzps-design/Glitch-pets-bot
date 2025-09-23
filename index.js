// index.js  — Long-polling Telegraf on Render
import express from "express";
import { Telegraf } from "telegraf";
import sql from "./db.js"; // your Supabase Postgres client

const app = express();
const { BOT_TOKEN, PORT = 10000 } = process.env;

if (!BOT_TOKEN) throw new Error("BOT_TOKEN missing");

// ---- Bot setup
const bot = new Telegraf(BOT_TOKEN);

// Basic command(s)
bot.start(async (ctx) => {
  await ctx.reply("Welcome to Glitch Pets! 🥚 You received a starter Firebyte Egg.");
});

// Health check for Render
app.get("/", (_req, res) => res.send("OK"));

// IMPORTANT: ensure no webhook is set, then start polling
(async () => {
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    await bot.launch({ dropPendingUpdates: true });
    console.log("✅ Bot polling started");
  } catch (e) {
    console.error("❌ Bot launch error:", e);
  }
})();

// Keep a tiny web server alive for Render health checks
app.listen(PORT, () => console.log("Web server on :" + PORT));

// Graceful shutdown (Render restarts)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
