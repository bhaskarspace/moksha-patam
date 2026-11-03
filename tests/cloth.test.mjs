// REDESIGN.md Phase 18: the old cloth, a historical board played as the old game (src/engine/cloth.js).
import test from "node:test";
import assert from "node:assert/strict";
import { useBoard, GOAL, TOP, LAYOUT, BOARDS } from "../src/content.js";
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

// ---- The 84, by Jeṭhābhāī's rules (JBRR 1; Schmidt-Madsen 2019, App. F2, pp. 605-6, and ch. 5, p. 217) ----
const on84 = f => () => { useBoard("84"); try { f(); } finally { useBoard("110"); } };
const game84 = (seed = 1, rules = {}) => createGame({ players: [{ name: "A", type: "human", gender: "f" }, { name: "", type: "cpu" }], rules: { six: true, board: "84", ...rules }, seed });
const at = (s, pos, back = false) => { s.turn = 0; Object.assign(s.players[0], { pos }); if (back) s.players[0].back = true; else delete s.players[0].back; };

test("the 84 is laid out as the charts are: a square below, one at each arm, the grid, and the cross of six above", on84(() => {
  const at = n => LAYOUT.at[n];
  assert.deepEqual([LAYOUT.cols, LAYOUT.rows, GOAL, TOP], [11, 14, 90, 90]);
  assert.deepEqual(at(1), { col: 5, row: 0 });
  assert.deepEqual([at(2), at(10), at(11)], [{ col: 1, row: 1 }, { col: 9, row: 1 }, { col: 9, row: 2 }]);
  assert.deepEqual([at(55), at(56), at(57), at(65), at(66), at(67), at(84)], [{ col: 1, row: 6 }, { col: 0, row: 6 }, { col: 1, row: 7 }, { col: 9, row: 7 }, { col: 10, row: 7 }, { col: 9, row: 8 }, { col: 9, row: 9 }]);
  // the footprints are the centre column, each one square straight above the last
  for (const [a, b] of Object.entries(BOARDS["84"].rules.footprints)) { assert.equal(at(+a).col, 5); assert.equal(at(b).col, 5); assert.equal(at(b).row, at(+a).row + 1); }
  assert.deepEqual([86, 87, 88].map(at), [{ col: 4, row: 11 }, { col: 5, row: 11 }, { col: 6, row: 11 }]);
}));

test("on the 84 only a 1 leaves square 1, and it moves the pawn to 2", on84(() => {
  const s = game84();
  for (const v of [2, 5, 6]) { at(s, 1); const p = playTurn(s, v); assert.ok(p.stay && p.why === "entry"); assert.equal(s.players[0].pos, 1); }
  at(s, 1); playTurn(s, 1); assert.equal(s.players[0].pos, 2);
}));

test("a ladder or a footprint is climbed only on a 1 thrown from its square; landing on one waits", on84(() => {
  const s = game84();
  at(s, 5); let p = playTurn(s, 2); assert.equal(s.players[0].pos, 7); assert.equal(p.jump, null);
  at(s, 7); p = playTurn(s, 1); assert.deepEqual(p.jump, { kind: "ladder", to: 44 }); assert.equal(s.players[0].pos, 44);
  // 7 to 44 to 50 takes two separate 1s
  at(s, 44); playTurn(s, 1); assert.equal(s.players[0].pos, 50);
  at(s, 7); playTurn(s, 2); assert.equal(s.players[0].pos, 9);
  at(s, 6); p = playTurn(s, 1); assert.deepEqual(p.jump, { kind: "foot", to: 15 });
  at(s, 51); playTurn(s, 1); assert.equal(s.players[0].pos, 61);
  // a snake is taken on landing, whatever the throw
  at(s, 12); playTurn(s, 1); assert.equal(s.players[0].pos, 8);
}));

test("past 80 without the 1: on to 84, back down to 76, its snake to 52, and the rest of the throw from there", on84(() => {
  const s = game84();
  at(s, 80); let p = playTurn(s, 2); assert.equal(s.players[0].pos, 82); assert.ok(!s.players[0].back);
  at(s, 82); p = playTurn(s, 5); assert.deepEqual(p.path, [83, 84, 83, 82, 81]); assert.ok(s.players[0].back);
  // coming back, a 1 on 80 still climbs to the first square above
  at(s, 81, true); playTurn(s, 1); assert.equal(s.players[0].pos, 80); assert.ok(s.players[0].back);
  at(s, 80, true); p = playTurn(s, 1); assert.deepEqual(p.jump, { kind: "foot", to: 85 }); assert.ok(!s.players[0].back);
  at(s, 79, true); p = playTurn(s, 6); assert.deepEqual(p.path, [78, 77, 76]); assert.deepEqual(p.jump, { kind: "snake", to: 52 });
  assert.deepEqual(p.then, [53, 54, 55]); assert.equal(s.players[0].pos, 55); assert.ok(!s.players[0].back);
  // the most a throw can carry from 52 is five: from 77, one step to 76 and five on to 57
  at(s, 77, true); p = playTurn(s, 6); assert.deepEqual(p.then, [53, 54, 55, 56, 57]); assert.equal(s.players[0].pos, 57);
}));

test("above the grid only a 1 climbs, square by square, and the 1 from the fifth reaches the siddhaśilā and wins", on84(() => {
  const s = game84();
  at(s, 85); let p = playTurn(s, 2); assert.ok(p.stay && p.why === "top"); assert.equal(s.players[0].pos, 85);
  for (const n of [85, 86, 87, 88]) { at(s, n); playTurn(s, 1); assert.equal(s.players[0].pos, n + 1); }
  at(s, 89); p = playTurn(s, 1); assert.ok(p.win); assert.equal(s.winner, 0); assert.ok(s.over);
  // 50's ladder goes straight there, on a 1
  const t = game84(); at(t, 50); p = playTurn(t, 1); assert.ok(p.win);
  // 47's goes to the first square above
  const u = game84(); at(u, 47); playTurn(u, 1); assert.equal(u.players[0].pos, 85);
}));

// Phase 18 step 4: the game's other rules, each off unless chosen, and only where the board offers it
test("start six: only a 6 leaves square 1, on the 72 and in place of the 84's 1", () => {
  on72(() => {
    const s = game(1, { start: "six" });
    let plan = playTurn(s, 5);
    assert.ok(plan.stay && plan.why === "six");
    assert.equal(s.players[0].pos, 1);
    s.turn = 0;
    plan = playTurn(s, 6);
    assert.equal(s.players[0].pos, 7);
    // unchosen, the 72 has no wait at all
    const t = game();
    playTurn(t, 2);
    assert.equal(t.players[0].pos, 3);
  })();
  on84(() => {
    const s = game84(1, { start: "six" });
    assert.ok(playTurn(s, 1).stay);
    at(s, 1);
    playTurn(s, 6);
    assert.equal(s.players[0].pos, 7);
  })();
});

test("end exact on the 72: a throw past 72 is lost, and one onto 72 still takes its snake", on72(() => {
  const s = game(1, { end: "exact" });
  s.players[0].pos = 70;
  let plan = playTurn(s, 5);
  assert.ok(plan.stay && plan.why === "exact");
  assert.equal(s.players[0].pos, 70);
  s.turn = 0;
  plan = playTurn(s, 2);
  assert.equal(plan.target, 72);
  assert.equal(s.players[0].pos, 51);
}));

test("end roam: back and forth between the gate and the row's end until a throw ends on the gate", () => {
  on72(() => {
    const s = game(1, { end: "roam" });
    s.players[0].pos = 70;
    // 71, 72, turned, 71, 70, 69: passing 72 is no landing, and the pawn keeps coming back
    let plan = playTurn(s, 5);
    assert.deepEqual(plan.path, [71, 72, 71, 70, 69]);
    assert.equal(s.players[0].pos, 69);
    assert.equal(s.players[0].back, true);
    s.turn = 0;
    // 68, turned, 69, 70: passing the gate is no landing either
    plan = playTurn(s, 3);
    assert.deepEqual(plan.path, [68, 69, 70]);
    assert.ok(!plan.win && !s.players[0].back);
    at(s, 69, true);
    plan = playTurn(s, 1);
    assert.ok(plan.win && s.over);
  })();
  on84(() => {
    const s = game84(1, { end: "roam" });
    at(s, 82);
    // 83, 84, turned, 83, 82, 81, 80, turned, 81: never down to 76
    let plan = playTurn(s, 7);
    assert.deepEqual(plan.path, [83, 84, 83, 82, 81, 80, 81]);
    at(s, 82, true);
    plan = playTurn(s, 2);
    assert.equal(s.players[0].pos, 80);
    at(s, 82, true);
    plan = playTurn(s, 6);
    assert.deepEqual(plan.path, [81, 80, 81, 82, 83, 84]);
    assert.ok(!plan.then && !s.players[0].back);
    // on 80 a 1 climbs, as on the board
    at(s, 80, true);
    playTurn(s, 1);
    assert.equal(s.players[0].pos, 85);
  })();
});

test("a rule the board does not offer is ignored: no exact throw on the 84", on84(() => {
  const s = game84(1, { end: "exact" });
  at(s, 82);
  const plan = playTurn(s, 6);
  // the board's own turn: on to 84 and back to 80
  assert.ok(!plan.stay);
  assert.equal(s.players[0].pos, 80);
  assert.equal(s.players[0].back, true);
}));
