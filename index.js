import TelegramBot from "node-telegram-bot-api";
import express from "express";
import db from "./src/db.js";         // keep db import from /src/db.js
import { rollPetFromEgg } from "./hatch.js";  // FIXED hatch.js path

const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN missing");

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => res.send("Glitch Pets Bot is running!"));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// /start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🐾 Welcome to Glitch Pets! Type /hatch to hatch your first pet.");
});

// /ping command
bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, "pong 🏓");
});

// /hatch command
bot.onText(/\/hatch/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // 1. create a fake egg record
    const egg = {
      id: Date.now(),
      user_id: userId,
      hatch_at: new Date().toISOString(),
    };

    // 2. roll traits from hatch.js
    const pet = rollPetFromEgg(egg);

    // 3. save to DB
    await db`
      insert into pets (user_id, traits, is_shiny)
      values (${userId}, ${pet.traits}, ${pet.is_shiny})
    `;

    // 4. reply to user
    const traits = Object.entries(pet.traits)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    const shinyMark = pet.is_shiny ? " ✨SHINY✨ " : "";

    bot.sendMessage(
      chatId,
      `🥚 Your egg wiggles... crack! A glitch pet pops out!\n\n${shinyMark}Traits → ${traits}`
    );
  } catch (err) {
    console.error("Hatch error", err);
    bot.sendMessage(chatId, "⚠️ Something went wrong hatching your pet.");
  }
});

// fallback for unknown messages
bot.on("message", (msg) => {
  if (!msg.text.startsWith("/")) {
    bot.sendMessage(msg.chat.id, "I know /ping and /hatch for now. More commands coming!");
  }
});
