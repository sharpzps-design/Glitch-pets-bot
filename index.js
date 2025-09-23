// index.js  (root folder)
// Simpler: POLLING-ONLY + explicitly remove any existing webhook on startup.

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import { rollPetFromEgg } from './hatch.js';

// If you need DB later you can import it like this:
// import { pool } from './src/db.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is missing in environment');
  process.exit(1);
}

// Start bot in POLLING mode
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// IMPORTANT: make sure no webhook is registered (prevents 409 conflicts)
(async () => {
  try {
    await bot.deleteWebHook({ drop_pending_updates: true });
    console.log('Webhook cleared; polling is active.');
  } catch (err) {
    console.warn('Could not delete webhook (continuing):', err?.message || err);
  }
})();

// Basic commands
bot.onText(/^\/ping$/, (msg) => {
  bot.sendMessage(msg.chat.id, 'pong 🏓');
});

bot.onText(/^\/hatch$/, async (msg) => {
  try {
    // Build a simple "egg" object for trait RNG. No DB needed for now.
    const egg = {
      id: `${msg.from.id}-${Date.now()}`,
      user_id: msg.from.id,
      hatch_at: new Date().toISOString(),
    };

    const result = rollPetFromEgg(egg);
    const { color, aura, eyes, pattern } = result.traits;

    const lines = [
      '🥚 Your egg wiggles… crack! A glitch pet pops out! ✨',
      '',
      `Traits → color: ${color}; aura: ${aura}; eyes: ${eyes}; pattern: ${pattern}`,
      result.is_shiny ? '\n🌟 It’s **SHINY**! 🌟' : '',
    ];

    await bot.sendMessage(msg.chat.id, lines.join('\n'));
  } catch (e) {
    console.error('Hatch error:', e);
    await bot.sendMessage(msg.chat.id, '⚠️ Something went wrong hatching your pet.');
  }
});

// Tiny web server just so Render has a port to ping
const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (_req, res) => res.send('Glitch Pets Bot is running (polling)'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));
