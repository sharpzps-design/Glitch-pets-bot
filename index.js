// index.js
import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import { rollPetFromEgg } from './hatch.js';
// If/when we start writing to the database, uncomment the next line:
// import db from './src/db.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN environment variable');
  process.exit(1);
}

// 1) Start Telegram bot with long polling
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// 2) Tiny web server for Render health checks
const app = express();
app.get('/', (_req, res) => res.send('Glitch Pets bot is running.'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// 3) Help text
bot.setMyCommands([
  { command: 'start', description: 'Start' },
  { command: 'ping',  description: 'Ping the bot' },
  { command: 'hatch', description: 'Hatch your egg' },
]);

// 4) Handlers
bot.onText(/^\/start|^hi$|^hello$/i, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'I know /ping and /hatch for now. More commands coming!'
  );
});

bot.onText(/^\/ping$/, (msg) => {
  bot.sendMessage(msg.chat.id, 'pong 🏓');
});

bot.onText(/^\/hatch$/, async (msg) => {
  try {
    // Build a stable “egg” seed from user + time for trait RNG
    const egg = {
      id: `${msg.chat.id}-${Date.now()}`,
      user_id: msg.from?.id ?? msg.chat.id,
      hatch_at: new Date().toISOString(),
    };

    const pet = rollPetFromEgg(egg);

    // (DB write will come later — keeping things simple & stable for now)
    // Example when we enable DB:
    // await db.query('INSERT INTO pets(user_id, traits, is_shiny) VALUES ($1,$2,$3)', [
    //   egg.user_id,
    //   pet.traits,
    //   pet.is_shiny,
    // ]);

    const t = pet.traits;
    const lines = [
      '🥚 Your egg wiggles… crack! A glitch pet pops out! ✨',
      '',
      `Traits → color: ${t.color}; aura: ${t.aura}; eyes: ${t.eyes}; pattern: ${t.pattern}`,
      pet.is_shiny ? '⭐️ SHINY!' : '',
    ].filter(Boolean);

    await bot.sendMessage(msg.chat.id, lines.join('\n'));
  } catch (err) {
    console.error('Hatch error', err);
    bot.sendMessage(msg.chat.id, '⚠️ Something went wrong hatching your pet.');
  }
});

// 5) Fallback for other messages
bot.on('message', (msg) => {
  if (typeof msg.text === 'string' && !msg.text.startsWith('/')) {
    bot.sendMessage(
      msg.chat.id,
      'I know /ping and /hatch for now. More commands coming!'
    );
  }
});
