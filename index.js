// index.js
import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import db from './src/db.js';          // Pool wrapper { query, pool }
import hatch from './hatch.js';        // (still just sends a fun hatch msg)

// --- ENV CHECKS ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN; // e.g. https://glitch-pets-bot.onrender.com
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN env var');
  process.exit(1);
}
if (!WEBHOOK_DOMAIN) {
  console.error('Missing WEBHOOK_DOMAIN env var (your Render URL)');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Optional: set command list shown in Telegram UI
await bot.telegram.setMyCommands([
  { command: 'start', description: 'Welcome & help' },
  { command: 'help', description: 'Show commands' },
  { command: 'ping', description: 'Pong test' },
  { command: 'newegg', description: 'Receive a new egg' },
  { command: 'hatch', description: 'Hatch an egg' },
  { command: 'mypets', description: 'List your pets' },
]);

// --- HELP TEXT ---
const helpText =
  'I know these commands:\n' +
  '/ping – pong test\n' +
  '/newegg – get a new egg\n' +
  '/hatch – hatch an egg\n' +
  '/mypets – list your last 5 pets\n' +
  '\nMore commands coming!';

// --- COMMANDS ---
bot.start(async (ctx) => {
  await ctx.reply('🐾 Welcome to Glitch Pets!');
  await ctx.reply(helpText);
});

bot.help((ctx) => ctx.reply(helpText));

bot.command('ping', (ctx) => ctx.reply('pong 🏓'));

// Give the user a new egg
bot.command('newegg', async (ctx) => {
  try {
    const userId = ctx.from.id;
    // super-simple egg: random species tag string
    const species = ['slime', 'sprite', 'wisp', 'geist'][Math.floor(Math.random() * 4)];
    await db.query(
      `insert into eggs (id, user_id, species, status, created_at)
       values (gen_random_uuid(), $1, $2, 'unhatched', now())`,
      [userId, species]
    );
    await ctx.reply(`🥚 You received a **${species}** egg! Use /hatch to crack it open.`, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('newegg error', err);
    await ctx.reply('Sorry, I could not give you an egg right now 😿');
  }
});

// List last 5 pets
bot.command('mypets', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const { rows } = await db.query(
      `select species, stage, is_shiny, created_at
         from pets
        where user_id = $1
        order by created_at desc
        limit 5`,
      [userId]
    );
    if (rows.length === 0) {
      await ctx.reply('You have no pets yet. Try /newegg then /hatch!');
      return;
    }
    const lines = rows.map((p, i) => {
      const stars = p.is_shiny ? ' ✨' : '';
      return `${i + 1}. ${p.species} — stage ${p.stage}${stars}`;
    });
    await ctx.reply('Your pets:\n' + lines.join('\n'));
  } catch (err) {
    console.error('mypets error', err);
    await ctx.reply('Could not fetch your pets right now 😿');
  }
});

// Simple hatch flow (keeps your existing fun message in hatch.js)
// Later we can make this actually move an egg -> pet in the DB.
bot.command('hatch', async (ctx) => {
  try {
    await hatch(ctx); // currently just messages; we’ll wire DB later
  } catch (err) {
    console.error('hatch error', err);
    await ctx.reply('Hatching failed this time 😿');
  }
});

// --- WEBHOOK (Render friendly) ---
const app = express();
app.use(express.json());

// Webhook path includes token (recommended)
app.use(bot.webhookCallback(`/tg/${BOT_TOKEN}`));

// Basic health route
app.get('/', (_req, res) => res.send('OK'));

// Start server then set webhook
app.listen(PORT, async () => {
  const url = `${WEBHOOK_DOMAIN}/tg/${BOT_TOKEN}`;
  try {
    await bot.telegram.setWebhook(url);
    console.log('Web server running on port', PORT);
    console.log('Webhook set to:', url);
    // Optional: light DB check
    try {
      const { rows } = await db.query('select now() as now');
      console.log('DB OK:', rows[0].now.toISOString());
    } catch (dbErr) {
      console.error('DB check failed:', dbErr.message);
    }
  } catch (e) {
    console.error('Failed to set webhook:', e.message);
    process.exit(1);
  }
});
