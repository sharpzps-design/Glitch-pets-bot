// hatch.js

// Simple random helpers
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const COLORS = ['Neon Blue', 'Crimson Red', 'Aurora Purple', 'Cyber Yellow'];
const AURAS  = ['Smoke', 'Sparks', 'Halo', 'Glitch'];
const EYES   = ['Glitch Green', 'Laser Pink', 'Chrome', 'Void'];
const PATTERNS = ['None', 'Stripes', 'Spots', 'Circuit'];

export async function handleHatch({ bot, msg, query }) {
  const userId = msg.from.id;

  // create a pet row (adapt table/columns to your schema)
  const traits = {
    color: pick(COLORS),
    aura: pick(AURAS),
    eyes: pick(EYES),
    pattern: pick(PATTERNS),
  };

  // Example insert (adjust to your tables!)
  // Suppose you have a `pets` table: id SERIAL, user_id BIGINT, color TEXT, aura TEXT, eyes TEXT, pattern TEXT, created_at TIMESTAMP DEFAULT now()
  await query(
    `INSERT INTO pets (user_id, color, aura, eyes, pattern)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, traits.color, traits.aura, traits.eyes, traits.pattern]
  );

  await bot.sendMessage(
    msg.chat.id,
    `🥚 Your egg wiggles… crack! A glitch pet pops out!\n\n` +
      `Traits → color: ${traits.color}; aura: ${traits.aura}; eyes: ${traits.eyes}; pattern: ${traits.pattern}`
  );
}
