// ---- Situations (REDESIGN.md Phase 10, §2.5) ----
// A square where the player chooses between two or three options, each with a move the player can see (a snake, a
// ladder, or staying where they are), a cost in years they can see, and a guna and aims they never see: the same tags
// the vices and virtues carry, applied the same way (src/engine/self.js grow). The dishonest option advances more
// cheaply, never further; the lint holds that. Pure, so the page and tools/sim.mjs choose alike.
import { SITUATIONS, SQ, SNAKES, LADDERS, squareOf } from "../content.js";
import { makeRng, next, die } from "../rng.js";
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
// A law may have a computer choose its own way (src/engine/laws/): Mīmāṃsā's sees every consequence and is honest,
// Cārvāka's takes the most wealth and pleasure ("pleasure"). The sim's --policy, when given, overrides them all.
export let POLICY = "mixed", FORCED = null;
// setPolicy(null) puts back the game's own: mixed, and each law its own way
export const setPolicy = x => { POLICY = x ?? "mixed"; FORCED = x ?? null; };
export const policyOr = x => FORCED ?? x;
const pleasureOf = o => (o.aims?.artha ?? 0) + (o.aims?.kama ?? 0);
export function choiceFor(state, sit, policy = POLICY) {
  const p = state.players[state.turn], open = optionsFor(p, sit).filter(o => o.open);
  if (policy === "honest" || policy === "dishonest") {
    const sign = policy === "honest" ? -1 : 1;
    return [...open].sort((a, b) => sign * (worthOf(a) - worthOf(b)))[0].id;
  }
  if (policy === "pleasure") return [...open].sort((a, b) => pleasureOf(b) - pleasureOf(a))[0].id;
  const rng = makeRng((state.rng.seed ^ 0x2545f491 ^ Math.imul(state.turn + 1, 0x9e3779b1) ^ Math.imul((p.life?.length ?? 0) + 1, 0x85ebca6b) ^ Math.imul(p.rebirths ?? 0, 0x632be5ab)) >>> 0);
  return open[Math.floor(next(rng) * open.length)].id;
}

// ---- The witness (REDESIGN.md Phase 15) ----
// The player is the witness who chooses; the life is what acts (Gita 13.22). On the five ego tests (content/situations.json
// `ego`: 49, 54, 55, 56, 59) a choice of anything but the lower option is followed by a throw of the ego's own die, and on
// the faces the ego owns the life takes the lower option instead: its move, years, guna, aims and seed. Choosing the
// lower option needs no throw: the ego already agrees. The faces follow the gunas at that moment, and are shown on the
// card before the choice as faces, never as a number about the player.
// tools/sim.mjs --ego=off takes the throw away, to measure what it changes; nothing in the game turns it off
export let EGO_ON = true;
export const setEgo = on => { EGO_ON = on; };
export const egoOf = n => (EGO_ON ? situationAt(n)?.ego ?? null : null);
// Sattva leads by this much over the larger of rajas and tamas, or trails by it; in between the life is mixed. Measured
// over 20,000 lives at the higher choices (REDESIGN.md Phase 15): a smaller margin leaves the mixed band almost empty,
// since the gunas move in quarter steps.
export const EGO_LEAD = 0.1;
// The faces the ego owns for player p: only a 6 if sattva leads, 5 and 6 if mixed, 4 to 6 if rajas or tamas leads, and
// none at the highest bhumikas (the fifth and above, which only a sannyasin reaches).
export function egoFaces(p) {
  if ((p.bhumika ?? -1) >= 5) return [];
  const g = p.gunas ?? freshGunas(), d = g.s - Math.max(g.r, g.t);
  return d >= EGO_LEAD ? [6] : d <= -EGO_LEAD ? [4, 5, 6] : [5, 6];
}
// The ego's throw for player idx on the landing after `lived` squares of their life: one die, off a sequence of its own,
// so the dice that move the token never change. It is never the omen and never moves the token.
// The faces in force for the current player on square n: none without an ego test there, else egoFaces, or what ?debug's
// mp.ego() set for the next throw (state.forceEgo).
export const egoFacesOn = (state, n) => (egoOf(n) ? state.forceEgo ?? egoFaces(state.players[state.turn]) : null);
export const egoThrow = (state, idx, lived) =>
  die(makeRng((state.rng.seed ^ 0x1b873593 ^ Math.imul(idx + 1, 0xcc9e2d51) ^ Math.imul(lived + 1, 0x7feb352d) ^ Math.imul(state.players[idx]?.rebirths ?? 0, 0x632be5ab)) >>> 0));

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
