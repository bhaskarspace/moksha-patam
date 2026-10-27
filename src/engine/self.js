// ---- Life state (REDESIGN.md Phase 8) ----
// Who the player is, as opposed to where the token is: years lived, the guna mix, the three aims, and in
// sannyasa the bhumika they are actually in. Pure, so tools/sim.mjs and the tests run it in node.
import { ASHRAMAS, LADDERS, SNAKES, GOAL, squareOf } from "../content.js";

const EARTH = 100;
// Ground where years pass by the square and a year can be sat out: earth, and the door at 105 for a life it has refused
// (REDESIGN.md Phase 12). The heavens above it are not ground.
const ground = n => n <= EARTH || n === GOAL;
// The years a life has. Measured (REDESIGN.md Phase 8): a life with no snakes reaches square 100 at 90, so
// only a life the snakes sent back over its own ground can outrun it.
export let SPAN = 110;
// tools/sim.mjs sweeps it; nothing in the game changes it
export const setSpan = n => { SPAN = n; };

// The authored age of square n (docs/NARRATIVE.md §5), or null above the world.
export const ageOf = n => (n >= 1 && n <= EARTH ? squareOf(n)?.age ?? null : null);

// ---- Years lived ----
// One clock, and it is the authored table: ahead of your own years, the square says how old you are. Walking
// ground already lived (after a snake) costs a year a turn, as a cycle is about a year (§2.1). A snake takes
// no time and refunds none: the moment it lands on happens the same year as the vice. A ladder is one turn,
// so its foot and its top share that turn's year unless the top is older still.
export const ageStep = (years, n) => { const a = ageOf(n); return a == null ? years : a >= years ? a : years + 1; };

// Each square of a life with the years lived there and how it was reached: "snake" or "ladder" for the
// square a snake or ladder led to, otherwise null. A landing on a snake's head or a ladder's foot is always
// followed by where it led. (Until Phase 12 the fall from Brahma was a snake to a new birth, "rebirth"; the fall
// now ends the life instead, and is never in it.)
// Phase 12 adds "reckon": the square a reckoning sent the life back to, the square its debt was made on, told "reckon";
// it is reached as a snake's tail is, taking no time. Each entry also carries i, its place in the life.
// A square of earth landed on twice running is a year sat out (Phase 9): no move on earth lands where it began,
// since only a bounce off the top of the board can. Its via is "sit".
// With the record of what each square told (Phase 10, src/engine/turn.js toldOn), each entry carries it as told:
// null for the square's own moment. A record that does not match the life one for one is not used. A year a
// situation's choice cost is the square again, told "stay": it passes like a year sat out, but it is not practice,
// and its via is "stay".
export function yearsAlong(life, told = []) {
  const out = [], toldAt = told.length === life.length ? i => told[i] ?? null : () => null;
  let years = 0;
  for (const [i, n] of life.entries()) {
    const from = life[i - 1], sn = SNAKES[from], ld = LADDERS[from];
    const via = toldAt(i) === "reckon" ? "reckon" : sn && sn.to === n ? "snake" : ld && ld.to === n ? "ladder" : from === n && ground(n) ? (toldAt(i) === "stay" ? "stay" : "sit") : null;
    if (via === "sit" || via === "stay") years += 1;
    else if (via === "reckon") { /* no time: the years it took follow as stays */ }
    else if (via === "ladder") years = Math.max(years, ageOf(n) ?? years);
    else if (via !== "snake") years = ageStep(years, n);
    out.push({ n, years, via, from: via && via !== "sit" && via !== "stay" ? from : null, told: toldAt(i), i });
  }
  return out;
}
// The years a life had when it landed where it stands: its years now, less the years a choice or a reckoning cost there
// afterwards, which are the square again told "stay" (yearsAlong). A situation's outcome is said at these, the age of
// choosing, as the account says it; never younger than the square, since only a token moved by hand can be.
export function landedYears(p) {
  const life = p.life || [], told = p.told || [];
  let k = life.length - 1, stays = 0;
  if (told.length === life.length) while (k > 0 && told[k] === "stay") { k--; stays++; }
  return Math.max((p.years ?? 0) - stays, ageOf(life[k]) ?? 0);
}
// What a turn does to the years: the square landed on, the years a choice there cost, then where a snake or ladder led,
// and last the years a reckoning took (REDESIGN.md Phase 12).
export function turnYears(years, plan) {
  const lost = plan.reckon?.years ?? 0;
  if (plan.sit) return years + 1 + lost;
  const y = ageStep(years, plan.target) + (plan.cost ?? 0);
  return (plan.jump?.kind === "ladder" ? Math.max(y, ageOf(plan.jump.to) ?? y) : y) + lost;
}

// ---- Stage of life, by years rather than by square ----
// The ashrama bands keep their squares (1–20, 21–40 …); a life is in a band once it is older than the last
// square of the band before. With no snakes this is exactly the square's band.
const BOUNDS = ASHRAMAS.slice(0, 5).map(([max]) => ageOf(max));
// An ASHRAMAS index: 0 childhood … 4 sannyasa, 5 above the world.
export const stageOfYears = y => { const i = BOUNDS.findIndex(b => y <= b); return i < 0 ? 4 : i; };
export const stageOfPlayer = p => (p.pos > EARTH && p.pos !== GOAL ? 5 : stageOfYears(p.years ?? ageOf(Math.max(p.pos, 1))));
export const SANNYASA = 4;

// ---- The gunas (§2.2) ----
// Sattva, rajas and tamas sum to 1. They move only on the vices and virtues, each tagged with the guna the
// Gita gives it (content/squares.json "guna"): a landing mixes a quarter of that guna in.
export const GUNA_W = 0.25;
export const freshGunas = () => ({ s: 1 / 3, r: 1 / 3, t: 1 / 3 });
export function mixGuna(g, k, w = GUNA_W) {
  const out = {};
  for (const x of ["s", "r", "t"]) out[x] = (1 - w) * g[x] + (x === k ? w : 0);
  return out;
}

// ---- The aims: dharma, artha, kama, 0 to 100 (§2.2). Moksha is deliberately not a meter. ----
export const freshAims = () => ({ dharma: 30, artha: 30, kama: 30 });
// What each stage does to the aims every turn, and which way they may move (§2.4): brahmacharya refuses
// artha, the householder works and supports others, vanaprastha can only give away, sannyasa is still.
export const STAGE_RULES = [
  { drift: { kama: 1 }, refuse: [] },
  { drift: { dharma: 1 }, refuse: ["artha"] },
  { drift: { artha: 1, kama: 1 }, refuse: [] },
  { drift: { artha: -2, kama: -2 }, refuse: ["dharma", "artha", "kama"] },
  { drift: {}, frozen: true },
  { drift: {}, frozen: true },
];
const clamp = x => Math.max(0, Math.min(100, x));
export function applyAims(aims, deltas, stage) {
  const rule = STAGE_RULES[stage], out = { ...aims };
  if (rule.frozen) return out;
  for (const [k, d] of Object.entries(deltas || {})) if (d && !(d > 0 && rule.refuse.includes(k))) out[k] = clamp(out[k] + d);
  return out;
}

// The action slots of each stage (§2.4). Phase 9 offers one of them beyond moving: a sannyasin's spare die is
// practice. The rest wait for choices whose consequences can be seen (REDESIGN.md Phase 9).
export const SLOTS = [
  ["move"],
  ["move", "study", "serve"],
  ["move", "study", "serve", "give", "practice"],
  ["move", "give", "practice"],
  ["move", "practice"],
  ["move"],
];
export const slotsFor = p => SLOTS[stageOfPlayer(p)];

// ---- Practice (REDESIGN.md Phase 9) ----
// A die a sannyasin does not move by is spent sitting still: it mixes sattva in, by its face. Only in sannyasa,
// and only on earth. tools/sim.mjs --practice=off sets it to nothing, to show what the dice do alone.
export let PRACTICE_W = 0.02;
export const setPractice = w => { PRACTICE_W = w; };
export const practise = (g, pips) => (pips > 0 ? mixGuna(g, "s", Math.min(1, PRACTICE_W * pips)) : g);

// ---- The jnana-bhumikas (Varaha Upanishad 4) ----
// The sannyasin's state, set by the guna mix rather than by square. Thresholds are on the sattva share and are
// calibrated in tools/sim.mjs. The seventh, turya, also asks that the life has practised: dice alone can bring
// the sattva share that high, rarely, and the stage is not for them (REDESIGN.md Phase 8).
export const BHUMIKA_AT = [0, 0.43, 0.52, 0.6, 0.67, 0.74, 0.8];
export const TURYA = 6;
export const bhumikaOf = (g, practised = 0) => Math.min(BHUMIKA_AT.findLastIndex(x => g.s >= x), practised > 0 ? TURYA : TURYA - 1);
// The title the Varaha text gives each stage: mumukshu through the first three, then by name.
export const titleOf = b => (b == null ? null : b < 3 ? 0 : b - 2);

// What a turn does to who the player is, after it has moved them. Returns the new fields.
export function grow(p, plan) {
  // a game saved before Phase 8 has none of this yet, and starts it fresh
  const years = turnYears(p.years ?? 0, plan);
  let gunas = p.gunas ?? freshGunas(), aims = p.aims ?? freshAims(), practised = p.practised ?? 0;
  const onGround = plan.final <= EARTH || (plan.final === GOAL && !plan.win);
  if (onGround) {
    const stage = stageOfYears(years), sl = LADDERS[plan.target] || SNAKES[plan.target];
    // a choice carries its own guna and aims (REDESIGN.md Phase 10); otherwise the vice or virtue taken does
    const mark = plan.mark ?? (plan.jump && sl?.guna ? sl : null);
    if (mark?.guna) { gunas = mixGuna(gunas, mark.guna); aims = applyAims(aims, mark.aims, stage); }
    aims = applyAims(aims, STAGE_RULES[stage].drift, stage);
  }
  const sannyasin = onGround && stageOfYears(years) === SANNYASA;
  // the dice not moved by, spent on practice; a win has left the world, and needs none
  const spare = sannyasin && !plan.win && PRACTICE_W > 0 ? plan.spare ?? [] : [];
  for (const d of spare) gunas = practise(gunas, d);
  practised += spare.length;
  const bhumika = sannyasin ? bhumikaOf(gunas, practised) : null;
  const peak = bhumika == null ? p.peak ?? null : Math.max(p.peak ?? -1, bhumika);
  return { years, gunas, aims, practised, bhumika, peak };
}

// The vice a life was still holding when it ended, by its years or by the fall: the snake it took most often, the
// latest on a tie. held is what reckonings added (REDESIGN.md Phase 12), each counted as the snake taken once more.
export function holdingOf(life, held = []) {
  const vices = [...yearsAlong(life).filter(e => e.via === "snake").map(e => e.from), ...(held ?? [])];
  const count = new Map();
  for (const v of vices) count.set(v, (count.get(v) || 0) + 1);
  let best = null;
  for (const v of vices) if (count.get(v) >= (count.get(best) || 0)) best = v;
  return best;
}
