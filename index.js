// index.js
import TelegramBot from 'node-telegram-bot-api';
import { query } from './src/db.js';
import { handleHatch } from './hatch.js';

// Read from environment (Render provides these automatically)
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN environment variable.');
  process.exit(1);
}

// Start bot with polling (simple + works on Render)
const bot = new TelegramBot(token, { polling: true });

bot.onText(/^\/start\b/i, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'Welcome to Glitch Pets! Use /hatch to hatch an egg.'
  );
});

bot.onText(/^\/hatch\b/i, async (msg) => {
  try {
    await handleHatch({ bot, msg, query });
  } catch (err) {
    console.error('Hatch command failed:', err);
    bot.sendMessage(msg.chat.id, '⚠️ Something went wrong hatching your pet.');
  }
});

// Graceful shutdown for Render
process.on('SIGTERM', async () => {
  try {
    await bot.stopPolling();
  } finally {
    process.exit(0);
  }
});
