// index.js  — Telegraf (long-polling) + pg (Postgres) on Render
import express from "express";
import { Telegraf } from "telegraf";
import pkg from "pg";

const app = express();
const { BOT_TOKEN, DATABASE_URL, PORT = 10000 } = process.env;

if (!BOT_TOKEN) throw new Error("BOT_TOKEN missing");
if (!DATABASE_URL) throw new Error("DATABASE_URL missing");

// ----- Postgres (pg) -----
const { Pool } = pkg;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase requires SSL
});

// quick connectivity check on boot (prints to logs)
(async () => {
  try {
    const r = await pool.query("select now()");
    console.log("DB connected at:", r.rows[0].now);
  } catch (e) {
    console.error("DB connection error:", e.message);
  }
})();

// ----- Bot -----
const bot = new Telegraf(BOT_TOKEN);

// basic commands
bot.start(async (ctx) => {
  await ctx.reply("Welcome to Glitch Pets! 🥚 You received a starter Firebyte Egg.");
});

bot.command("egg", async (ctx) => {
  await ctx.reply("🥚 Your egg is warming… keep chatting to hatch it!");
});

bot.command("help", async (ctx) => {
  await ctx.reply("Commands:\n/start – get your starter egg\n/egg – check on your egg\n/help – this menu");
});

// ----- Health route for Render -----
app.get("/", (_req, res) => res.send("OK"));

// ----- Start long-polling -----
(async () => {
  try {
    // ensure no old webhook is set, then start polling
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    await bot.launch({ dropPendingUpdates: true });
    console.log("✅ Bot polling started");
  } catch (e) {
    console.error("❌ Bot launch error:", e);
  }
})();

// ----- Start tiny web server (for Render health checks) -----
app.listen(PORT, () => console.log("Web server on :" + PORT));

// graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
