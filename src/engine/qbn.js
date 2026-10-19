// ---- Situations (REDESIGN.md Phase 10, §2.5) ----
// A square where the player chooses between two or three options, each with a move the player can see (a snake, a
// ladder, or staying where they are), a cost in years they can see, and a guna and aims they never see: the same tags
// the vices and virtues carry, applied the same way (src/engine/self.js grow). The dishonest option advances more
// cheaply, never further; the lint holds that. Pure, so the page and tools/sim.mjs choose alike.
import { SITUATIONS, SQ, SNAKES, LADDERS, squareOf } from "../content.js";
import { makeRng, next } from "../rng.js";
import { stageOfPlayer, freshGunas, freshAims } from "./self.js";
import { ENDGAME } from "./turn.js";

// The situation on square n, or null: then the square is its story card, as it always was. Below the endgame only,
// for now: from 94 the dice are already a choice.
export const situationAt = n => (n < ENDGAME && SITUATIONS[n]?.options?.length ? SITUATIONS[n] : null);
export const optionOf = (n, id) => situationAt(n)?.options.find(o => o.id === id) ?? null;

// Whether a gate lets player p take an option. A range on a guna share or an aim is { min?, max? }; a stage gate lists
// the stages of life (0 childhood … 4 sannyasa) it is open in.
const within = (x, r) => (r.min == null || x >= r.min) && (r.max == null || x <= r.max);
export function passes(p, require) {
  if (!require) return true;
  const g = p.gunas ?? freshGunas(), a = p.aims ?? freshAims();
  if (require.stage && !require.stage.includes(stageOfPlayer(p))) return false;
  for (const [k, r] of Object.entries(require.guna || {})) if (!within(g[k], r)) return false;
  for (const [k, r] of Object.entries(require.aims || {})) if (!within(a[k], r)) return false;
  return true;
}
// Every option, with whether it is open to p. A withheld option is still shown, with its reason (§2.5: surface why).
export const optionsFor = (p, sit) => sit.options.map(o => ({ ...o, open: passes(p, o.require) }));

// Where an option takes the player from square n: the snake's tail, the ladder's top, or n itself (also for a move
// the square cannot make, which the lint reports rather than this throwing on).
export const destOf = (n, o) => (o.move === "snake" ? SNAKES[n]?.to ?? n : o.move === "ladder" ? LADDERS[n]?.to ?? n : n);

// What an option is worth, hidden: dharma first, then the guna. Only the sim's honest and dishonest players and the
// lint read it; the game never shows it and never uses it to judge.
const GUNA_WORTH = { s: 5, r: 0, t: -3 };
export const worthOf = o => (o.aims?.dharma ?? 0) + (GUNA_WORTH[o.guna] ?? 0);

// How a computer chooses. "mixed" is the game's own: any open option, from a sequence of its own seeded by the game
// and the turn, so the dice are never touched. tools/sim.mjs sets "honest" (the most worth) or "dishonest" (the least).
export let POLICY = "mixed";
export const setPolicy = x => { POLICY = x; };
export function choiceFor(state, sit) {
  const p = state.players[state.turn], open = optionsFor(p, sit).filter(o => o.open);
  if (POLICY === "honest" || POLICY === "dishonest") {
    const sign = POLICY === "honest" ? -1 : 1;
    return [...open].sort((a, b) => sign * (worthOf(a) - worthOf(b)))[0].id;
  }
  const rng = makeRng((state.rng.seed ^ 0x2545f491 ^ Math.imul(state.turn + 1, 0x9e3779b1) ^ Math.imul((p.life?.length ?? 0) + 1, 0x85ebca6b)) >>> 0);
  return open[Math.floor(next(rng) * open.length)].id;
}

// ---- What a square tells ----
// The moment a landing on square n told, given what it told (p.told): a roll-dependent square's other moment, a
// situation's chosen outcome, or the square's own. own says it is the square's own moment, which is what a callback
// to the square names (src/engine/account.js). key tells moments apart, so what repeats is a moment, not a square.
export function momentOf(n, told) {
  const q = squareOf(n);
  if (told === "else" && SQ[n]?.roll) return { moment: SQ[n].roll.moment, own: false, key: `${n}:else` };
  const o = told && told !== "else" ? optionOf(n, told) : null;
  if (o?.outcome) return { moment: o.outcome, own: false, key: `${n}:${o.id}` };
  return { moment: q?.moment, own: true, key: n };
}
