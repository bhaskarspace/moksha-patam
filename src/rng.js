// The only source of randomness in the game. mulberry32, with its whole state in one integer
// that lives in game state, so a seed replays a life exactly and a snapshot resumes mid-sequence.
export const makeRng = seed => ({ seed: seed >>> 0, s: seed >>> 0 });

export function next(r) {
  r.s = (r.s + 0x6D2B79F5) | 0;
  let t = Math.imul(r.s ^ (r.s >>> 15), 1 | r.s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const die = r => 1 + Math.floor(next(r) * 6);

// A new seed when none is given. Not part of the game's own sequence.
export const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
