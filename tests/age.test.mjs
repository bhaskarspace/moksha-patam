import test from "node:test";
import assert from "node:assert/strict";
import { ASHRAMAS, GOAL, TOP } from "../src/content.js";
import { ageOf, lens, wash } from "../src/render/age.js";

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

test("a snake makes you younger, so the years it took are ahead again", () => {
  const before = lens(at(62)), after = lens(at(46)); // the snake at 62 drops to 46
  assert.equal(wash(55, before).dim, 0);
  assert.ok(wash(55, after).dim > 0);
  assert.ok(wash(30, after).sepia < wash(30, before).sepia);
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
