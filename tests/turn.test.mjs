import test from "node:test";
import assert from "node:assert/strict";
import { createGame, planTurn, playTurn, rollDice, rollValue, diceFor, movesFor, moveFor, canSit, ENDGAME, meritOf, spentOf } from "../src/engine/turn.js";
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

// REDESIGN.md Phase 12: nothing above the exit turns back. Since Phase 17 no throw passes 110 either: a die that would is
// not offered, and with none the life stays where it is, the years standing still.
test("past 105 the heavens are walked, and no throw passes 110", () => {
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
  // a die past the top is not offered; with neither offered the life stays, and nothing is lived
  const f = game(107);
  assert.deepEqual(movesFor(f, [6, 4]), []);
  assert.deepEqual(movesFor(f, [6, 3]), [3]);
  assert.equal(moveFor(f, [6, 4]), null);
  const years = f.players[0].years, stay = playTurn(f, [6, 4]);
  assert.ok(stay.stay && !stay.fell && !stay.win && !stay.died && !stay.again);
  assert.deepEqual(stay.path, []);
  const p = f.players[0];
  assert.ok(!p.fell && !p.dead && p.pos === 107 && p.years === years);
  assert.deepEqual(p.life, []);
  assert.equal(f.log[0].k, "lHeavenStay");
  assert.ok(!f.over && f.turn === 1);
});

test("no roll from 101 to 110 ever turns back, and only landing on 105 wins", () => {
  for (let pos = 95; pos <= 110; pos++) {
    if (pos === 105) continue;
    for (let v = 1; v <= 6; v++) {
      const plan = planTurn(game(pos), v);
      // past 110 nothing moves; onto it, Śiva's snake takes the life (Phase 14), to be born again (Phase 17)
      assert.deepEqual(plan.path, pos + v > 110 ? [] : Array.from({ length: v }, (_, i) => pos + i + 1), `from ${pos}, a ${v}`);
      assert.equal(!!plan.stay, pos + v > 110, `from ${pos}, a ${v}`);
      assert.equal(!!plan.fell, pos + v === 110, `from ${pos}, a ${v}`);
      if (plan.fell) assert.equal(plan.fellBy, "snake");
      if (pos > 100 && !plan.fell && !plan.stay) assert.ok(plan.final > pos, `from ${pos}, a ${v} goes on`);
      assert.equal(plan.win, !plan.fell && plan.final === 105, `from ${pos}, a ${v}`);
    }
  }
});

test("Śiva's snake: a landing on 110 ends the life, and the same soul is born again in the seat", () => {
  const s = game(107), was = s.players[0], name = was.alias, plan = playTurn(s, 3), p = s.players[0];
  assert.ok(plan.fell && plan.fellBy === "snake" && !plan.win && !plan.died && !plan.jump);
  assert.deepEqual(plan.path, [108, 109, 110]);
  // the life that ended is kept whole, and the newborn is the same object, at the snake's tail
  assert.equal(p, was);
  assert.equal(p.past.length, 1);
  const q = p.past[0];
  assert.ok(q.fell && q.fellBy === "snake" && q.fellFrom === 110 && q.pos === 0);
  assert.ok(!p.fell && !p.dead && p.pos === 1 && p.years === 0 && p.rebirths === 1 && p.color === 0);
  assert.deepEqual(p.life, [1]);
  assert.ok(p.prior?.lives === 1, "born of the life before");
  assert.notEqual(p.alias?.en, q.alias?.en ?? name?.en);
  assert.deepEqual(s.log.slice(0, 2).map(e => e.k), ["lReborn", "lSiva"]);
  assert.equal(s.log[1].life, 0, "the snake's line is the first life's");
  assert.equal(s.log[0].life, 1);
  assert.ok(!s.log.some(e => e.k === "lHeaven" && e.v.pos === 110));
  assert.ok(!s.over);
});

// Phase 17 (Bhaskar, 29 Oct): the heavens last as long as the merit, one to four turns begun there by the guṇas as the
// life enters them; then nothing is thrown, and Śiva's snake takes the life from where it is.
test("the heavens last one to four turns, by sattva, and then the merit is spent", () => {
  const g = s => ({ gunas: { s, r: (1 - s) / 2, t: (1 - s) / 2 } });
  assert.deepEqual([0.3, 0.5, 0.65, 0.9].map(s => meritOf(g(s))), [1, 2, 3, 4]);
  const s = game(104), p = s.players[0];
  p.gunas = g(0.5).gunas;
  playTurn(s, 2);                       // into 106: two turns of merit
  assert.equal(p.merit, 2);
  s.turn = 0; playTurn(s, [6, 6], () => null);   // a stay is a turn in the heavens
  s.turn = 0; playTurn(s, [1, 1], () => 1);      // 107
  assert.ok(spentOf(p) && p.pos === 107 && p.heavenTurns === 2);
  s.turn = 0;
  const years = p.years, fall = playTurn(s);     // nothing is thrown
  assert.ok(fall.spent && fall.fell && fall.fellBy === "spent" && fall.v === null);
  assert.deepEqual(fall.path, [108, 109, 110]);
  const was = p.past[0];
  assert.ok(was.fell && was.fellFrom === 107 && was.years === years);
  assert.equal(was.heavenTurns, was.merit);        // the turn the snake takes is not counted: never past the merit
  assert.ok(p.pos === 1 && p.rebirths === 1 && p.merit === undefined && !spentOf(p));
  assert.deepEqual(s.log.slice(0, 2).map(e => e.k), ["lReborn", "lSpent"]);
});

test("a player born again through Śiva's snake keeps their seat, and their turn", () => {
  const s = createGame({ players: [{ name: "", type: "cpu" }, { name: "", type: "cpu" }, { name: "", type: "cpu" }], rules: { six: true }, seed: 2 });
  s.players[0].pos = 109;
  playTurn(s, 1);
  assert.ok(s.players[0].past[0].fell && !s.players[0].fell);
  assert.equal(s.turn, 1);
  assert.ok(!s.over);
  playTurn(s, 1); playTurn(s, 1);
  assert.equal(s.turn, 0, "player 0 plays on, born again");
});

test("the log names every square walked over, once, and not the one landed on", () => {
  const s = game(20);
  playTurn(s, 4);
  assert.deepEqual(s.log.find(e => e.k === "lPassed").v.passed, [21, 22, 23]);
  const b = game(107);
  playTurn(b, 3);
  assert.deepEqual(b.log.find(e => e.k === "lPassed").v.passed, [108, 109]);
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
