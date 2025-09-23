// index.js (root) — works with: index.js + hatch.js at root, db.js in ./src

import http from 'http';
import TelegramBot from 'node-telegram-bot-api';
import { rollPetFromEgg } from './hatch.js';
import db from './src/db.js'; // db.js lives in ./src

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN env var.');
  process.exit(1);
}

// keep-alive web server for Render
const PORT = process.env.PORT || 10000;
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Glitch Pets Bot ok');
  })
  .listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
  });

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

async function checkDb() {
  try {
    const { rows } = await db.query('select now() as now');
    console.log('DB OK:', rows[0].now);
  } catch (e) {
    console.error('DB check failed:', e.message);
  }
}

function helpText() {
  return 'I know /ping and /hatch for now. More commands coming!';
}

function traitsLine(traits) {
  return `Traits → color: ${traits.color}; aura: ${traits.aura}; eyes: ${traits.eyes}; pattern: ${traits.pattern}`;
}

// handlers
bot.onText(/\/start/i, (msg) => {
  bot.sendMessage(msg.chat.id, helpText(), { parse_mode: 'Markdown' });
});

bot.onText(/\/ping/i, (msg) => {
  bot.sendMessage(msg.chat.id, 'pong 🏓');
});

bot.onText(/\/hatch/i, async (msg) => {
  const chatId = msg.chat.id;

  // Build a deterministic “egg” and roll a pet from it
  const egg = {
    id: cryptoRandomId(),
    user_id: msg.from?.id || 0,
    hatch_at: new Date().toISOString(),
  };

  try {
    const pet = rollPetFromEgg(egg);

    // Try to save to DB (optional). Wrapped in try/catch so it never breaks the reply.
    try {
      await db.query(
        `insert into pets (user_id, species, is_shiny, traits)
         values ($1, $2, $3, $4::jsonb)`,
        [egg.user_id, 'glitchling', pet.is_shiny, JSON.stringify(pet.traits)]
      );
    } catch (dbErr) {
      // non-fatal — just log it
      console.error('DB insert skipped:', dbErr.message);
    }

    const lines = [
      '🥚 Your egg wiggles… crack! A glitch pet pops out! ✨',
      '',
      traitsLine(pet.traits),
    ].join('\n');

    await bot.sendMessage(chatId, lines);
  } catch (err) {
    console.error('Hatch error:', err);
    await bot.sendMessage(chatId, '⚠️ Something went wrong hatching your pet.');
  }
});

// boot
(async function start() {
  await checkDb();
  console.log('Bot is running.');
})();

// simple id helper (not crypto-strong; fine for demo ids)
function cryptoRandomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
