// Phase 10: roll-dependent squares (src/engine/turn.js toldOn), and what they tell in the life account.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, planTurn, playTurn, endTurn, resolveChoice, toldOn, setEndgame, ENDGAME } from "../src/engine/turn.js";
import { lifeOf } from "../src/engine/account.js";
import { SQ, LADDERS, SNAKES, squareOf } from "../src/content.js";
import { fill } from "../src/i18n.js";
import { lintContent } from "../tools/lint-content.mjs";
import { playGame } from "../tools/sim.mjs";

const ROLLS = Object.keys(SQ).map(Number).filter(n => SQ[n].roll);
const game = pos => {
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f" }], rules: { six: true }, seed: 1 });
  s.players[0].pos = pos;
  return s;
};
const lived = (life, told) => {
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f" }], rules: { six: true }, seed: 7 });
  Object.assign(s.players[0], { life, told, pos: life.at(-1) });
  return s;
};
const all = (s, l = "en") => lifeOf(s, 0, l).paras.map(p => p.text).join(" ");
const opening = (m, l = "en") => fill(m[l], { name: "Meera", gender: "f", age: "" }).split(/[.।]/)[1].trim().slice(0, 40);

test("ten squares tell two moments, chosen from the sim: the snake tails a life lands on most", () => {
  assert.deepEqual(ROLLS, [8, 11, 31, 43, 46, 50, 52, 58, 64, 71]);
});

test("the face decides, by the event's valence: a misfortune on the high faces, a good thing on the low", () => {
  // 43 is a misfortune on three faces: the mango goes soft on 4, 5 and 6
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(f => toldOn(43, f)), ["else", "else", "else", null, null, null]);
  const saved = SQ[43].roll;
  SQ[43].roll = { ...saved, valence: "good", faces: 2 };
  try { assert.deepEqual([1, 2, 3, 4, 5, 6].map(f => toldOn(43, f)), [null, null, "else", "else", "else", "else"]); } finally { SQ[43].roll = saved; }
  // a square without the field always tells its own moment
  assert.equal(toldOn(44, 1), null);
});

test("only below the endgame, and only on one die: from there the player chooses the die, and would choose the moment", () => {
  assert.equal(toldOn(43, 1, [1, 5]), null);
  setEndgame(40);
  try { assert.equal(toldOn(43, 1), null); } finally { setEndgame(94); }
  assert.equal(ENDGAME, 94);
});

test("the turn reads the face, never the distance, and the record keeps step with the life", () => {
  const s = game(40);
  const p1 = planTurn(s, 3);
  assert.deepEqual(p1.told, ["else"]);
  endTurn(s, p1);
  // a snake's tail reads the same turn's face: 52 + 3 is Greed, which falls to 43
  s.turn = 0; s.players[0].pos = 52;
  // Greed is a situation since Phase 10 B: pocketing the change is the snake
  const p2 = resolveChoice(s, planTurn(s, 3), "keep");
  assert.deepEqual([p2.target, p2.final, ...p2.told], [55, 43, "keep", "else"]);
  endTurn(s, p2);
  assert.deepEqual(s.players[0].life, [43, 55, 43]);
  assert.deepEqual(s.players[0].told, ["else", "keep", "else"]);
  // a life set by hand, with no record, is padded: its squares told their own moments
  const h = game(40);
  h.players[0].life = [10, 20, 40];
  endTurn(h, planTurn(h, 2));
  assert.deepEqual(h.players[0].told, [null, null, null, null]);
});

test("nothing moves and nothing is drawn: every game plays exactly as it does with the field taken away", () => {
  const saved = Object.fromEntries(ROLLS.map(n => [n, SQ[n].roll]));
  const play = () => Array.from({ length: 300 }, (_, i) => playGame(i + 1, { players: 2 })).map(g => JSON.stringify([g.log, g.turns, g.winner, g.players.map(p => [p.life, p.years, p.gunas, p.aims])]));
  const withRoll = play();
  for (const n of ROLLS) delete SQ[n].roll;
  try { assert.deepEqual(play(), withRoll); } finally { for (const n of ROLLS) SQ[n].roll = saved[n]; }
});

test("the account tells the moment the landing told", () => {
  const own = all(lived([42, 43], [null, null])), other = all(lived([42, 43], [null, "else"]));
  assert.match(own, /saves the last mango for tomorrow/);
  assert.match(other, /eats it standing at the window/);
  assert.doesNotMatch(other, /saves the last mango/);
});

test("what repeats is a moment: the other moment on a square already told is told in full, the same one is not", () => {
  // 43, then Greed back down to 43: the other moment is a new one, the same one is only where it was first lived
  const fresh = all(lived([43, 55, 43], [null, null, "else"]));
  assert.match(fresh, /saves the last mango/);
  assert.match(fresh, /eats it standing at the window/);
  const again = all(lived([43, 55, 43], [null, null, null]));
  assert.equal(again.split("saves the last mango").length - 1, 1);
  assert.match(again, /back where Meera was at twenty-eight/);
});

test("a callback is said only after the moment it names: 63's echo needs the mango that went soft", () => {
  assert.match(all(lived([43, 44, 63], [null, null, null])), /Long after the mango that went soft/);
  assert.doesNotMatch(all(lived([43, 44, 63], ["else", null, null])), /Long after the mango/);
  // 50's own echo names the blow, and is not borrowed by its other moment: Anger, then Greed back below 50, and
  // walking up to it again tells the other moment in full, on a plain join
  const back = all(lived([59, 50, 55, 43, 45, 50], [null, null, null, null, null, "else"]));
  assert.match(back, /sits on the floor beside the girl/);
  assert.doesNotMatch(back, /The blow is years old by now/);
});

test("a game saved before Phase 10 has no record and reads exactly as it did", () => {
  const s = lived([42, 43, 44, 63], undefined);
  assert.equal(all(s), all(lived([42, 43, 44, 63], [null, null, null, null])));
});

test("every other moment agrees in Hindi for a man and a woman, and leaves no choice unmade", () => {
  for (const n of ROLLS) {
    const m = SQ[n].roll.moment;
    for (const gender of ["m", "f", "n"]) for (const l of ["en", "hi"]) {
      const text = fill(m[l], { name: "Asha", gender, age: "x" });
      assert.doesNotMatch(text, /[{}|]/, `square ${n} ${l} ${gender}`);
    }
    if (/\{[^{}]*\|/.test(m.hi)) assert.notEqual(fill(m.hi, { name: "Asha", gender: "m", age: "x" }), fill(m.hi, { name: "Asha", gender: "f", age: "x" }), `square ${n}`);
  }
});

test("the lint keeps the field to story squares below the endgame", () => {
  const roll = SQ[43].roll;
  const errs = (n, table, r = roll) => { const q = table[n], had = q.roll; q.roll = r; try { return lintContent(); } finally { if (had) q.roll = had; else delete q.roll; } };
  assert.ok(errs(55, SNAKES).some(e => e.includes("square 55 roll: only a story square")));
  assert.ok(errs(51, LADDERS).some(e => e.includes("square 51 roll: only a story square")));
  assert.ok(errs(95, SQ).some(e => e.includes("square 95 roll: is at or above 94")));
  assert.ok(errs(44 - 2, SQ, { ...roll, valence: "maybe" }).some(e => e.includes("valence")));
  assert.ok(errs(42, SQ, { ...roll, faces: 6 }).some(e => e.includes("faces 6")));
  assert.ok(errs(42, SQ, { ...roll, moment: { en: roll.moment.en } }).some(e => e.includes("the other moment in both languages")));
});
