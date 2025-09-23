// index.js (ESM)
// ---------------------------
import express from "express";
import { Telegraf } from "telegraf";
import db from "./src/db.js"; // uses DATABASE_URL inside

// ---- Env checks ----
const { BOT_TOKEN, APP_URL, PORT } = process.env;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN missing");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

const app = express();
app.use(express.json());

// Basic health route for Render checks
app.get("/", (req, res) => res.send("OK"));
app.get("/healthz", async (req, res) => {
  try {
    await db.query("select NOW()");
    res.json({ ok: true, db: "up" });
  } catch (e) {
    console.error("DB health check failed:", e?.message || e);
    res.status(500).json({ ok: false, db: "down" });
  }
});

// ---- Telegram bot ----
const bot = new Telegraf(BOT_TOKEN);

// Log every update to Render logs (very helpful while debugging)
bot.use(Telegraf.log());

// /start
bot.start(async (ctx) => {
  await ctx.reply("🐾 Welcome to Glitch Pets!");
  await ctx.reply("Try: /ping or /hatch");
});

// /ping
bot.command("ping", (ctx) => ctx.reply("pong 🏓"));

// /hatch (demo)
bot.command("hatch", async (ctx) => {
  try {
    // Example: ensure user exists in DB (safe no-op if table empty)
    await db.query("select 1"); // keep simple for now
    await ctx.reply("🥚 Your egg wiggles… crack! A glitch pet pops out! ✨");
  } catch (e) {
    console.error("hatch error:", e?.message || e);
    await ctx.reply("⚠️ I had trouble talking to the database. Try again soon.");
  }
});

// Respond to any plain text
bot.on("text", (ctx) =>
  ctx.reply("I know /ping and /hatch for now. More commands coming!")
);

// Non-text messages
bot.on("message", (ctx) => {
  if (!ctx.message.text) {
    return ctx.reply("I only understand text right now. Try /ping or /hatch.");
  }
});

// ---- Start server & bot (webhook if APP_URL, else polling) ----
const port = Number(PORT) || 10000;
const WEBHOOK_PATH = "/telegram";

app.listen(port, async () => {
  console.log(`Web server running on port ${port}`);

  try {
    if (APP_URL) {
      const fullWebhook = `${APP_URL}${WEBHOOK_PATH}`;
      // Remove old webhook then set our current one
      await bot.telegram.deleteWebhook().catch(() => {});
      await bot.telegram.setWebhook(fullWebhook);
      app.use(bot.webhookCallback(WEBHOOK_PATH));
      console.log(`Bot webhook set to: ${fullWebhook}`);
    } else {
      await bot.launch();
      console.log("Bot launched in long-polling mode (no APP_URL set).");
    }

    // Quick DB check at boot
    const r = await db.query("select NOW() as now");
    console.log("DB OK:", r?.rows?.[0]?.now);
  } catch (e) {
    console.error("Startup error:", e?.message || e);
  }
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
