// REDESIGN.md Phase 18: the old cloth, a historical board played as the old game (src/engine/cloth.js).
import test from "node:test";
import assert from "node:assert/strict";
import { useBoard, GOAL, TOP } from "../src/content.js";
import { createGame, playTurn, planTurn, endTurn, rollDice, diceFor } from "../src/engine/turn.js";
import { throwOf, oddsOf, COWRIE_UP } from "../src/engine/dice.js";
import { makeRng } from "../src/rng.js";

const on72 = f => () => { useBoard("72"); try { f(); } finally { useBoard("110"); } };
const game = (seed = 1, rules = {}) => createGame({ players: [{ name: "A", type: "human", gender: "f" }, { name: "", type: "cpu" }], rules: { six: true, board: "72", ...rules }, seed });

test("seven cowries fall as Schmidt-Madsen measured them: a 1 one throw in eleven or twelve", () => {
  const odds = oddsOf("cowries");
  assert.ok(Math.abs(odds[1] - 0.087) < 0.001, `a 1 is ${odds[1]}`);
  assert.ok(Math.abs(odds[0] - 0.015) < 0.001, `a 0 is ${odds[0]}`);
  assert.equal(COWRIE_UP, 0.45);
  const rng = makeRng(7), N = 200000, seen = Array(8).fill(0);
  for (let i = 0; i < N; i++) seen[throwOf(rng, "cowries").v]++;
  for (let k = 0; k <= 7; k++) assert.ok(Math.abs(seen[k] / N - odds[k]) < 0.004, `${k}: ${seen[k] / N} vs ${odds[k]}`);
  const stick = new Set(Array.from({ length: 400 }, () => throwOf(rng, "stick").v));
  assert.deepEqual([...stick].sort(), [1, 2, 5, 6]);
});

test("on the 72 every pawn begins on birth, and a throw is one count of the board's own randomizer", on72(() => {
  const s = game();
  assert.deepEqual(s.players.map(p => p.pos), [1, 1]);
  assert.equal(diceFor(s.players[0]), 1);
  const plan = playTurn(s);
  assert.ok(plan.v >= 0 && plan.v <= 7);
  assert.ok(Array.isArray(s.shells) && s.shells.length === 7);
}));

test("a snake and a ladder are taken on landing; bhakti's ladder at 54 reaches Vaikuṇṭha and wins", on72(() => {
  const s = game();
  s.players[0].pos = 50;
  let plan = playTurn(s, 2);
  assert.equal(plan.target, 52);
  assert.deepEqual(plan.jump, { kind: "snake", to: 35 });
  assert.equal(s.players[0].pos, 35);
  s.turn = 0; s.players[0].pos = 51;
  plan = playTurn(s, 3);
  assert.deepEqual(plan.jump, { kind: "ladder", to: 68 });
  assert.equal(plan.win, true);
  assert.equal(s.winner, 0);
  assert.equal(s.over, true);
  assert.equal(GOAL, 68);
}));

test("a throw that would pass 72 stops on it, its snake takes the pawn to 51, and the count left over is not carried", on72(() => {
  const s = game();
  s.players[0].pos = 70;
  const plan = playTurn(s, 5);
  assert.deepEqual(plan.path, [71, 72]);
  assert.equal(plan.target, TOP);
  assert.deepEqual(plan.jump, { kind: "snake", to: 51 });
  assert.equal(s.players[0].pos, 51);
  assert.ok(plan.after.some(e => e.k === "cPast"));
  s.turn = 0; s.players[0].pos = 69;
  playTurn(s, 3);
  assert.equal(s.players[0].pos, 51);
}));

test("no cowrie face up moves nothing, and the turn passes; there is no second throw", on72(() => {
  const s = game();
  s.players[0].pos = 30;
  const plan = playTurn(s, 0);
  assert.equal(plan.stay, true);
  assert.equal(s.players[0].pos, 30);
  assert.equal(s.turn, 1);
  const six = playTurn(s, 6);
  assert.equal(six.again, false);
  assert.equal(s.turn, 0);
}));

test("back on the 110 the game is the 110's", () => {
  useBoard("110");
  const s = createGame({ players: [{ name: "A", type: "human", gender: "f" }], rules: { six: true }, seed: 1 });
  assert.equal(s.players[0].pos, 0);
  assert.equal(GOAL, 105);
});
