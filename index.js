import 'dotenv/config';
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import { query } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { rollPetFromEgg } from './hatch.js';

const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing');

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());

// --- helpers -------------------------------------------------
async function findOrCreateUser(ctx) {
  const tgId = ctx.from.id;
  const username = ctx.from.username || null;
  const existing = await query('SELECT * FROM users WHERE telegram_id=$1', [tgId]);
  if (existing.rowCount) return existing.rows[0];
  const ins = await query(
    'INSERT INTO users (telegram_id, username) VALUES ($1,$2) RETURNING *',
    [tgId, username]
  );
  return ins.rows[0];
}

async function giveStarterEgg(userId) {
  const id = uuidv4();
  const hatchAt = dayjs().add(24, 'hour').toISOString(); // change to 2 minutes for testing
  const rarityTable = { shiny: 0.05 };
  const seed = uuidv4();
  await query(
    `INSERT INTO eggs (id, user_id, species, hatch_at, rarity_table, seed)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, userId, 'Firebyte', hatchAt, rarityTable, seed]
  );
  return id;
}

function fmtTimeLeft(ts) {
  const ms = Math.max(0, new Date(ts).getTime() - Date.now());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// --- bot commands -------------------------------------------
bot.start(async (ctx) => {
  const user = await findOrCreateUser(ctx);
  const eggs = await query('SELECT * FROM eggs WHERE user_id=$1', [user.id]);
  if (eggs.rowCount === 0) {
    await giveStarterEgg(user.id);
    await ctx.reply(
      `Welcome to Glitch Pets!\n\nYou received a starter Firebyte Egg 🥚\nIt will be ready to hatch in 24h.`,
      Markup.inlineKeyboard([[Markup.button.callback('Check status', 'STATUS')]])
    );
  } else {
    await ctx.reply('Welcome back! Use /status to see your eggs.');
  }
});

bot.command('status', async (ctx) => {
  const user = await findOrCreateUser(ctx);
  const { rows: eggs } = await query(
    'SELECT * FROM eggs WHERE user_id=$1 ORDER BY created_at DESC',
    [user.id]
  );
  if (!eggs.length) return ctx.reply('You have no eggs. New drops soon!');

  const lines = eggs.map((e) => {
    if (e.status === 'HATCHED') return `🥚 ${e.species} Egg → 🐣 Hatched`;
    if (e.status === 'READY')   return `🥚 ${e.species} Egg → ✅ Ready to hatch`;
    return `🥚 ${e.species} Egg → ⏳ ${fmtTimeLeft(e.hatch_at)} left`;
  });

  const ready = eggs.filter((e) => e.status === 'READY').slice(0, 3);
  await ctx.reply(lines.join('\n'), {
    reply_markup: {
      inline_keyboard: [
        ready.map((e) => ({
          text: `Hatch ${e.species}`,
          callback_data: `HATCH:${e.id}`,
        })),
      ],
    },
  });
});

bot.action('STATUS', async (ctx) => {
  ctx.answerCbQuery();
  return bot.telegram.sendMessage(ctx.chat.id, '/status');
});

bot.action(/HATCH:(.+)/, async (ctx) => {
  ctx.answerCbQuery();
  const eggId = ctx.match[1];
  const { rows } = await query('SELECT * FROM eggs WHERE id=$1', [eggId]);
  if (!rows.length) return ctx.reply('Egg not found.');
  const egg = rows[0];
  if (egg.status !== 'READY') return ctx.reply('This egg is not ready yet.');

  const roll = rollPetFromEgg(egg);
  const petId = uuidv4();
  await query(
    'INSERT INTO pets (id, user_id, species, stage, is_shiny, traits) VALUES ($1,$2,$3,$4,$5,$6)',
    [petId, egg.user_id, egg.species, 1, roll.is_shiny, roll.traits]
  );
  await query('UPDATE eggs SET status=$1 WHERE id=$2', ['HATCHED', eggId]);

  const shinyBadge = roll.is_shiny ? ' ✨SHINY✨' : '';
  await ctx.reply(
    `🐣 Your ${egg.species} hatched${shinyBadge}!\n\nTraits:\n- Color: ${roll.traits.color}\n- Aura: ${roll.traits.aura}\n- Eyes: ${roll.traits.eyes}\n- Pattern: ${roll.traits.pattern}\n\nUse /status to see more.`
  );
});

// --- web server + cron --------------------------------------
app.get('/', (_, res) => res.send('Glitch Pets Bot alive'));

app.get('/cron', async (_req, res) => {
  const { rows: pending } = await query(
    "SELECT e.*, u.telegram_id FROM eggs e JOIN users u ON e.user_id=u.id WHERE e.status='PENDING' AND e.hatch_at <= now()"
  );
  for (const egg of pending) {
    await query("UPDATE eggs SET status='READY' WHERE id=$1", [egg.id]);
    try {
      await bot.telegram.sendMessage(
        egg.telegram_id,
        `✅ Your ${egg.species} Egg is ready to hatch!`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: `Hatch ${egg.species}`, callback_data: `HATCH:${egg.id}` }],
            ],
          },
        }
      );
    } catch (e) {
      console.error('Notify failed', e.message);
    }
  }
  res.json({ flipped: pending.length });
});

// --- diagnostics + launch -----------------------------------
// prints booleans (not your secrets) so we know env vars are set
console.log('ENV CHECK', {
  BOT_TOKEN: !!process.env.BOT_TOKEN,
  DB_URL: !!process.env.DATABASE_URL
});

bot.catch((err) => console.error('Telegraf error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Web server on :' + PORT));

bot.launch({
  dropPendingUpdates: true,
  allowedUpdates: ['message', 'callback_query']
}).then(() => console.log('Bot started'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
