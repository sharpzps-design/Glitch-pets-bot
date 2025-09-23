import TelegramBot from "node-telegram-bot-api";
import db from "./src/db.js";              // db.js is inside src
import { rollPetFromEgg } from "./hatch.js";  // hatch.js is in root

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log("🤖 Glitch Pets Bot is running...");

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    "Welcome to Glitch Pets! 🐣\n\nCommands:\n/ping - Check bot status\n/hatch - Hatch a glitch egg"
  );
});

// Ping command
bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "🏓 Pong! The bot is alive!");
});

// Hatch command
bot.onText(/\/hatch/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // Insert egg into DB
    const result = await db.query(
      "INSERT INTO eggs (user_id, species, hatch_at) VALUES ($1, $2, NOW()) RETURNING *",
      [userId, "glitchling"]
    );

    const egg = result.rows[0];
    const pet = rollPetFromEgg(egg);

    await bot.sendMessage(
      chatId,
      `🥚 Your egg wiggles... crack! A glitch pet pops out! ✨\n\nTraits → color: ${pet.traits.color}; aura: ${pet.traits.aura}; eyes: ${pet.traits.eyes}; pattern: ${pet.traits.pattern}`
    );

    // Update DB with hatched pet
    await db.query(
      "UPDATE eggs SET status = $1 WHERE id = $2",
      ["HATCHED", egg.id]
    );
  } catch (err) {
    console.error("❌ Hatch error", err);
    await bot.sendMessage(chatId, "⚠️ Something went wrong hatching your pet.");
  }
});

// Keep-alive server (for Render)
import express from "express";
const app = express();
app.get("/", (req, res) => res.send("Glitch Pets Bot is running."));
app.listen(process.env.PORT || 10000, () =>
  console.log("🌐 Web server running")
);
