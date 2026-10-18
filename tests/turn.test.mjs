import test from "node:test";
import assert from "node:assert/strict";
import { createGame, planTurn, playTurn } from "../src/engine/turn.js";
import { playGame } from "../tools/sim.mjs";

const game = (pos = 0, rules = { six: true }) => {
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
  assert.deepEqual(up.jump, { kind: "ladder", to: 15, rebirth: false });
  assert.equal(s.players[0].pos, 15);
  s = game(13);
  playTurn(s, 1);
  assert.equal(s.players[0].pos, 8);
  assert.equal(s.log[0].kind, "snake");
});

test("a roll past 110 bounces back by the remainder, so no roll is wasted", () => {
  const s = game(107);
  const plan = playTurn(s, 5);        // up to 110, then back down to 108
  assert.deepEqual(plan.path, [108, 109, 110, 109, 108]);
  assert.equal(s.players[0].pos, 108);
  assert.equal(s.log.find(e => e.k === "lBounce").v.pos, 108);
  // the same square it left is still a move, and still a life lived
  const back = game(108);
  playTurn(back, 4);
  assert.equal(back.players[0].pos, 108);
  assert.deepEqual(back.players[0].life, [108]);
});

test("merit spent: the snake on 109 drops a player out of the divine row", () => {
  const s = game(105);
  const plan = playTurn(s, 4);
  assert.ok(plan.jump?.rebirth);
  assert.equal(s.players[0].pos, 95);
  assert.equal(s.players[0].hasFallen, true);
  assert.ok(s.log.some(e => e.k === "lRebirth"));
  // a bounce that comes down on 109 falls too
  const b = game(108);
  playTurn(b, 3);                     // 109, 110, 109
  assert.equal(b.players[0].pos, 95);
});

test("the log names every square walked over, once, and not the one landed on", () => {
  const s = game(20);
  playTurn(s, 4);
  assert.deepEqual(s.log.find(e => e.k === "lPassed").v.passed, [21, 22, 23]);
  const b = game(107);
  playTurn(b, 5);
  assert.deepEqual(b.log.find(e => e.k === "lPassed").v.passed, [109, 110]);
  const one = game(20);
  playTurn(one, 1);
  assert.ok(!one.log.some(e => e.k === "lPassed"));
});

test("Brahmaloka rule: Moksha opens only after a fall, and is off by default", () => {
  const plain = game(104);
  playTurn(plain, 6);
  assert.equal(plain.winner, 0);
  const s = game(104, { six: true, brahmaloka: true });
  playTurn(s, 6);                     // reaches 110, is turned back to 109, and falls
  assert.equal(s.winner, null);
  assert.equal(s.players[0].pos, 95);
  assert.ok(s.log.some(e => e.k === "lClosed"));
  s.turn = 0; s.players[0].pos = 104;
  playTurn(s, 6);                     // having fallen once, the door is open
  assert.equal(s.winner, 0);
});

test("a six goes again, unless the rule is off", () => {
  const s = game(10);
  playTurn(s, 6);
  assert.equal(s.turn, 0);
  assert.equal(s.log[0].k, "lSix");
  const off = game(10, { six: false });
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
  const s = game(0, { six: false });
  playTurn(s, 6);        // born on 6, the friendship ladder to 15
  assert.deepEqual(s.players[0].life, [6, 15]);
  s.turn = 0; s.players[0].pos = 105;
  playTurn(s, 4);        // 109: merit spent, and down to 95
  assert.deepEqual(s.players[0].life, [6, 15, 109, 95]);
  assert.equal(s.players[0].gender, "m");
});
