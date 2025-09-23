// Load .env locally (Render provides env vars; this is safe to keep)
try { require('dotenv').config(); } catch (_) {}

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const { initDb } = require('./src/db');
const { initHatcher, scheduleEgg } = require('./hatch');

// ----- config -----
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN environment variable.');
  process.exit(1);
}

// ----- start tiny web server (Render expects a web service) -----
const app = express();
app.get('/', (_req, res) => res.send('Glitch Pets bot is alive 🐣'));
app.get('/health', (_req, res) => res.send('ok'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// ----- start bot (polling) -----
const bot = new TelegramBot(TOKEN, { polling: true });
console.log('Polling started.');

// Initialize DB and hatcher loop
initDb().then(() => initHatcher(bot)).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

// Helpers
function parseDurationToMs(text) {
  // examples: "10s", "5m", "2h"
  const m = String(text || '').trim().match(/^(\d+)\s*([smh])$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  if (unit === 's') return n * 1000;
  if (unit === 'm') return n * 60 * 1000;
  if (unit === 'h') return n * 60 * 60 * 1000;
  return null;
}

// Commands
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    'Welcome to Glitch Pets! 🐣\n\nUse: /hatch <delay> <species>\nExample: /hatch 5m chick'
  );
});

bot.onText(/^\/hatch\s+(\S+)\s+(.+)$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const delayText = match[1];
  const species = match[2].trim();

  const ms = parseDurationToMs(delayText);
  if (!ms) {
    return bot.sendMessage(chatId, 'I couldn’t read that delay. Use formats like 10s, 5m, 2h');
  }

  try {
    const hatchAt = new Date(Date.now() + ms);
    await scheduleEgg({ userId: chatId, species, hatchAt });
    await bot.sendMessage(chatId, `Egg scheduled: a ${species} will hatch in ${delayText}!`);
  } catch (e) {
    console.error('scheduleEgg error', e);
    await bot.sendMessage(chatId, 'Sorry, I failed to schedule your egg.');
  }
});

bot.on('polling_error', (err) => {
  console.error('Polling error:', err?.response?.body || err);
});
