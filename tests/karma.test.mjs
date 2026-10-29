import test from "node:test";
import assert from "node:assert/strict";
import { GOAL, TOP, SITUATIONS } from "../src/content.js";
import { createGame, planTurn, playTurn, resolveChoice, endTurn, moveFor } from "../src/engine/turn.js";
import { freshKarma, ripen, omenFor, omenChance, reckonOf, severityOf, tierOf, refusalOf, reckonLinesIn, DEATH, TIERS, answerOf, questionOf, examLinesIn, carried, karmaOf, setDeath, deathFormOf, examineOf, debtsIn } from "../src/engine/karma.js";
const carriedOf = p => carried(karmaOf(p));
import { lifeText, lifeOf } from "../src/engine/account.js";
import { firstLives } from "./lives.mjs";
import { pnameIn } from "../src/state.js";

// A fixture situation on square 20, which has none of its own, planting a debt with a short fuse (REDESIGN.md Phase 12).
const FIXTURE = {
  prompt: { en: "{name} is {age}.", hi: "{name} {age} बरस {का|की} है।" },
  options: [
    { id: "fx", label: { en: "Take it", hi: "ले लो" }, move: "here", cost: 0, guna: "r", aims: { dharma: -5 },
      seed: { fuse: 5, weight: 2, holds: 55, debt: { en: "the thing taken at {at}", hi: "{at} बरस की उम्र में ली गई चीज़" },
        reckoning: { en: "{name} remembers the thing taken.", hi: "{name} को ली गई चीज़ याद आती है।" } } },
    { id: "ok", label: { en: "Leave it", hi: "छोड़ दो" }, move: "here", cost: 0, guna: "s", aims: { dharma: 5 } },
  ],
};
const withFixture = fn => () => { SITUATIONS[20] = FIXTURE; try { fn(); } finally { delete SITUATIONS[20]; } };
const game = (pos = 0, years = 0) => {
  const s = createGame({ players: [{ name: "Asha", type: "human", gender: "f" }], rules: { six: false }, seed: 4 });
  Object.assign(s.players[0], { pos, years });
  return s;
};
const seed = (src, opt, at, fuse = 10, weight = 1) => ({ src, opt, at, fuse, weight });
const who = { name: "Asha", gender: "f" };

test("a seed planted on 20 ripens at its years, waits through rolls without a 6, and fires on a 6 naming 20", withFixture(() => {
  const s = game(18, 10), p = s.players[0];
  playTurn(s, 2, undefined, () => "fx");
  assert.equal(p.pos, 20);
  assert.equal(p.karma.agami.length, 1);
  const planted = p.karma.agami[0];
  assert.deepEqual({ src: planted.src, opt: planted.opt, fuse: planted.fuse }, { src: 20, opt: "fx", fuse: 5 });
  // not ripe before at + fuse, ripe from then on
  assert.equal(ripen(p.karma, planted.at + planted.fuse - 0.5).prarabdha.length, 0);
  assert.equal(ripen(p.karma, planted.at + planted.fuse).prarabdha.length, 1);
  // walk on with no 6 until it ripens, and on past it: never a reckoning
  for (let i = 0; i < 12; i++) {
    const plan = playTurn(s, [1, 2, 3, 4, 5][i % 5]);
    assert.equal(plan.reckon, null);
  }
  assert.ok(p.years >= planted.at + planted.fuse);
  // (the walk may meet other situations and plant debts of their own; the one from 20 is ripe)
  assert.equal(p.karma.prarabdha.filter(x => x.src === 20).length, 1);
  // a 6: some draw on some turn fires it, and the card names square 20
  let fired = null;
  for (let lived = 0; lived < 200 && !fired; lived++) fired = omenFor(s, 0, { dice: [6], pos: p.pos, years: p.years, lived })?.reckon;
  assert.ok(fired);
  assert.equal(fired.src, 20);
  for (const l of ["en", "hi"]) assert.ok(reckonLinesIn(l, fired, who).some(x => x.includes(l === "hi" ? "२०" : "20")), l);
}));

test("a forced reckoning is met: it leaves the ledger and is recorded where it was met", withFixture(() => {
  const s = game(18, 10), p = s.players[0];
  playTurn(s, 2, undefined, () => "fx");
  s.forceOmen = true;
  const plan = playTurn(s, 3);
  assert.equal(plan.reckon.src, 20);
  assert.equal(p.karma.agami.length + p.karma.prarabdha.length, 0);
  assert.equal(p.reckonings.length, 1);
  assert.equal(s.forceOmen, undefined);
  assert.ok(s.log.some(e => e.k === "lReckon" && e.v.src === 20));
}));

test("a reckoning on a 6 takes the throw the 6 would have given: the turn passes", withFixture(() => {
  const s = createGame({ players: [{ name: "Asha", type: "human", gender: "f" }, { name: "", type: "cpu" }], rules: { six: true }, seed: 4 });
  Object.assign(s.players[0], { pos: 18, years: 10 });
  playTurn(s, 2, undefined, () => "fx");
  s.turn = 0;
  s.forceOmen = true;
  const plan = playTurn(s, 6);
  assert.ok(plan.reckon);
  assert.equal(plan.again, false);
  assert.ok(!plan.end.some(e => e.k === "lSix"));
  assert.equal(s.turn, 1);
}));

test("the omen's chance rises all the way to the door", () => {
  for (let pos = 1; pos < GOAL; pos++) assert.ok(omenChance(pos + 1) > omenChance(pos), `${pos}`);
  assert.ok(omenChance(1) >= 0.1 && omenChance(GOAL) <= 0.9 + 1e-9);
});

test("severity is the ledger's alone: the same ledger, the same reckoning", () => {
  const k = { sancita: [], agami: [seed(12, "lie", 7)], prarabdha: [seed(59, "strike", 30, 10, 3), seed(55, "keep", 32, 15, 2)] };
  const a = reckonOf(k, { pos: 70, years: 50 }), b = reckonOf(structuredClone(k), { pos: 70, years: 50 });
  assert.deepEqual(a, b);
  assert.equal(a.S, severityOf([k.prarabdha[0]], [k.agami[0], k.prarabdha[1]]));
  assert.equal(a.S, (3 + 3 / 2) ** 1.6);
  assert.equal(a.tier, tierOf(a.S));
  // a heavier ledger never costs less
  for (let w = 1; w < 12; w++) assert.ok(severityOf([seed(1, "x", 0, 1, 1)], Array(w + 1).fill(seed(2, "y", 0, 1, 1))) > severityOf([seed(1, "x", 0, 1, 1)], Array(w).fill(seed(2, "y", 0, 1, 1))));
});

// REDESIGN.md Phase 16: the top tier is death. The ledger decides; the six says when; the age says how, never the vice.
const heavy = () => ({ sancita: [], agami: [], prarabdha: Array.from({ length: 8 }, (_, i) => seed(59, "strike", 20 + i, 10, 3)) });
test("the death tier kills: the life ends where it stands, and the debt that came due is not met", () => {
  const rk = reckonOf(heavy(), { pos: 80, years: 60 });
  assert.ok(rk.S >= TIERS[DEATH - 1] && rk.wouldDie && rk.dies);
  assert.deepEqual([rk.applied, rk.years, rk.holds, rk.to, rk.form], [DEATH, 0, null, null, "calamity"]);
  const s = game(78, 60), p = s.players[0];
  p.karma = heavy();
  s.forceOmen = true;
  const plan = playTurn(s, 2);
  assert.ok(plan.died && p.dead && s.over && s.winner == null);
  assert.equal(p.pos, 80);
  assert.deepEqual(p.death, { by: "ledger", form: "calamity", age: p.years, src: 59, opt: "strike" });
  assert.deepEqual(s.log.slice(0, 2).map(e => e.k), ["lDiedLedger", "lReckon"]);
  // dying of it did not pay it: every debt goes into the store, the one that came due among them
  assert.equal(p.karma.sancita.length, 8);
  // the card says the floor closes, and how, and never a number
  for (const l of ["en", "hi"]) assert.doesNotMatch(reckonLinesIn(l, plan.reckon, who).at(-1), /[0-9]/, l);
  assert.match(reckonLinesIn("en", plan.reckon, who).join(" "), /does not open\. It closes[\s\S]*Asha dies at sixty-eight, in a bad year/);
  // the account ends on how, then on what the life still carried, in the door's words
  const a = lifeOf(s, 0, "en");
  assert.match(a.open, /^Asha died at sixty-eight\.$/);
  assert.match(a.end, /^Asha died at sixty-eight, in a bad year, when the rains did not come and the grain ran out, still carrying /);
  assert.doesNotMatch(lifeOf(s, 0, "hi").end, /\{|\}/);
});

test("the form of a death is the age's and the stage's, never the vice's", () => {
  // by the squares' ages, not decades: vānaprastha is 51–68, so the death at 71 Bhaskar saw is a sannyāsin's, of illness
  assert.deepEqual([20, 45, 50, 51, 68, 69, 71, 95].map(deathFormOf), ["accident", "accident", "accident", "calamity", "calamity", "illness", "illness", "illness"]);
  // the same ledger, the same tier, at three ages: three forms
  const forms = [40, 60, 80].map(years => reckonOf(heavy(), { pos: 80, years }).form);
  assert.deepEqual(forms, ["accident", "calamity", "illness"]);
});

test("--death=off reports the tier only, as before Phase 16", () => {
  setDeath(false);
  try {
    const rk = reckonOf(heavy(), { pos: 80, years: 60 });
    assert.ok(rk.wouldDie && !rk.dies && rk.applied === DEATH - 1);
    const s = game(78, 60), p = s.players[0];
    p.karma = heavy();
    s.forceOmen = true;
    const plan = playTurn(s, 2);
    assert.ok(!plan.died && !p.dead && p.pos < 80);
  } finally { setDeath(true); }
});

test("the door refuses a debt, keeps the player on 105, and says why in words", () => {
  const s = game(103, 80), p = s.players[0];
  p.karma = { ...freshKarma(), agami: [seed(55, "keep", 30)] };
  const plan = playTurn(s, [2, 1], () => 2);
  assert.equal(plan.win, false);
  assert.ok(plan.refused.debts.length);
  assert.equal(p.pos, GOAL);
  assert.equal(s.winner ?? null, null);
  assert.ok(p.door);
  // holding on hard to what was earned also keeps it shut; a clean, unattached life walks through
  assert.deepEqual(refusalOf({ karma: freshKarma(), aims: { artha: 80, kama: 0, dharma: 0 } }), { aim: "artha" });
  assert.equal(refusalOf({ karma: freshKarma(), aims: { artha: 10, kama: 10, dharma: 50 } }), null);
});

test("a life refused at the door that goes on into the heavens closes on what the door named", () => {
  const s = game(103, 80), p = s.players[0];
  p.karma = { ...freshKarma(), agami: [seed(55, "keep", 30)] };
  p.life = [103];
  playTurn(s, [2, 1], () => 2);
  // a double six at the door goes nowhere (Phase 17): it stays there, refused
  const stay = playTurn(s, [6, 6], () => 6);
  assert.ok(stay.stay && p.pos === GOAL && p.door);
  playTurn(s, [5, 6], () => 5);
  const was = p.past[0];
  assert.ok(was.fell && was.fellFrom === TOP && was.pos === 0);
  // the debt it never met is carried into the store
  assert.equal(was.karma.sancita.length, 1);
  const text = lifeText(firstLives(s), 0, "en");
  assert.match(text, /rose as far as the realm of Shiva/);
  assert.ok(text.includes(debtsIn("en", was.karma.sancita, { name: pnameIn(was, "en"), gender: was.gender })), text);
});

// ---- Phase 14: the door is an examination ----
// A sannyāsin of ninety refused at the door for one debt, sitting there by the dice [a, b] and moving by neither.
const atDoor = (debts, life = [103]) => {
  const s = game(103, 88), p = s.players[0];
  p.karma = { ...freshKarma(), agami: debts };
  p.life = [...life];
  p.told = life.map(() => null);
  playTurn(s, [2, 1], () => 2);
  assert.ok(p.door && p.pos === GOAL);
  return s;
};
const sit = s => playTurn(s, [3, 4], () => 0);

test("the book answers a debt when the life climbed its healing ladder after it was planted", () => {
  // the hand that fell, at 48 (59 strike holds anger), and then Compassion, 51 → 67, climbed at 37 in the authored ages
  const anger = { src: 59, opt: "strike", at: 48, fuse: 10, weight: 3, i: 1 };
  assert.ok(answerOf({ life: [58, 59, 50, 51, 67], told: [] }, anger), "a climb after it answers");
  assert.equal(answerOf({ life: [51, 67, 59, 50], told: [] }, { ...anger, i: 2 }), null, "a climb before it does not");
  assert.equal(answerOf({ life: [58, 59, 50], told: [] }, anger), null);
  // a seed planted before Phase 14 has no place, and goes by the years
  assert.ok(answerOf({ life: [58, 59, 50, 51, 67], told: [] }, { ...anger, i: undefined, at: 30 }));
  // every vice a debt holds has a question and a ladder that heals it
  for (const sit of Object.values(SITUATIONS)) for (const o of sit.options) if (o.seed) assert.ok(questionOf({ src: Object.keys(SITUATIONS).find(k => SITUATIONS[k] === sit), opt: o.id })?.heals, o.id);
});

test("a year at the door is one question: a pass meets the debt, a fail is paid in penance, two years a weight, then the door opens", () => {
  // two debts: anger, answered by the climb after it; greed, weight 2, never answered
  const s = atDoor([{ ...seed(59, "strike", 48, 10, 3), i: 1 }, { ...seed(55, "keep", 60, 15, 2), i: 4 }], [58, 59, 50, 51, 67, 103]), p = s.players[0];
  const one = sit(s);
  assert.ok(one.exam.pass && one.exam.cleared && one.exam.src === 59 && !one.win);
  assert.ok(examLinesIn("en", one.exam, who).some(t => /sat up all night/.test(t)), "the pass names the climb");
  const two = sit(s);
  assert.ok(!two.exam.pass && !two.exam.cleared && two.exam.src === 55 && !two.win);
  // weight 2: four years of penance in all (Phase 16)
  const three = sit(s), four = sit(s);
  assert.ok(!three.exam.cleared && !four.win);
  const five = sit(s);
  assert.ok(five.exam.cleared && five.exam.n === 4 && five.win);
  assert.equal(s.winner, 0);
  assert.deepEqual(p.sittings.map(x => [x.src, x.pass, x.cleared]), [[59, true, true], [55, false, false], [55, false, false], [55, false, false], [55, false, true]]);
  assert.equal(carriedOf(p).length, 0);
  // never a number of the ledger's on what the player reads
  for (const pl of [one, two, three, five]) for (const l of ["en", "hi"]) assert.ok(!examLinesIn(l, pl.exam, who).some(t => /\b(weight|fuse)\b|[0-9]/.test(t)), l);
  const text = lifeText(s, 0, "en");
  assert.match(text, /at the door, Asha was asked: Which enemy cannot be conquered\? The book had the answer/);
});

test("a life whose years run out at the door dies there, closing on what it still owed", () => {
  const s = atDoor([seed(55, "keep", 60, 15, 3)]), p = s.players[0];
  p.years = 110;
  const plan = sit(s);
  assert.ok(plan.died && !plan.win && p.dead && p.pos === GOAL);
  assert.equal(s.log[0].k, "lDiedDoor");
  assert.match(lifeOf(s, 0, "en").end, /ran out at a hundred and eleven, sitting at the door, still carrying the extra change pocketed at sixty\.$/);
});

test("a reckoning that meets the last debt while the life sits at the door lets it open on the next year", () => {
  const s = atDoor([seed(55, "keep", 60, 15, 1)]), p = s.players[0];
  p.karma = freshKarma();
  const plan = sit(s);
  assert.ok(plan.win && !plan.exam);
  assert.equal(s.winner, 0);
});

test("the computer sits at a door that has refused it, wherever it may", () => {
  const s = atDoor([seed(55, "keep", 60, 15, 2)]);
  assert.equal(moveFor(s, [3, 4]), 0);
});

// Bhaskar, 27 Oct: a debt of the heaviest weight only the book can answer. No penance pays it, and the door stays shut.
test("a weight-three debt the book does not answer is never paid in penance, and says so", () => {
  const s = atDoor([seed(55, "keep", 60, 15, 3)]), p = s.players[0];
  for (let y = 0; y < 8; y++) {
    const plan = sit(s);
    assert.ok(plan.exam.never && !plan.exam.cleared && !plan.win, `year ${y}`);
  }
  assert.equal(carriedOf(p).length, 1);
  const first = examLinesIn("en", { ...examineOf(p), n: 1 }, who).join(" ");
  assert.match(first, /No penance pays this one: the debt of the extra change pocketed at sixty\. The door stays shut/);
  assert.doesNotMatch(first, /in penance/);
  for (const l of ["en", "hi"]) assert.ok(!examLinesIn(l, examineOf(p), who).some(t => /[0-9]/.test(t)), l);
  assert.match(lifeText(s, 0, "en"), /no penance could pay for the extra change pocketed at sixty/);
  // the computer sits for the first question, and once told, throws on into the heavens
  const c = atDoor([seed(55, "keep", 60, 15, 3)]);
  assert.equal(moveFor(c, [3, 4]), 0);
  sit(c);
  assert.notEqual(moveFor(c, [3, 4]), 0);
  // a weight-three debt the book does answer is met as any other
  const a = atDoor([{ ...seed(59, "strike", 48, 10, 3), i: 1 }], [58, 59, 50, 51, 67, 103]);
  assert.ok(sit(a).win);
});

// Both paths from a door that can never open, for a person: told plainly that they may sit or go on, and either works.
test("at a door that can never open a person is told they may sit on or throw on, and both paths end the life well-formed", () => {
  const told = s => examLinesIn("en", examineOf(s.players[0]), who).join(" ");
  // sitting on: the years pass a question at a time, until they run out at the door, which closes on the debt
  const a = atDoor([seed(59, "strike", 48, 10, 3)]), pa = a.players[0];
  assert.match(told(a), /Asha may sit on here all the same, a year at a time, or throw on into the heavens\./);
  for (const l of ["en", "hi"]) assert.doesNotMatch(examLinesIn(l, examineOf(pa), who).join(" "), /[{}0-9]/, l);
  let plan;
  for (let y = 0; y < 40 && !a.over; y++) plan = sit(a);
  assert.ok(a.over && pa.dead && pa.death.by === "door" && pa.pos === GOAL && plan.exam.never);
  // the last year says no more that the life may sit on
  assert.doesNotMatch(examLinesIn("en", { ...plan.exam, died: true }, who).join(" "), /may sit on/);
  assert.match(lifeOf(a, 0, "en").end, /sitting at the door, still carrying the hand that fell, at forty-eight\.$/);
  // going on: after the question, a die carries the life into the heavens, where the walk goes on to Śiva's snake
  const b = atDoor([seed(59, "strike", 48, 10, 3)]), pb = b.players[0];
  sit(b);
  playTurn(b, [3, 4], () => 3);
  assert.ok(pb.pos === 108 && !b.over && !pb.door);
  playTurn(b, [2, 6], () => 2);
  const was = pb.past?.[0];
  assert.ok(was?.fell && !was.dead && !pb.fell);
  assert.match(lifeOf(firstLives(b), 0, "en").end, /the hand that fell, at forty-eight/);
});
