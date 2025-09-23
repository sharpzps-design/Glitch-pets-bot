// index.js
import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import db from './src/db.js';

// --- env checks --------------------------------------------------------------
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN env var');
  process.exit(1);
}

const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN; // e.g. https://glitch-pets-bot.onrender.com
if (!WEBHOOK_DOMAIN) {
  console.warn('WEBHOOK_DOMAIN not set – set it to your Render primary URL');
}

// --- bot ---------------------------------------------------------------------
const bot = new Telegraf(BOT_TOKEN);

// simple logger
bot.use(async (ctx, next) => {
  console.log('Update:', ctx.update?.update_id, ctx.update?.message?.text);
  return next();
});

// /start – register user + help text
bot.start(async (ctx) => {
  try {
    const tgId = String(ctx.from.id);
    const username = ctx.from.username || null;

    // upsert user
    await db.query(
      `INSERT INTO users (telegram_id, username)
       VALUES ($1, $2)
       ON CONFLICT (telegram_id) DO UPDATE SET username = EXCLUDED.username`,
      [tgId, username]
    );
  } catch (e) {
    console.error('Error saving user:', e.message);
  }

  await ctx.reply(
    '🐾 Welcome to Glitch Pets!\n\n' +
      'I know /ping and /hatch for now. More commands coming!'
  );
});

// /ping – quick health
bot.command('ping', async (ctx) => {
  try {
    const { rows } = await db.query('SELECT NOW() as now');
    await ctx.reply(`pong 🏓\n(db: ${rows[0].now.toISOString()})`);
  } catch (e) {
    await ctx.reply('pong 🏓 (db unavailable)');
  }
});

// /hatch – placeholder
bot.command('hatch', async (ctx) => {
  await ctx.reply('🥚 Your egg wiggles… crack! A glitch pet pops out! ✨');
});

// Fallback text
bot.on('text', async (ctx) => {
  await ctx.reply('I know /ping and /hatch for now. More commands coming!');
});

// --- express + webhook -------------------------------------------------------
const app = express();
const secretPath = `/telegraf/${bot.secretPathComponent()}`;

async function startServer() {
  // health endpoints
  app.get('/', (_req, res) => res.send('Glitch Pets bot is alive.'));
  app.get('/health', async (_req, res) => {
    try {
      const { rows } = await db.query('SELECT NOW() as now');
      res.json({ ok: true, db_time: rows[0].now });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // attach telegram webhook middleware
  const webhook = await bot.createWebhook({
    domain: WEBHOOK_DOMAIN || '',
    path: secretPath,
  });
  app.use(webhook);
  app.post(secretPath, (_req, res) => res.sendStatus(200)); // quick ack

  // start HTTP server
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, async () => {
    console.log(`Web server running on port ${PORT}`);
    try {
      const { rows } = await db.query('SELECT NOW() as now');
      console.log('DB OK:', rows[0].now.toISOString());
    } catch (e) {
      console.error('DB connection error:', e.message);
    }
  });
}

// graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startServer();
