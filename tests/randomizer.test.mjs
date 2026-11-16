// Phase 20 step 5: the 110 thrown with cowries or the stick die, a setting; the die stays the default and draws as it
// always has.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn, movesFor, throwDice } from "../src/engine/turn.js";
import { throwKind } from "../src/engine/cloth.js";
import { drawThrow } from "../src/engine/throws.js";
import { STICK, COWRIES } from "../src/engine/dice.js";
import { LADDERS } from "../src/content.js";

const game = (rand, seed = 1, law) => createGame({ players: [{ name: "", type: "cpu" }], rules: { six: true, cards: "off", ...(rand ? { rand } : {}), ...(law ? { law } : {}) }, seed });

test("the 110's die is no randomizer: a game without one, or set to the die, throws as before", () => {
  for (const r of [undefined, "die", "own"]) assert.equal(throwKind(game(r)), null);
  assert.equal(throwKind(game("cowries")), "cowries");
  assert.equal(throwKind(game("stick")), "stick");
  // the same seed, the same throws, with or without the setting
  const a = game(undefined, 7), b = game("die", 7);
  for (let k = 0; k < 40; k++) assert.deepEqual(throwDice(a, 1 + (k % 2)), throwDice(b, 1 + (k % 2)));
});

test("cowries count 0–7 and the stick die 1, 2, 5 or 6; the endgame's two dice are two throws", () => {
  const c = game("cowries", 3), s = game("stick", 3), seen = new Set();
  for (let k = 0; k < 600; k++) {
    const t = drawThrow(c, 2, { kind: "cowries" });
    assert.equal(t.dice.length, 2);
    assert.equal(t.ups.length, 2);
    t.dice.forEach((v, d) => { assert.ok(v >= 0 && v <= COWRIES); assert.equal(t.ups[d].filter(Boolean).length, v); seen.add(v); });
    for (const v of throwDice(s, 2)) assert.ok(STICK.includes(v));
  }
  assert.ok(seen.has(0) && seen.has(7), "every count comes up");
});

test("one cowrie throw draws as an old cloth's always has: the first of n is the same throw", () => {
  const a = game("cowries", 11), b = game("cowries", 11);
  for (let k = 0; k < 50; k++) {
    const one = drawThrow(a, 1, { kind: "cowries" }), two = drawThrow(b, 2, { kind: "cowries" });
    assert.equal(two.dice[0], one.dice[0]);
    assert.deepEqual(two.up, one.up);
  }
});

test("a throw that counts nothing is a year with no move, never sitting and never a law's act", () => {
  for (const law of ["board", "advaita", "yoga", "nyaya", "jain"]) {
    const s = game("cowries", 5, law);
    for (let k = 0; k < 12; k++) playTurn(s, [3]);
    const p = s.players[0], at = p.pos, years = p.years;
    // a 0 beside a counted throw is never offered; alone, it is the only move
    assert.deepEqual(movesFor(s, [0]), [0]);
    // (a Jain life at a ladder's foot may wait there, its own move, with any throw)
    if (!LADDERS[p.pos]) assert.deepEqual(movesFor(s, [0, 4]), [4]);
    // under Advaita at the sixth bhumika a move of 0 would be recognition; a throw of nothing is not
    p.bhumika = 6;
    const plan = playTurn(s, [0]);
    assert.ok(plan.nil, law);
    assert.equal(plan.win, false, law);
    assert.equal(plan.act, undefined, law);
    assert.equal(s.players[0].pos, at, law);
    assert.equal(Math.floor(s.players[0].years), Math.floor(years) + 1, law);
    assert.equal(s.log.some(e => e.k === "lNil"), true, law);
  }
});

test("a game thrown with cowries or the stick die plays to its end, and replays the same", () => {
  for (const rand of ["cowries", "stick"]) {
    for (let seed = 1; seed <= 30; seed++) {
      const a = game(rand, seed), b = game(rand, seed);
      for (let n = 0; n < 3000 && !a.over; n++) playTurn(a);
      for (let n = 0; n < 3000 && !b.over; n++) playTurn(b);
      assert.ok(a.over, `${rand} seed ${seed} ends`);
      assert.deepEqual(a.players[0].life, b.players[0].life);
    }
  }
});
