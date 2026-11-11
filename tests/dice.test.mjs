// Phase 19 step 3: same dice, two lives. Every throw is keyed by the seed, the lane, the life and the throw it is
// (src/engine/throws.js), so two people who play one seed throw the same dice, throw for throw, whatever they choose,
// whoever sits with them and in whatever seat. setDice("stream") gives back the shared sequence of before.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn, moveFor, movesFor, rollDice, throwDice, gone } from "../src/engine/turn.js";
import { pastOf } from "../src/engine/samskara.js";
import { setDice, laneOf, lanesOf } from "../src/engine/throws.js";
import { setPolicy } from "../src/engine/qbn.js";
import { makeRng } from "../src/rng.js";
import { castOf, nameKey } from "../src/engine/cast.js";
import { lifeText } from "../src/engine/account.js";

const CAP = 3000;
const me = { name: "Meera", type: "human", gender: "f" };
const cpu = { name: "", alias: { en: "Ravi", hi: "रवि" }, type: "cpu", gender: "m" };
// the dice the person threw, by "life.throw", in a game of these seats under a policy and a way of picking
function thrown(seats, seed, { policy = null, pick = moveFor, rules = { six: true } } = {}) {
  setPolicy(policy);
  const s = createGame({ players: seats.map(x => ({ ...x })), rules, seed }), i = seats.indexOf(me), seen = new Map();
  try {
    for (let n = 0; n < CAP && !s.over; n++) {
      const p = s.players[s.turn], mine = s.turn === i, k = `${p.rebirths ?? 0}.${p.thrown ?? 0}`;
      const plan = playTurn(s, undefined, pick);
      if (mine && plan.dice?.length) seen.set(k, plan.dice.join());
    }
  } finally { setPolicy(null); }
  return seen;
}
const firstOnly = (s, d) => movesFor(s, d)[0] ?? null;

test("two policies on one seed throw the same dice, throw for throw, for the same life", () => {
  let compared = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const honest = thrown([me], seed, { policy: "honest" }), dishonest = thrown([me], seed, { policy: "dishonest" });
    const plain = thrown([me], seed), first = thrown([me], seed, { pick: firstOnly });
    // a life's throw k is one die below the endgame and two from it: die 1 is the same either way
    for (const [x, y, w] of [[honest, dishonest, "honest/dishonest"], [plain, first, "plain/first"]]) {
      for (const [k, v] of x) if (y.has(k)) { assert.equal(y.get(k).split(",")[0], v.split(",")[0], `seed ${seed} ${w}: die 1 of throw ${k}`); compared++; }
    }
  }
  assert.ok(compared > 1000, "many throws compared: " + compared);
});

test("the person throws the same dice alone, with a computer, or behind one: a lane is not a seat", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const alone = thrown([me], seed), with1 = thrown([me, { ...cpu }], seed), behind = thrown([{ ...cpu }, me], seed);
    const three = thrown([{ ...cpu }, { ...cpu }, me], seed);
    for (const [other, w] of [[with1, "with a computer"], [behind, "behind a computer"], [three, "third, behind two"]]) {
      let n = 0;
      for (const [k, v] of alone) if (other.has(k)) { assert.equal(other.get(k).split(",")[0], v.split(",")[0], `seed ${seed} ${w}: throw ${k}`); n++; }
      assert.ok(n > 5, `seed ${seed} ${w}: throws in common`);
    }
  }
  assert.deepEqual(lanesOf([cpu, me, cpu, { ...me, name: "Ravi" }]), [2, 0, 3, 1], "people first, in order, then the computers");
});

test("the person's whole life is the same alone or behind a computer: its dice, its omens, its ego, its curse, its cast and its book", () => {
  // each game played until the person's first life has closed, and that life read as it was (src/engine/samskara.js pastOf)
  const first = (seats, seed) => {
    const s = createGame({ players: seats.map(x => ({ ...x })), rules: { six: true, mode: "race" }, seed }), i = seats.indexOf(me);
    for (let n = 0; n < CAP && !s.over && !(s.players[i].rebirths ?? 0); n++) playTurn(s);
    return { st: s.players[i].rebirths ? pastOf(s, i, 0) : s, i, done: !!s.players[i].rebirths || s.winner === i || gone(s.players[i]) };
  };
  let n = 0, same = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const a = first([me], seed), b = first([cpu, me], seed);
    if (!a.done || !b.done) continue;
    n++;
    const pa = a.st.players[a.i], pb = b.st.players[b.i];
    assert.equal(laneOf(b.st, b.i), 0);
    assert.deepEqual(pb.life, pa.life, `seed ${seed}: the same squares`);
    assert.deepEqual(pb.curse ?? null, pa.curse ?? null, `seed ${seed}: the same curse`);
    assert.deepEqual(pb.witness, pa.witness, `seed ${seed}: the same ego`);
    assert.deepEqual(pb.reckonings, pa.reckonings, `seed ${seed}: the same omens`);
    // the cast never borrows a name from anyone at the table, so where a computer's name (now, or in a life before) is one
    // the cast would draw, that member is another; every other member, and the book, are the same
    const atTable = new Set(b.st.players.flatMap(q => [...(q.past ?? []), q].flatMap(x => [x.name, x.alias?.en, x.alias?.hi])).filter(Boolean).map(nameKey));
    const ca = castOf(a.st, a.i, 0), cb = castOf(b.st, b.i, 0);
    const has = m => !!m?.en && (atTable.has(nameKey(m.en)) || atTable.has(nameKey(m.hi))), clash = Object.values(ca).some(has);
    for (const role of Object.keys(ca)) if (!clash && !has(cb[role])) assert.deepEqual(cb[role], ca[role], `seed ${seed}: the same ${role}`);
    if (!clash) { same++; assert.equal(lifeText(b.st, b.i, "en"), lifeText(a.st, a.i, "en"), `seed ${seed}: the same book`); }
  }
  assert.ok(n > 20 && same > 15, "lives compared: " + n + ", their casts and books: " + same);
});

test("a year sat out or a throw let go never shifts the throws after it", () => {
  const s = createGame({ players: [{ ...me }], rules: { six: true }, seed: 9 }), t = createGame({ players: [{ ...me }], rules: { six: true }, seed: 9 });
  const a = Array.from({ length: 10 }, () => throwDice(s, 1)[0]);
  // in t a turn throws nothing between; the life's throws are numbered by what it threw, not by the turns
  const b = [];
  for (let k = 0; k < 10; k++) { if (k === 3) playTurn(t, []); b.push(throwDice(t, 1)[0]); }
  assert.deepEqual(b, a);
  // a new life throws its own
  const u = createGame({ players: [{ ...me }], rules: { six: true }, seed: 9 });
  u.players[0].rebirths = 1;
  assert.notDeepEqual(Array.from({ length: 10 }, () => throwDice(u, 1)[0]), a);
});

test("setDice('stream') throws every seat off the game's one sequence, the tumble first, as before Phase 19", () => {
  setDice("stream");
  try {
    for (const n of [1, 2]) {
      const s = createGame({ players: [{ ...me }, { ...cpu }], rules: { six: true }, seed: 5 }), r = makeRng(5);
      for (let k = 0; k < 20; k++) { s.turn = k % 2; assert.deepEqual(throwDice(s, n), rollDice(r, n)); }
      assert.equal(s.players[0].thrown, undefined, "nothing counted");
    }
  } finally { setDice("throw"); }
});

test("a seat keeps its lane through its lives, and a game plays the same way twice", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const play = () => {
      const s = createGame({ players: [{ ...cpu }, { ...me }, { ...cpu }], rules: { six: true, mode: "together" }, seed });
      for (let n = 0; n < 400 && !s.over; n++) playTurn(s);
      return s;
    };
    const s = play(), t = play();
    assert.deepEqual(s.players.map(p => p.lane), [1, 0, 2]);
    assert.deepEqual(t.players.map(p => [...(p.past ?? []), p].map(q => q.life)), s.players.map(p => [...(p.past ?? []), p].map(q => q.life)));
    for (const p of s.players) for (const q of p.past ?? []) assert.equal(q.lane, p.lane, `seed ${seed}: a past life kept the lane`);
  }
});
