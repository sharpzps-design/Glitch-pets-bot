// index.js
import express from "express";
import { Telegraf } from "telegraf";
import db from "./src/db.js";
import { rollPetFromEgg } from "./src/hatch.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("Missing BOT_TOKEN env var");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// --- simple keep-alive webserver for Render/Glitch ---
const app = express();
const PORT = process.env.PORT || 10000;
app.get("/", (_, res) => res.send("Glitch Pets bot is alive"));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// --- helpers ---
function formatTraits(traits) {
  const { color, aura, eyes, pattern } = traits;
  return `Traits → color: ${color}; aura: ${aura}; eyes: ${eyes}; pattern: ${pattern}`;
}

// --- commands ---
bot.start((ctx) => {
  ctx.reply("🐾 Welcome to Glitch Pets!\n\nI know /ping and /hatch for now. More commands coming!");
});

bot.command("ping", (ctx) => ctx.reply("pong 🏓"));

// /hatch: generate traits, save a pet row, reply with summary
bot.command("hatch", async (ctx) => {
  try {
    const userId = ctx.from.id;

    // You already have an "egg" shape from earlier examples; here we just seed from user/time
    const egg = {
      id: `egg-${Date.now()}`,
      user_id: userId,
      hatch_at: new Date().toISOString(),
      seed: undefined, // let hatch.js derive a seed from fields above
    };

    // roll traits
    const rolled = rollPetFromEgg(egg); // { is_shiny, traits: {color,aura,eyes,pattern} }

    // save pet into DB
    const insert = `
      INSERT INTO pets (user_id, is_shiny, color, aura, eyes, pattern)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, hatched_at
    `;
    const params = [
      userId,
      rolled.is_shiny,
      rolled.traits.color,
      rolled.traits.aura,
      rolled.traits.eyes,
      rolled.traits.pattern,
    ];

    const result = await db.query(insert, params);
    const petId = result.rows[0]?.id;

    const shinyTxt = rolled.is_shiny ? "✨(SHINY!)✨ " : "";
    await ctx.reply(
      `🥚 Your egg wiggles… crack! ${shinyTxt}A glitch pet pops out!\n\n${formatTraits(
        rolled.traits
      )}\n\n#${petId ? `Pet ID: ${petId}` : ""}`
    );
  } catch (err) {
    console.error("HATCH error:", err);
    await ctx.reply("Uh-oh, I glitched while hatching that egg. Try again in a moment!");
  }
});

// --- generic text handler so bot “knows” supported commands ---
bot.on("text", (ctx) => {
  ctx.reply("I know /ping and /hatch for now. More commands coming!");
});

// start polling
bot.launch().then(() => console.log("Bot launched ✅"));

// graceful stop for Render
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
