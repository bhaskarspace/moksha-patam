// Phase 8: life state. Years lived, the end of a life, the gunas and aims, and the bhumika.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn } from "../src/engine/turn.js";
import { LADDERS, SNAKES } from "../src/content.js";
import { SPAN, ageOf, ageStep, yearsAlong, stageOfYears, stageOfPlayer, mixGuna, applyAims, bhumikaOf, titleOf, slotsFor, holdingOf, SANNYASA, BHUMIKA_AT, TURYA, practise, setPractice, PRACTICE_W } from "../src/engine/self.js";

const one = (seed = 1) => createGame({ players: [{ name: "", type: "cpu" }], rules: { six: true }, seed });
const live = seed => { const s = one(seed); while (!s.over) playTurn(s); return s; };

test("years lived are the authored age on any path without a snake", () => {
  // every square in order, then every ladder, never a snake
  const plain = [];
  for (let n = 1; n <= 100; n++) if (!SNAKES[n] && !LADDERS[n] && !Object.values(LADDERS).some(l => l.to === n)) plain.push(n);
  for (const e of yearsAlong(plain)) assert.equal(e.years, ageOf(e.n), `square ${e.n}`);
  for (const [foot, l] of Object.entries(LADDERS)) {
    const along = yearsAlong([+foot, l.to]);
    assert.deepEqual(along.map(e => e.years), [ageOf(+foot), ageOf(l.to)], `ladder ${foot}`);
  }
});

test("a snake takes no time and gives none back; walking old ground costs a year a turn", () => {
  const [head, tail, next] = yearsAlong([99, 61, 64]);
  assert.equal(head.years, 89);
  assert.deepEqual([tail.years, tail.via, tail.from], [89, "snake", 99]);
  assert.equal(next.years, 90);
  assert.equal(ageStep(89, 99), 89);
  assert.equal(ageStep(50, 99), 89);
});

test("within a life the years never go down", () => {
  for (let seed = 1; seed <= 300; seed++) {
    // with what each square told: a reckoning's way back and the years it took are read from it (REDESIGN.md Phase 12)
    const s = live(seed), along = yearsAlong(s.players[0].life, s.players[0].told);
    for (let k = 1; k < along.length; k++) assert.ok(along[k].years >= along[k - 1].years, `seed ${seed}, step ${k}`);
    // the engine's clock and the account's agree
    assert.equal(along.at(-1)?.years ?? 0, s.players[0].years, `seed ${seed}`);
  }
});

test("a life ends when its years run past the span, only on earth, and says what it was still holding", () => {
  let deaths = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const s = live(seed), p = s.players[0];
    if (!p.dead) { assert.ok(s.winner === 0 || p.fell, `seed ${seed}`); continue; }
    deaths++;
    // on earth, or since Phase 14 sitting at the door, which is earth too
    const door = p.pos === 105;
    assert.ok(p.years > SPAN && (p.pos <= 100 || door), `seed ${seed}`);
    assert.equal(s.winner, null);
    assert.ok(s.over);
    assert.equal(s.log[0].k, door ? "lDiedDoor" : "lDied");
    // only a life the snakes sent back over its own ground can die, or one that sat out its years at the door
    assert.ok(SNAKES[p.holding] || door, `seed ${seed} holds ${p.holding}`);
    assert.equal(p.holding, holdingOf(p.life, p.held));
  }
  // since Phase 9's two dice a life rarely dies (2.5% of 20,000), but it still can
  assert.ok(deaths > 4, `${deaths} deaths in 400 lives`);
});

test("the vice held at the end is the one taken most, the latest on a tie", () => {
  assert.equal(holdingOf([59, 50, 55, 43, 59, 50]), 59);
  assert.equal(holdingOf([59, 50, 55, 43]), 55);
  assert.equal(holdingOf([1, 2, 3]), null);
});

test("in a race the dead are passed over, and a game with a person in it ends with them", () => {
  const s = createGame({ players: [{ name: "", type: "human" }, { name: "", type: "cpu" }, { name: "", type: "cpu" }], rules: { six: true }, seed: 5 });
  s.players[1].dead = true;
  s.turn = 0;
  playTurn(s, 2);
  assert.equal(s.turn, 2);
  s.players[0].years = SPAN; s.players[0].pos = 98; s.turn = 0;
  // 98 is 88: walking it again at 110 is a year more than the span
  s.players[0].life = [98];
  const plan = playTurn(s, 1);
  assert.equal(plan.target, 99);
  assert.ok(s.players[0].dead && s.over && s.winner == null);
});

test("the stage of life follows the years, which equal the square's band on an unbroken climb", () => {
  for (let n = 1; n <= 100; n++) assert.equal(stageOfYears(ageOf(n)), Math.floor((n - 1) / 20), `square ${n}`);
  assert.equal(stageOfPlayer({ pos: 61, years: 89 }), SANNYASA);
  assert.equal(stageOfPlayer({ pos: 102, years: 90 }), 5);
});

test("gunas sum to one, and the aims keep each stage's rules", () => {
  let g = { s: 1 / 3, r: 1 / 3, t: 1 / 3 };
  for (const k of ["s", "r", "t", "s", "s"]) g = mixGuna(g, k);
  assert.ok(Math.abs(g.s + g.r + g.t - 1) < 1e-12);
  const a = { dharma: 30, artha: 30, kama: 30 };
  assert.equal(applyAims(a, { artha: 10 }, 1).artha, 30, "brahmacharya refuses artha");
  assert.equal(applyAims(a, { artha: -10 }, 1).artha, 20);
  assert.deepEqual(applyAims(a, { dharma: 10, kama: -10 }, 3), { dharma: 30, artha: 30, kama: 20 }, "vanaprastha only gives away");
  assert.deepEqual(applyAims(a, { dharma: -10 }, 4), a, "sannyasa is still");
  assert.equal(applyAims({ ...a, artha: 95 }, { artha: 10 }, 2).artha, 100);
});

test("every vice and virtue moves the gunas the way the Gita says, and a virtue is sattva", () => {
  for (const l of Object.values(LADDERS)) assert.equal(l.guna, "s");
  assert.equal(SNAKES[59].guna, "r"); // krodha, 3.37
  assert.equal(SNAKES[29].guna, "t"); // alasya, 14.8
});

test("the bhumika is set by the gunas, not by the square; all seven, and the title follows them", () => {
  assert.equal(BHUMIKA_AT.length, 7);
  assert.equal(bhumikaOf({ s: 1 / 3, r: 1 / 3, t: 1 / 3 }), 0);
  // turya asks for practice: the same sattva without it is the sixth
  assert.equal(bhumikaOf({ s: 0.9, r: 0.05, t: 0.05 }), 5);
  assert.equal(bhumikaOf({ s: 0.9, r: 0.05, t: 0.05 }, 1), TURYA);
  assert.equal(bhumikaOf({ s: 0.7, r: 0.15, t: 0.15 }, 3), 4);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(titleOf), [0, 0, 0, 1, 2, 3, 4]);
  // a sannyasin's card names the bhumika they are in: two players on the same square can be in different ones
  const s = one(), p = s.players[0];
  p.pos = 90; p.years = 77; p.life = [90];
  p.gunas = { s: 0.2, r: 0.5, t: 0.3 };
  playTurn(s, 1);
  assert.equal(p.bhumika, 0);
  p.gunas = { s: 0.8, r: 0.1, t: 0.1 }; s.turn = 0;
  playTurn(s, 1);
  assert.equal(p.bhumika, 5);
  assert.equal(p.peak, 5);
});

test("the action slots of each stage are data for Phase 9: a child only moves, a householder can give", () => {
  assert.deepEqual(slotsFor({ pos: 5, years: 1 }), ["move"]);
  assert.ok(slotsFor({ pos: 45, years: 30 }).includes("give"));
  assert.ok(!slotsFor({ pos: 25, years: 14 }).includes("give"));
});

// ---- Phase 9 ----
test("a year sat out is a year: the engine and the account count it alike", () => {
  const [a, b, c] = yearsAlong([95, 95, 95]);
  assert.deepEqual([a.years, b.years, c.years], [83, 84, 85]);
  assert.deepEqual([b.via, b.from], ["sit", null]);
  // above the world the same square twice is a bounce, and no time
  assert.deepEqual(yearsAlong([109, 109]).map(e => e.via), [null, null]);
});

test("practice is the spare die, only in sannyasa, and it moves the gunas toward sattva by its face", () => {
  const g = { s: 0.5, r: 0.25, t: 0.25 };
  assert.ok(practise(g, 6).s > practise(g, 1).s && practise(g, 1).s > g.s);
  assert.deepEqual(practise(g, 0), g);
  const s = one(), p = s.players[0];
  Object.assign(p, { pos: 95, years: 83, life: [95] });
  playTurn(s, [2, 5], () => 2);     // moves by the 2 to 97; the 5 is practice
  assert.equal(p.pos, 97);
  assert.equal(p.practised, 1);
  assert.ok(p.gunas.s > 1 / 3);
  // a householder has no practice, whatever is spare
  const h = one(), q = h.players[0];
  Object.assign(q, { pos: 45, years: 30, life: [45] });
  playTurn(h, [2, 5], () => 2);
  assert.equal(q.practised, 0);
  // and with practice off, as tools/sim.mjs --practice=off runs it, nothing is spent
  const w = PRACTICE_W;
  setPractice(0);
  try { const o = one(), r = o.players[0]; Object.assign(r, { pos: 95, years: 83, life: [95] }); playTurn(o, [2, 5], () => 2); assert.equal(r.practised, 0); }
  finally { setPractice(w); }
});
