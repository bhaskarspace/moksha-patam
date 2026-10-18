import test from "node:test";
import assert from "node:assert/strict";
import { createGame, planTurn, playTurn } from "../src/engine/turn.js";
import { playGame } from "../tools/sim.mjs";

const game = (pos = 0, rules = { exact: true, six: true }) => {
  const s = createGame({ players: [{ name: "", type: "human" }, { name: "", type: "cpu" }], rules, seed: 1 });
  s.players[0].pos = pos;
  return s;
};

test("birth, then a plain move", () => {
  const s = game();
  playTurn(s, 2);
  assert.equal(s.players[0].pos, 2);
  assert.equal(s.log[0].k, "lBorn");
  assert.equal(s.turn, 1);
});

test("a ladder climbs and a snake swallows", () => {
  let s = game(3);
  const up = playTurn(s, 3);
  assert.deepEqual(up.jump, { kind: "ladder", to: 15 });
  assert.equal(s.players[0].pos, 15);
  s = game(13);
  playTurn(s, 1);
  assert.equal(s.players[0].pos, 8);
  assert.equal(s.log[0].kind, "snake");
});

test("the exact rule holds a player short of Moksha", () => {
  const s = game(107);
  const plan = playTurn(s, 5);
  assert.equal(plan.pre[0].k, "lExact");
  assert.equal(s.players[0].pos, 107);
  const loose = game(107, { exact: false, six: true });
  playTurn(loose, 5);
  assert.equal(loose.players[0].pos, 110);
  assert.equal(loose.winner, 0);
});

test("a six goes again, unless the rule is off", () => {
  const s = game(10);
  playTurn(s, 6);
  assert.equal(s.turn, 0);
  assert.equal(s.log[0].k, "lSix");
  const off = game(10, { exact: true, six: false });
  playTurn(off, 6);
  assert.equal(off.turn, 1);
});

test("landing on 110 wins, and a winning six does not go again", () => {
  const s = game(104);
  const plan = playTurn(s, 6);
  assert.ok(plan.win && !plan.again);
  assert.equal(s.winner, 0);
  assert.equal(s.log[0].k, "lWin");
});

test("planning a turn does not change the game", () => {
  const s = game(20), before = JSON.stringify(s);
  planTurn(s, 4);
  assert.equal(JSON.stringify(s), before);
});

test("a seeded game replays identically", () => {
  assert.deepEqual(playGame(99), playGame(99));
  assert.notDeepEqual(playGame(99).log, playGame(100).log);
});

test("a player's life records every square landed on, a snake or ladder as two", () => {
  const s = game(0, { exact: true, six: false });
  playTurn(s, 6);        // born on 6, the friendship ladder to 15
  assert.deepEqual(s.players[0].life, [6, 15]);
  s.turn = 0; s.players[0].pos = 105;
  playTurn(s, 6);        // overshoots 110 under the exact rule: no move, nothing lived
  assert.deepEqual(s.players[0].life, [6, 15]);
  assert.equal(s.players[0].gender, "m");
});
