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
  assert.deepEqual(up.jump, { kind: "ladder", to: 15 });
  assert.equal(s.players[0].pos, 15);
  s = game(13);
  playTurn(s, 1);
  assert.equal(s.players[0].pos, 8);
  assert.equal(s.log[0].kind, "snake");
});

// REDESIGN.md Phase 12: nothing above the exit turns back. The heavens are walked, and the throw past 110 is the fall,
// which ends the life: no bounce, no square 1, and no landing.
test("past 105 the heavens are walked, and the throw past 110 ends the life", () => {
  const s = game(107);
  const plan = playTurn(s, 2);
  assert.deepEqual(plan.path, [108, 109]);
  assert.equal(s.players[0].pos, 109);
  assert.equal(s.log.find(e => e.k === "lHeaven").v.pos, 109);
  // Brahma's square is only his realm now
  const b = game(106);
  const up = playTurn(b, 2);
  assert.equal(up.jump, null);
  assert.equal(b.players[0].pos, 108);
  // the fall: walks to the top, lands nowhere, and the life is over
  const f = game(107);
  const fall = playTurn(f, 6);
  assert.ok(fall.fell && !fall.win && !fall.died && !fall.again);
  assert.deepEqual(fall.path, [108, 109, 110]);
  const p = f.players[0];
  assert.ok(p.fell && !p.dead);
  assert.equal(p.pos, 0);
  assert.deepEqual(p.life, []);
  assert.equal(f.log[0].k, "lFell");
  // the person has fallen, so the game with a person in it is over, and nobody won
  assert.ok(f.over);
  assert.equal(f.winner, null);
});

test("no roll from 101 to 110 ever turns back, and only landing on 105 wins", () => {
  for (let pos = 95; pos <= 110; pos++) {
    if (pos === 105) continue;
    for (let v = 1; v <= 6; v++) {
      const plan = planTurn(game(pos), v);
      assert.deepEqual(plan.path, Array.from({ length: Math.min(v, 110 - pos) }, (_, i) => pos + i + 1), `from ${pos}, a ${v}`);
      // past 110, or since Phase 14 onto it, where Śiva's snake takes the life
      assert.equal(!!plan.fell, pos + v >= 110, `from ${pos}, a ${v}`);
      if (plan.fell) assert.equal(plan.fellBy, pos + v === 110 ? "snake" : "past");
      if (pos > 100 && !plan.fell) assert.ok(plan.final > pos, `from ${pos}, a ${v} goes on`);
      assert.equal(plan.win, !plan.fell && plan.final === 105, `from ${pos}, a ${v}`);
    }
  }
});

test("Śiva's snake: a landing on 110 is the fall, by the snake, and the life ends with nothing landed", () => {
  const s = game(107), plan = playTurn(s, 3), p = s.players[0];
  assert.ok(plan.fell && plan.fellBy === "snake" && !plan.win && !plan.died && !plan.jump);
  assert.deepEqual(plan.path, [108, 109, 110]);
  assert.ok(p.fell && p.fellBy === "snake" && p.fellFrom === 110 && p.pos === 0);
  assert.equal(s.log[0].k, "lSiva");
  assert.ok(!s.log.some(e => e.k === "lHeaven" && e.v.pos === 110));
});

test("a fallen player is passed over, and the race goes on without them", () => {
  const s = createGame({ players: [{ name: "", type: "cpu" }, { name: "", type: "cpu" }, { name: "", type: "cpu" }], rules: { six: true }, seed: 2 });
  s.players[0].pos = 109;
  playTurn(s, 4);
  assert.ok(s.players[0].fell);
  assert.equal(s.turn, 1);
  assert.ok(!s.over);
  playTurn(s, 1); playTurn(s, 1);
  assert.equal(s.turn, 1, "player 0 has no more turns");
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
  playTurn(s, 2);        // 108: Brahma's realm, one square of the life
  assert.deepEqual(s.players[0].life, [6, 15, 108]);
  s.turn = 0;
  playTurn(s, 3);        // past 110: the fall lands nowhere, so the life gains nothing
  assert.deepEqual(s.players[0].life, [6, 15, 108]);
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
