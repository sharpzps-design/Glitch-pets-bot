import seedrandom from 'seedrandom';

export function rollPetFromEgg(egg) {
  const seed = egg.seed || `${egg.id}-${egg.user_id}-${egg.hatch_at}`;
  const rng = seedrandom(seed);

  const shiny = rng() < 0.05; // 5% shiny chance
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  const color   = shiny ? pick(["Prismatic","Neon Blue","Acid Green","Hot Pink"])
                        : pick(["Crimson","Neon Blue","Hot Pink","Deep Red"]);
  const aura    = shiny ? "Holo-glitch" : pick(["Smoke","Sparks","Static"]);
  const eyes    = shiny ? "Dual-glitch" : pick(["Glitch Yellow","Glitch Green"]);
  const pattern = shiny ? "Prismatic"   : pick(["None","Stripes","Fractal"]);

  return { is_shiny: shiny, traits: { color, aura, eyes, pattern } };
}

// NEW: named handler for the /hatch command
export async function hatch(ctx) {
  try {
    // simple placeholder egg for now (we’ll hook DB later)
    const egg = {
      id: `${Date.now()}`,
      user_id: ctx.from?.id ?? 'anon',
      hatch_at: Date.now(),
    };

    const pet = rollPetFromEgg(egg);

    const shinyLine = pet.is_shiny ? '✨ It’s SHINY!' : '';
    await ctx.reply(
      `🥚 Your egg wiggles… crack! A glitch pet pops out!\n` +
      `${shinyLine}\n` +
      `Traits → color: ${pet.traits.color}; aura: ${pet.traits.aura}; ` +
      `eyes: ${pet.traits.eyes}; pattern: ${pet.traits.pattern}`
    );
  } catch (err) {
    console.error('hatch error:', err);
    await ctx.reply('Oops, something went wrong hatching your egg. Try again later.');
  }
}
