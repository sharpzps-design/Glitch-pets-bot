import seedrandom from 'seedrandom';

export function rollPetFromEgg(egg) {
  const seed = egg.seed || `${egg.id}-${egg.user_id}-${egg.hatch_at}`;
  const rng = seedrandom(seed);

  const shiny = rng() < 0.05; // 5% shiny chance
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  const color  = shiny ? pick(["Prismatic","Neon Blue","Acid Green","Hot Pink"])
                       : pick(["Crimson","Neon Blue","Hot Pink","Deep Red"]);
  const aura   = shiny ? "Holo-glitch" : pick(["Smoke","Sparks","Static"]);
  const eyes   = shiny ? "Dual-glitch" : pick(["Glitch Yellow","Glitch Green"]);
  const pattern= shiny ? "Prismatic" : pick(["None","Stripes","Fractal"]);

  return { is_shiny: shiny, traits: { color, aura, eyes, pattern } };
}
