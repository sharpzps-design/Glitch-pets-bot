// index.js
import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import db from './src/db.js'; // keeps the DB connection warm

const PORT = process.env.PORT || 10000;
const { BOT_TOKEN, APP_URL } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing');

const bot = new Telegraf(BOT_TOKEN);

// == Commands ==
bot.start(async (ctx) => {
  await ctx.reply('🐾 Welcome to Glitch Pets!');
  await ctx.reply('Try: /ping or /hatch');
});

bot.command('ping', (ctx) => ctx.reply('pong 🏓'));

bot.command('hatch', async (ctx) => {
  // Demo reply (no DB write yet)
  await ctx.reply('🥚 Your egg wiggles… crack! A glitch pet pops out! ✨');
  await ctx.reply('This is a placeholder. We can wire this to the database next.');
});

// Fallback for any text that isn’t a command
bot.on('text', (ctx) => ctx.reply('I know /ping and /hatch. More commands coming!'));

// == Webhook vs polling ==
const app = express();
app.get('/', (_req, res) => res.send('Glitch Pets bot is running.'));
app.use(express.json());

// Use webhook on Render if APP_URL is set, otherwise fall back to long polling (local/dev)
(async () => {
  try {
    if (APP_URL) {
      const path = '/webhook';
      await bot.telegram.setWebhook(`${APP_URL}${path}`);
      app.use(path, bot.webhookCallback(path));
      console.log('Webhook set:', `${APP_URL}${path}`);
    } else {
      await bot.launch();
      console.log('Bot launched with long polling');
    }
  } catch (err) {
    console.error('Bot start error:', err.message);
  }
})();

app.listen(PORT, () => {
  console.log('Web server running on port', PORT);
});
