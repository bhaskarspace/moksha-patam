// ---- Karma (REDESIGN.md Phase 12, §2.2, docs/REFERENCE.md §2) ----
// The ledger. Three buckets, never shown as numbers: sañcita, the store carried from lives before (empty at birth until
// Phase 15 carries one over); āgāmi, what this life is making; prārabdha, what has ripened and waits to fruit. A seed is
// what a choice plants beside the guna it shifts (src/engine/qbn.js, content/situations.json "seed"): the guna is what
// the player is becoming, the seed what is coming for them, and the lint holds that both point the same way.
//
// Which channel? Ask whether the player could have steered away. A situation's option is chosen, so the seed it plants is
// āgāmi. Its fuse is in years lived, the game's clock: when the years pass at + fuse it ripens into prārabdha, released
// from the store and not yet in fruit. The omen is never steerable, so it fires only prārabdha: a roll of 6, the world's
// face, never a 1, which is the threshold face (REDESIGN.md §5). Whether a 6 becomes a reckoning is a chance that rises
// toward the exit, drawn from a sequence of its own seeded by the game, so the dice are never touched. How much it costs
// is the ledger's alone: no second die. The dice decide when; the choices decide how much.
//
// Pure, so the page, tools/sim.mjs and the tests run it alike. The Jain charts' sattā, udīraṇā and uday (karma held,
// stirred to ripen, in fruit) are the same three steps; the scholar layer names both (src/render/ledger.js).
import { GOAL, SITUATIONS, SNAKES } from "../content.js";
import { makeRng, next } from "../rng.js";
import { tIn, fill, castFill, wordsIn } from "../i18n.js";
import { SPAN } from "./self.js";

export const freshKarma = () => ({ sancita: [], agami: [], prarabdha: [] });
// a game saved before Phase 12 has no ledger yet, and starts an empty one
export const karmaOf = p => p.karma ?? freshKarma();

// The seed an option plants, as content writes it ({ fuse, weight, holds, debt, reckoning }), or null.
export const seedOf = (n, id) => SITUATIONS[n]?.options?.find(o => o.id === id)?.seed ?? null;
// What a choice on square n plants, at the years it was made.
export const plantOf = (n, o, years) => (o?.seed ? { src: n, opt: o.id, at: years, fuse: o.seed.fuse, weight: o.seed.weight } : null);

// Every seed a life is carrying and has not yet met: made, and ripe.
export const carried = k => [...k.agami, ...k.prarabdha];
// The seeds whose fuse has run out by these years move from āgāmi to prārabdha, oldest first.
export function ripen(k, years) {
  const due = k.agami.filter(s => years >= s.at + s.fuse);
  return due.length ? { ...k, agami: k.agami.filter(s => !due.includes(s)), prarabdha: [...k.prarabdha, ...due] } : k;
}

// ---- The omen ----
export const OMEN = 6;
// Where the floor can open: on earth, and at the door. Not in the heavens, where the years stand still and the debts wait.
export const omenGround = pos => (pos >= 1 && pos <= 100) || pos === GOAL;
// The chance that a 6 is the omen, rising toward the exit: a tenth at birth, nine tenths at the door.
export const omenChance = pos => 0.1 + 0.8 * (Math.min(Math.max(pos, 0), GOAL) / GOAL) ** 2;
// The omen's own draw for player idx on the turn after `lived` squares of their life: never the game's dice.
export const omenDraw = (state, idx, lived) =>
  next(makeRng((state.rng.seed ^ 0x27d4eb2f ^ Math.imul(idx + 1, 0x165667b1) ^ Math.imul(lived + 1, 0x9e3779b1)) >>> 0));

// ---- Severity: the ledger's, and only the ledger's ----
// L is the weight of what fires plus half the weight of everything else still carried; S grows faster than L. The tiers
// begin at these S: 1 years lost, 2 a holding added, 3 sent back down the board as the vice it holds would send them
// (that snake's length, never below the square the debt was made on), 4 death. Below the first the
// floor only seems to open: a near-empty ledger walks away nearly untouched, which is what it earned.
export const SEVERITY_POW = 1.6;
export const TIERS = [2, 5, 9, 15];
export const DEATH = 4;
export function severityOf(fired, rest) {
  const w = xs => xs.reduce((a, s) => a + s.weight, 0);
  return (w(fired) + w(rest) / 2) ** SEVERITY_POW;
}
export const tierOf = S => TIERS.filter(t => S >= t).length;

// What the omen does on this turn, or null when there is no omen to speak of: { chance, fired, reckon }. pos is where the
// player stands once the move is made, years their years by then, dice everything rolled. force (mp.fire) fires it on
// whatever was rolled, ripening the oldest debt first if nothing is ripe.
export function omenFor(state, idx, { dice, pos, years, lived, force = false }) {
  const p = state.players[idx];
  let k = karmaOf(p);
  if (force && !k.prarabdha.length && k.agami.length) k = { ...k, agami: k.agami.slice(1), prarabdha: [k.agami[0]] };
  if (!k.prarabdha.length || !omenGround(pos)) return null;
  if (!force && !dice.includes(OMEN)) return null;
  const chance = omenChance(pos), fired = force || omenDraw(state, idx, lived) < chance;
  if (!fired) return { chance, fired: false, reckon: null };
  return { chance, fired: true, reckon: reckonOf(k, { pos, years }) };
}

// The reckoning itself: the oldest ripe debt, and any other ripe debt from the same choice, against the whole ledger.
export function reckonOf(k, { pos, years }) {
  const first = k.prarabdha[0], fired = k.prarabdha.filter(s => s.src === first.src && s.opt === first.opt);
  const rest = carried(k).filter(s => !fired.includes(s));
  const S = severityOf(fired, rest), tier = tierOf(S), wouldDie = tier >= DEATH, applied = Math.min(tier, DEATH - 1);
  // until Phase 15 the death tier only reports: what it would have been, then the tier below it
  const lost = applied >= 1 ? Math.min(Math.ceil(S), Math.max(0, Math.floor(SPAN - years))) : 0;
  const vice = seedOf(first.src, first.opt)?.holds ?? null, holds = applied >= 2 ? vice : null;
  // the vice's snake again, in effect: down by its length, as far as the square the debt was made on and no further
  const drop = SNAKES[vice] ? vice - SNAKES[vice].to : 0, back = Math.max(first.src, pos - drop);
  const to = applied >= 3 && back < pos ? back : null;
  return { src: first.src, opt: first.opt, planted: first.at, seeds: fired, S, tier, applied, wouldDie, years: lost, holds, to, age: years };
}

// ---- The gate at 105 (§2.3) ----
// Reaching the exit is necessary and not sufficient. Until Phase 14 turns this into the examination, the door refuses a
// life still carrying any debt it has not met, or still holding on hard to what it earned or wanted. The reason is
// said in words: which debts, or which holding on. Never a number.
export const ATTACHED = 75;
export function refusalOf(p) {
  const debts = carried(karmaOf(p));
  if (debts.length) return { debts: debts.map(({ src, opt, at }) => ({ src, opt, at })) };
  const a = p.aims ?? {};
  if ((a.artha ?? 0) >= ATTACHED) return { aim: "artha" };
  if ((a.kama ?? 0) >= ATTACHED) return { aim: "kama" };
  return null;
}

// ---- In words: what the card, the account and the scholar's panel say. Never a number of the ledger's. ----
// who is { name, gender } in language l. A debt names the age it was made at, {at}, in words.
const sayIn = (l, text, at, who) => fill(text.replaceAll("{at}", wordsIn(l, Math.floor(at ?? 0))), who);
const T = (l, key, who, v = {}) => fill(tIn(l, key, { name: who.name, ...v }), who);
// The debt a seed is, as a phrase: "the sea Meera described to the class at ten".
export function debtIn(l, { src, opt, at }, who) {
  const t = seedOf(src, opt)?.debt;
  return t ? sayIn(l, t[l] || t.en, at, who) : "";
}
// What came due, as content tells it.
export function reckoningIn(l, rk, who) {
  const t = seedOf(rk.src, rk.opt)?.reckoning;
  return t ? sayIn(l, t[l] || t.en, rk.planted, who) : "";
}
// The reckoning's card, line by line: the floor, what came due, where it came from, and what it took, in that order.
// The floor always seems to open; what follows scales.
export function reckonLinesIn(l, rk, who) {
  const out = [T(l, "reckonFloor", who), reckoningIn(l, rk, who), T(l, "reckonFrom", who, { src: rk.src, debt: debtIn(l, { src: rk.src, opt: rk.opt, at: rk.planted }, who) })];
  if (!rk.applied) out.push(T(l, "reckonNone", who));
  if (rk.years) out.push(rk.years === 1 ? T(l, "reckonYear", who) : T(l, "reckonYears", who, { years: wordsIn(l, rk.years) }));
  const held = rk.holds && SNAKES[rk.holds]?.holding;
  if (held) out.push(T(l, "reckonHeld", who, { holding: castFill(held[l] || held.en) }));
  if (rk.to) out.push(T(l, "reckonBack", who, { to: rk.to }));
  return out;
}
// Why the door did not open, in one sentence, and what it means for the next throw.
export function refusalIn(l, refusal, who) {
  if (!refusal) return [];
  if (refusal.aim) return [T(l, refusal.aim === "artha" ? "doorArtha" : "doorKama", who), T(l, "doorOn", who)];
  const ds = refusal.debts.map(d => debtIn(l, d, who)), and = tIn(l, "listAnd");
  const debts = ds.length > 1 ? ds.slice(0, -1).join(", ") + and + ds.at(-1) : ds[0];
  return [T(l, "doorRefused", who, { debts }), T(l, "doorOn", who)];
}
