import test from "node:test";
import assert from "node:assert/strict";
import { GOAL, SITUATIONS } from "../src/content.js";
import { createGame, planTurn, playTurn, resolveChoice, endTurn } from "../src/engine/turn.js";
import { freshKarma, ripen, omenFor, omenChance, reckonOf, severityOf, tierOf, refusalOf, reckonLinesIn, DEATH, TIERS } from "../src/engine/karma.js";
import { lifeText } from "../src/engine/account.js";

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

test("the death tier is recorded and does not kill", () => {
  const heavy = Array.from({ length: 8 }, (_, i) => seed(59, "strike", 20 + i, 10, 3));
  const k = { sancita: [], agami: [], prarabdha: heavy };
  const rk = reckonOf(k, { pos: 80, years: 60 });
  assert.ok(rk.S >= TIERS[DEATH - 1]);
  assert.equal(rk.wouldDie, true);
  assert.equal(rk.applied, DEATH - 1);
  const s = game(78, 60), p = s.players[0];
  p.karma = k;
  s.forceOmen = true;
  const plan = playTurn(s, 2);
  assert.equal(plan.reckon.wouldDie, true);
  assert.ok(!p.dead);
  assert.equal(plan.died, false);
  assert.ok(p.pos < 80);
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

test("a life refused at the door that throws on past the heavens closes on the door", () => {
  const s = game(103, 80), p = s.players[0];
  p.karma = { ...freshKarma(), agami: [seed(55, "keep", 30)] };
  p.life = [103];
  playTurn(s, [2, 1], () => 2);
  playTurn(s, [6, 6], () => 6);
  assert.equal(p.fell, true);
  assert.equal(p.fellFrom, GOAL);
  assert.equal(p.pos, 0);
  // the debt it never met is carried into the store
  assert.equal(p.karma.sancita.length, 1);
  const text = lifeText(s, 0, "en");
  assert.match(text, /came as far as the door, and it did not open/);
});
