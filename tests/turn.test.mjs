import test from "node:test";
import assert from "node:assert/strict";
import { createGame, planTurn, playTurn, rollDice, rollValue, diceFor, movesFor, moveFor, canSit, ENDGAME } from "../src/engine/turn.js";
import { makeRng } from "../src/rng.js";
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
  const plan = playTurn(s, 6);        // up to 110, then back down to 107, passing Brahma's snake without landing on it
  assert.deepEqual(plan.path, [108, 109, 110, 109, 108, 107]);
  assert.equal(plan.jump, null);
  assert.equal(s.players[0].pos, 107);
  assert.equal(s.log.find(e => e.k === "lBounce").v.pos, 107);
  // the same square it left is still a move, and still a life lived
  const back = game(109);
  playTurn(back, 2);
  assert.equal(back.players[0].pos, 109);
  assert.deepEqual(back.players[0].life, [109]);
});

test("merit spent: climbing onto Brahma's square, 108, sends a player back to birth, once in a life", () => {
  const s = game(106);
  const plan = playTurn(s, 2);
  assert.ok(plan.jump?.rebirth);
  assert.equal(s.players[0].pos, 1);
  assert.equal(s.players[0].hasFallen, true);
  assert.ok(s.log.some(e => e.k === "lRebirth"));
  // once fallen, climbing onto 108 again is only Brahma's realm
  s.turn = 0; s.players[0].pos = 106;
  const again = playTurn(s, 2);
  assert.equal(again.jump, null);
  assert.equal(s.players[0].pos, 108);
  assert.equal(s.log.find(e => e.k === "lHeaven")?.v.pos, 108);
  // coming back down onto 108 from above never falls
  const b = game(108);
  const down = playTurn(b, 4);        // 109, 110, 109, 108
  assert.equal(down.jump, null);
  assert.equal(b.players[0].pos, 108);
  assert.equal(b.players[0].hasFallen, false);
});

test("the log names every square walked over, once, and not the one landed on", () => {
  const s = game(20);
  playTurn(s, 4);
  assert.deepEqual(s.log.find(e => e.k === "lPassed").v.passed, [21, 22, 23]);
  const b = game(107);
  playTurn(b, 6);
  assert.deepEqual(b.log.find(e => e.k === "lPassed").v.passed, [108, 109, 110]);
  const one = game(20);
  playTurn(one, 1);
  assert.ok(!one.log.some(e => e.k === "lPassed"));
});

test("Brahmaloka rule: Moksha opens only after a fall, and is off by default", () => {
  const plain = game(101);
  playTurn(plain, 4);
  assert.equal(plain.winner, 0);
  const s = game(101, { six: true, brahmaloka: true });
  const plan = playTurn(s, 4);        // reaches 105, walks on past the shut exit to Brahma, and falls
  assert.deepEqual(plan.path, [102, 103, 104, 105, 106, 107, 108]);
  assert.equal(s.winner, null);
  assert.equal(s.players[0].pos, 1);
  assert.ok(s.log.some(e => e.k === "lClosed"));
  s.turn = 0; s.players[0].pos = 101;
  playTurn(s, 4);                     // having fallen once, the door is open
  assert.equal(s.winner, 0);
});

// REDESIGN.md Phase 7, item 3: the exit can be reached from above. Having overshot it, a player comes back down
// onto it by bouncing off the top of the board. This is deliberate; keep it.
test("Phase 7: Moksha at 105 is won only by landing on it, and can be won coming back down from above", () => {
  const top = game(110);
  const down = playTurn(top, 5);      // 109, 108, 107, 106, 105: past Brahma's snake without landing on it
  assert.deepEqual(down.path, [109, 108, 107, 106, 105]);
  assert.ok(down.win && !down.jump);
  assert.equal(top.winner, 0);
  assert.equal(top.log[0].k, "lWinAbove");
  const near = game(109);
  const back = playTurn(near, 6);     // 110, then all the way down to 105
  assert.deepEqual(back.path, [110, 109, 108, 107, 106, 105]);
  assert.equal(near.winner, 0);
  assert.equal(near.log[0].k, "lWinAbove");
  // passing over the exit going up does not win, and neither does stopping short of it coming down
  const over = game(103);
  playTurn(over, 4);
  assert.equal(over.players[0].pos, 107);
  assert.equal(over.winner, null);
  const short = game(110);
  playTurn(short, 4);
  assert.equal(short.players[0].pos, 106);
  assert.equal(short.winner, null);
});

test("Phase 7: from anywhere near the top, every roll walks a reflection off 110, and wins only on 105", () => {
  const reflect = (from, v) => Array.from({ length: v }, (_, i) => (from + i + 1 <= 110 ? from + i + 1 : 220 - (from + i + 1)));
  for (let pos = 95; pos <= 110; pos++) {
    for (let v = 1; v <= 6; v++) {
      const plan = planTurn(game(pos), v);
      assert.deepEqual(plan.path, reflect(pos, v), `from ${pos}, a ${v}`);
      assert.equal(plan.win, plan.final === 105, `from ${pos}, a ${v}`);
      assert.equal(plan.win, plan.target === 105, `from ${pos}, a ${v}: the exit has no snake or ladder on it`);
    }
  }
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

test("landing on 105 wins, and a winning six does not go again", () => {
  const s = game(99);
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
  s.turn = 0; s.players[0].pos = 106;
  playTurn(s, 2);        // 108: merit spent, and back to birth
  assert.deepEqual(s.players[0].life, [6, 15, 108, 1]);
  assert.equal(s.players[0].gender, "m");
});

// ---- Phase 9: dice as currency ----
const at = (pos, years) => { const s = game(pos); Object.assign(s.players[0], { years, life: [pos] }); return s; };

test("below the endgame a turn is one die, drawn exactly as before", () => {
  const a = makeRng(42), b = makeRng(42);
  for (let i = 0; i < 50; i++) assert.deepEqual(rollDice(a, 1), [rollValue(b)]);
  assert.equal(diceFor({ pos: ENDGAME - 1 }), 1);
  assert.equal(diceFor({ pos: ENDGAME }), 2);
  assert.equal(diceFor({ pos: 108 }), 2);
});

test("from 94 the player sees two dice and moves by either", () => {
  const s = at(96, 86);
  const plan = playTurn(s, [3, 5], () => 5);
  assert.equal(plan.target, 101);
  assert.deepEqual(plan.dice, [3, 5]);
  assert.deepEqual(plan.spare, [3]);
  assert.equal(s.log.find(e => e.k === "lDice").v.v, 5);
  // a double moves by one of them and the other is spare
  assert.deepEqual(planTurn(at(96, 86), 4, [4, 4]).spare, [4]);
});

test("the computer's choice: the exit, then not a snake, the bigger die first", () => {
  assert.equal(moveFor(at(100, 89), [6, 5]), 5);          // 105, the exit
  assert.equal(moveFor(at(96, 86), [3, 2]), 2);           // 3 is the snake at 99
  assert.equal(moveFor(at(96, 86), [1, 2]), 2);
  assert.equal(moveFor(at(104, 89), [4, 2]), 2);          // 4 climbs onto Brahma's 108; 2 is 106
});

test("a sannyasin on 94–100 may sit the year out: no move, a year passes, both dice are practice", () => {
  const s = at(98, 88), p = s.players[0];
  assert.ok(canSit(p));
  assert.deepEqual(movesFor(s, [1, 1]), [1, 0]);
  assert.equal(moveFor(s, [1, 1]), 0, "both dice are the snake at 99, so the computer sits");
  const plan = playTurn(s, [1, 1], () => 0);
  assert.ok(plan.sit && !plan.again);
  assert.equal(p.pos, 98);
  assert.equal(p.years, 89);
  assert.equal(p.practised, 2);
  assert.deepEqual(p.life, [98, 98]);
  assert.equal(s.log.find(e => e.k === "lSit").v.pos, 98);
  // sitting past the span ends the life
  const old = at(98, 110);
  assert.ok(playTurn(old, [1, 1], () => 0).died && old.players[0].dead);
  // only a sannyasin sits: someone put on 98 at sixty, still a vanaprastha, moves
  assert.ok(!canSit({ pos: 98, years: 60 }));
  // the divine row has only one slot: you walk
  assert.ok(!canSit({ pos: 103, years: 90 }));
  assert.ok(!movesFor(at(103, 90), [2, 3]).includes(0));
});

test("a six goes again only when it is the die moved by", () => {
  assert.ok(!playTurn(at(95, 84), [6, 2], () => 2).again);
  assert.ok(playTurn(at(95, 84), [6, 2], () => 6).again);
});
