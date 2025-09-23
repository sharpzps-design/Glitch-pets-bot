// index.js
import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import { hatch } from './hatch.js'; // we added this named export in step 1

// 1) Telegram bot setup
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is missing. Add it in Render → Environment.');
}

const bot = new Telegraf(BOT_TOKEN);

// Basic commands
bot.start(async (ctx) => {
  await ctx.reply('🐾 Welcome to Glitch Pets!');
  await ctx.reply('I know /ping and /hatch for now. More commands coming!');
});

bot.command('ping', (ctx) => ctx.reply('pong 🏓'));

// Wire /hatch to the handler we exported from hatch.js
bot.command('hatch', hatch);

// Launch polling
bot.launch().then(() => {
  console.log('Telegram bot launched');
}).catch((err) => {
  console.error('Failed to launch bot:', err);
});

// 2) Tiny web server (Render keeps the service alive)
const app = express();

app.get('/', (_req, res) => {
  res.type('text').send('Glitch Pets bot is running');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// 3) Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
