// index.js
import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import { v4 as uuidv4 } from 'uuid';
import db from './src/db.js'; // exports { query, pool } but we use query()

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('Missing BOT_TOKEN env var');
}

const app = express();
const bot = new Telegraf(BOT_TOKEN);

// --- tiny helpers -----------------------------------------------------------
const SPECIES = ['glitchling', 'pixpup', 'bytebun', 'dataduck', 'cachecat'];

const secondsLeft = (iso) => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 1000));
const fmt = (s) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
};

async function getOrCreateUser(ctx) {
  const tgId = String(ctx.from.id);
  const username = ctx.from.username ?? null;

  // Upsert by telegram_id; adjust if your table lacks a UNIQUE on telegram_id
  const { rows } = await db.query(
    `INSERT INTO users (telegram_id, username)
     VALUES ($1, $2)
     ON CONFLICT (telegram_id) DO UPDATE SET username = EXCLUDED.username
     RETURNING id`,
    [tgId, username]
  );
  return rows[0].id;
}

async function getActiveEgg(userId) {
  const { rows } = await db.query(
    `SELECT * FROM eggs
     WHERE user_id = $1 AND status = 'incubating'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function giveEgg(userId, hatchInSeconds = 120) {
  const id = uuidv4();
  const seed = uuidv4().slice(0, 8);
  const { rows } = await db.query(
    `INSERT INTO eggs (id, user_id, status, created_at, hatch_at, seed)
     VALUES ($1, $2, 'incubating', NOW(), NOW() + make_interval(secs => $3), $4)
     RETURNING *`,
    [id, userId, hatchInSeconds, seed]
  );
  return rows[0];
}

async function listPets(userId, limit = 5) {
  const { rows } = await db.query(
    `SELECT species, is_shiny, created_at
     FROM pets
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

// --- command handlers -------------------------------------------------------
bot.start(async (ctx) => {
  try {
    const userId = await getOrCreateUser(ctx);

    // ensure one active egg
    let egg = await getActiveEgg(userId);
    if (!egg) {
      egg = await giveEgg(userId, 120); // 2 minutes
      await ctx.reply('🥚 You found a mysterious egg! It’s now incubating…');
    }

    const left = secondsLeft(egg.hatch_at);
    await ctx.reply(
      `Welcome to Glitch Pets!\n\n` +
      `Your egg will hatch in ~ ${fmt(left)}.\n` +
      `Try /status or /pets while you wait.`
    );
  } catch (err) {
    console.error('start error:', err);
    await ctx.reply('Something went wrong starting your adventure 😿');
  }
});

bot.command('ping', (ctx) => ctx.reply('pong 🏓'));

bot.command('status', async (ctx) => {
  try {
    const userId = await getOrCreateUser(ctx);
    const egg = await getActiveEgg(userId);
    if (egg) {
      const left = secondsLeft(egg.hatch_at);
      return ctx.reply(`🥚 Egg status: incubating… hatches in ~ ${fmt(left)}.`);
    }
    const pets = await listPets(userId, 1);
    if (pets.length) {
      const p = pets[0];
      return ctx.reply(
        `${p.is_shiny ? '✨' : '🐾'} Latest pet: ${p.species} — hatched at ${new Date(
          p.created_at
        ).toLocaleString()}`
      );
    }
    return ctx.reply('No egg incubating yet. Use /start to get one!');
  } catch (err) {
    console.error('/status error:', err);
    ctx.reply('Could not fetch status right now.');
  }
});

bot.command('pets', async (ctx) => {
  try {
    const userId = await getOrCreateUser(ctx);
    const pets = await listPets(userId, 5);
    if (!pets.length) return ctx.reply('You have no pets yet. Keep hatching!');
    const lines = pets.map(
      (p, i) =>
        `${i + 1}. ${p.is_shiny ? '✨' : '🐾'} ${p.species} — ${new Date(
          p.created_at
        ).toLocaleString()}`
    );
    ctx.reply(lines.join('\n'));
  } catch (err) {
    console.error('/pets error:', err);
    ctx.reply('Could not list pets right now.');
  }
});

// Manual hatch trigger (for testing): sets your active egg to hatch now
bot.command('hatch', async (ctx) => {
  try {
    const userId = await getOrCreateUser(ctx);
    const egg = await getActiveEgg(userId);
    if (!egg) return ctx.reply('You have no active egg.');
    await db.query(`UPDATE eggs SET hatch_at = NOW() WHERE id = $1`, [egg.id]);
    ctx.reply('⏱️ Speeding up time… your egg will hatch any moment!');
  } catch (err) {
    console.error('/hatch error:', err);
    ctx.reply('Could not hurry the hatch. Try again.');
  }
});

// Fallback text
bot.on('text', (ctx) =>
  ctx.reply('I know /ping, /start, /status, /pets, and /hatch for now. More coming soon!')
);

// --- background hatcher loop -----------------------------------------------
async function processDueEggs() {
  try {
    const { rows: due } = await db.query(
      `SELECT e.id, e.user_id, e.seed, u.telegram_id
       FROM eggs e
       JOIN users u ON u.id = e.user_id
       WHERE e.status = 'incubating' AND e.hatch_at <= NOW()
       ORDER BY e.hatch_at ASC
       LIMIT 10`
    );

    for (const egg of due) {
      // roll a species + shiny flag (1/20 chance)
      const species = SPECIES[Math.floor(Math.random() * SPECIES.length)];
      const isShiny = Math.random() < 1 / 20;

      // complete in a transaction-ish sequence
      const petId = uuidv4();
      await db.query(
        `INSERT INTO pets (id, user_id, species, stage, is_shiny, traits, created_at)
         VALUES ($1, $2, $3, 1, $4, '{}'::jsonb, NOW())`,
        [petId, egg.user_id, species, isShiny]
      );
      await db.query(`UPDATE eggs SET status = 'hatched' WHERE id = $1`, [egg.id]);

      // notify user
      const msg = `${isShiny ? '✨' : '🎉'} Your egg hatched into a ${species}${
        isShiny ? ' (shiny!)' : ''
      }!`;
      try {
        await bot.telegram.sendMessage(egg.telegram_id, msg);
      } catch (e) {
        console.warn('sendMessage failed:', e.message);
      }
    }
  } catch (err) {
    console.error('hatcher loop error:', err);
  }
}

// run every 20 seconds
setInterval(processDueEggs, 20_000);

// --- webhook server ---------------------------------------------------------
const secretPath = `/telegraf/${bot.secretPathComponent()}`;

// health + simple root
app.get('/', (_req, res) => res.send('Glitch Pets bot is alive.'));
app.get('/health', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW() as now');
    res.json({ ok: true, db_time: rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// telegram webhook
app.use(await bot.createWebhook({ domain: process.env.WEBHOOK_DOMAIN ?? '', path: secretPath }));
app.post(secretPath, (req, res) => res.sendStatus(200));

// start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
  console.log(`Webhook path: ${secretPath}`);
});
