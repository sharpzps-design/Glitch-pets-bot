import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import db from './src/db.js';   // ✅ points to src/db.js
import { rollPetFromEgg } from './src/hatch.js'; // ✅ also in src

// Load environment variables
const TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 10000;

const bot = new TelegramBot(TOKEN, { polling: true });

// Simple express web server (Render health check)
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// /ping command
bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, 'pong 🏓');
});

// /hatch command
bot.onText(/\/hatch/, async (msg) => {
  try {
    const userId = msg.from.id;

    // Insert a new egg in the DB
    const result = await db.query(
      `INSERT INTO eggs (user_id, species, status) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [userId, 'mystery', 'HATCHED']
    );

    const egg = result.rows[0];
    const pet = rollPetFromEgg(egg);

    await bot.sendMessage(
      msg.chat.id,
      `🥚 Your egg wiggles... crack! A glitch pet pops out!\n\n` +
      `Traits → color: ${pet.traits.color}; aura: ${pet.traits.aura}; ` +
      `eyes: ${pet.traits.eyes}; pattern: ${pet.traits.pattern}`
    );
  } catch (err) {
    console.error('Hatch error', err);
    await bot.sendMessage(msg.chat.id, '⚠️ Something went wrong hatching your pet.');
  }
});

// Default message
bot.on('message', (msg) => {
  if (!msg.text.startsWith('/')) {
    bot.sendMessage(msg.chat.id, 'I know /ping and /hatch for now. More commands coming!');
  }
});
