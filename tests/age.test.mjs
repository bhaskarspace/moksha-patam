import test from "node:test";
import assert from "node:assert/strict";
import { ASHRAMAS, GOAL, TOP } from "../src/content.js";
import { ageOf, lens, wash, LOOKS, VEIL } from "../src/render/age.js";

const at = (...pos) => ({ players: pos.map(p => ({ pos: p })), winner: null });
const board = L => Array.from({ length: TOP }, (_, i) => wash(i + 1, L));

test("every earthly square has an age, never falling, and the divine row has none", () => {
  for (let n = 1; n <= 100; n++) assert.equal(typeof ageOf(n), "number", `square ${n}`);
  for (let n = 2; n <= 100; n++) assert.ok(ageOf(n) >= ageOf(n - 1), `square ${n} is younger than ${n - 1}`);
  for (let n = 101; n <= TOP; n++) assert.equal(ageOf(n), null);
});

test("one player: behind fades, ahead dims, their own year is clear", () => {
  const L = lens(at(60));
  assert.equal(L.fadeAge, ageOf(60));
  assert.deepEqual(wash(60, L), { sepia: 0, dim: 0 });
  assert.equal(wash(1, L).sepia, 1);           // fifty years on, birth is fully faded
  assert.ok(wash(59, L).sepia > 0 && wash(59, L).sepia < 0.1);
  assert.ok(wash(61, L).dim > 0 && wash(61, L).dim < 0.3);
  assert.ok(wash(100, L).dim > wash(61, L).dim);
  assert.equal(wash(105, L).dim, 1);
  for (const w of board(L)) assert.ok(!(w.sepia && w.dim), "no square is both behind and ahead");
});

test("in the tray nothing has faded and everything is ahead", () => {
  const L = lens(at(0, 0, 0, 0));
  assert.equal(L.droneStage, 0);
  for (const [i, w] of board(L).entries()) {
    assert.equal(w.sepia, 0);
    if (i > 0) assert.ok(w.dim > 0, `square ${i + 1} should be ahead`);
  }
});

test("four players: the span between the youngest and the oldest is in full colour", () => {
  const L = lens(at(12, 45, 30, 70));
  assert.equal(L.fadeAge, ageOf(12));
  assert.equal(L.dimAge, ageOf(70));
  for (let n = 12; n <= 70; n++) assert.deepEqual(wash(n, L), { sepia: 0, dim: 0 }, `square ${n}`);
  assert.ok(wash(5, L).sepia > 0);
  assert.ok(wash(80, L).dim > 0);
  // the drone follows whoever is furthest on: 70 is Vanaprastha
  assert.equal(ASHRAMAS[L.droneStage][1], "Vanaprastha");
});

test("one life through the lens of a single player", () => {
  const s = at(12, 70);
  assert.equal(lens(s, 1).fadeAge, ageOf(70));
  assert.equal(lens(s, 0).dimAge, ageOf(12));
});

test("a snake does not make you younger: the board stays as old as the years lived (Phase 8)", () => {
  // the snake at 62 drops to 46, and the player is still the 52 they were on 62
  const before = lens({ players: [{ pos: 62, years: ageOf(62) }] }), after = lens({ players: [{ pos: 46, years: ageOf(62) }] });
  assert.deepEqual(after, { ...before, lead: 46 });
  assert.equal(wash(55, after).dim, 0);
  assert.deepEqual(wash(30, after), wash(30, before));
  // a position with no life behind it is still read at the square's own age
  assert.ok(wash(55, lens(at(46))).dim > 0);
});

test("the divine row is dim until reached, never fades, and only the exit is silence", () => {
  const L = lens(at(104));
  for (let n = 101; n <= 104; n++) assert.deepEqual(wash(n, L), { sepia: 0, dim: 0 });
  assert.equal(wash(106, L).dim, 1);
  assert.equal(wash(1, L).sepia, 1);
  assert.equal(lens(at(GOAL)).droneStage, ASHRAMAS.length);
  // the higher heavens past the exit are still the divine row, not liberation: the drone keeps playing there
  for (let n = GOAL + 1; n <= TOP; n++) assert.equal(lens(at(n)).droneStage, ASHRAMAS.length - 1, `square ${n}`);
  assert.equal(lens({ ...at(50), winner: 0 }).droneStage, ASHRAMAS.length);
});

test("the drone stage changes at every ashrama boundary", () => {
  const stages = ASHRAMAS.map(([max]) => [lens(at(max)).droneStage, lens(at(Math.min(max + 1, GOAL))).droneStage]);
  stages.slice(0, -1).forEach(([a, b], i) => { assert.equal(a, i); assert.equal(b, i + 1); });
});

test("the same positions always give the same board", () => {
  assert.deepEqual(board(lens(at(33, 8))), board(lens(at(33, 8))));
});

// REDESIGN.md Phase 13, item 6: three first impressions, to be chosen with cold players. Each keeps the rule: once the
// ageing has begun, a life never sees the whole board clearly.
const begun = (...pos) => ({ ...at(...pos), last: 3 });
test("first: the whole cloth at full pigment until the game's first throw, then the ageing as before", () => {
  for (const w of board(lens(at(0, 0), null, "first"))) assert.deepEqual(w, { sepia: 0, dim: 0 });
  assert.deepEqual(board(lens(begun(30), null, "first")), board(lens(begun(30))));
});
test("veil: ahead is veiled at half the dimness, and what is reached is clear", () => {
  const plain = lens(begun(30)), veil = lens(begun(30), null, "veil");
  for (let n = 1; n <= TOP; n++) {
    const a = wash(n, plain), b = wash(n, veil);
    assert.equal(b.sepia, a.sepia);
    assert.ok(Math.abs(b.dim - a.dim * VEIL) < 1e-9, `square ${n}`);
  }
  assert.deepEqual(wash(30, veil), { sepia: 0, dim: 0 });
});
test("asrama: nothing dims within the oldest player's own stage of life; beyond it the ageing begins", () => {
  const L = lens(begun(25), null, "asrama");
  for (let n = 25; n <= ASHRAMAS[1][0]; n++) assert.equal(wash(n, L).dim, 0, `square ${n}`);
  assert.ok(wash(ASHRAMAS[1][0] + 5, L).dim > 0);
});
test("under every look, once a throw is made, some square is dimmed: no life sees the whole board clearly", () => {
  for (const look of LOOKS) for (const p of [1, 30, 70, 99]) assert.ok(board(lens(begun(p), null, look)).some(w => w.dim > 0), `${look} at ${p}`);
});
