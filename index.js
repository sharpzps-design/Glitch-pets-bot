import TelegramBot from "node-telegram-bot-api";
import express from "express";
import db from "./db.js";
import { rollPetFromEgg } from "./hatch.js";

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// simple express server to keep Render alive
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 10000, () => {
  console.log("Web server running");
});

// start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    "Welcome to Glitch Pets! 🐣\nUse /ping to test me or /hatch to hatch an egg!"
  );

  // give user an egg if they don’t have one
  await db.query(
    `INSERT INTO eggs (user_id, hatch_at, seed)
     VALUES ($1, NOW() + interval '10 minutes', floor(random()*1000000)::text)
     ON CONFLICT (user_id) DO NOTHING`,
    [msg.from.id]
  );
});

// ping command
bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, "pong 🏓");
});

// hatch command
bot.onText(/\/hatch/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const result = await db.query(
      `SELECT * FROM eggs WHERE user_id = $1 LIMIT 1`,
      [msg.from.id]
    );
    const egg = result.rows[0];

    if (!egg) {
      return bot.sendMessage(chatId, "❌ You don’t have any eggs to hatch!");
    }

    // roll a pet
    const pet = rollPetFromEgg(egg);

    // save pet + delete egg
    await db.query(
      `INSERT INTO pets (user_id, traits, is_shiny, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [msg.from.id, pet.traits, pet.is_shiny]
    );

    await db.query(`DELETE FROM eggs WHERE id = $1`, [egg.id]);

    await bot.sendMessage(
      chatId,
      `🥚 Your egg wiggles… crack! A glitch pet pops out! ✨\n\nTraits → color: ${pet.traits.color}; aura: ${pet.traits.aura}; eyes: ${pet.traits.eyes}; pattern: ${pet.traits.pattern}`
    );
  } catch (err) {
    console.error("Hatch error", err);
    bot.sendMessage(chatId, "⚠️ Something went wrong hatching your pet.");
  }
});
