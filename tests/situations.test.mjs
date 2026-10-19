// Phase 10 B: situations (src/engine/qbn.js), the choice in a turn, and what it tells in the life account.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, planTurn, playTurn, endTurn, resolveChoice } from "../src/engine/turn.js";
import { situationAt, optionsFor, choiceFor, setPolicy, worthOf, momentOf, passes } from "../src/engine/qbn.js";
import { yearsAlong, freshGunas } from "../src/engine/self.js";
import { lifeOf } from "../src/engine/account.js";
import { SITUATIONS, SQ, squareOf } from "../src/content.js";
import { fill } from "../src/i18n.js";
import { lintContent } from "../tools/lint-content.mjs";
import { playGame } from "../tools/sim.mjs";

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
const policy = (x, fn) => { setPolicy(x); try { return fn(); } finally { setPolicy("mixed"); } };

test("ten squares offer a choice: four snakes, three ladders and three story squares", () => {
  assert.deepEqual(Object.keys(SITUATIONS).map(Number), [12, 19, 28, 47, 49, 51, 54, 55, 56, 59]);
  assert.equal(situationAt(44), null);
});

test("a square without a situation is resolved at once, exactly as before", () => {
  const plan = planTurn(game(40), 4);
  assert.equal(plan.situation, undefined);
  assert.deepEqual(plan.jump, { kind: "ladder", to: 63, rebirth: false });
});

test("on a situation the turn waits for the choice, and the choice is the move", () => {
  const s = game(52), plan = planTurn(s, 3);
  assert.equal(plan.situation, SITUATIONS[55]);
  assert.equal(plan.jump, null);
  const fell = resolveChoice(game(52), planTurn(game(52), 3), "keep");
  assert.deepEqual([fell.jump?.kind, fell.final, fell.cost], ["snake", 43, 0]);
  const kept = resolveChoice(s, plan, "return");
  assert.deepEqual([kept.jump, kept.final, kept.cost], [null, 55, 7]);
});

test("the years a choice costs pass on its square, and are not practice", () => {
  const s = game(52), p = s.players[0];
  p.years = 40;
  endTurn(s, resolveChoice(s, planTurn(s, 3), "return"));
  assert.equal(p.years, 42 + 7);
  assert.deepEqual(p.life, [55, 55, 55, 55, 55, 55, 55, 55]);
  assert.deepEqual(p.told, ["return", ...Array(7).fill("stay")]);
  const along = yearsAlong(p.life, p.told);
  assert.deepEqual(along.map(e => e.via), [null, ...Array(7).fill("stay")]);
  assert.equal(along.at(-1).years, p.years);
  assert.equal(p.practised, 0);
});

test("a ladder taken at a cost: the years pass at its foot, and the climb follows", () => {
  const s = game(25), p = s.players[0];
  endTurn(s, resolveChoice(s, planTurn(s, 3), "truth"));
  assert.deepEqual(p.life, [28, 28, 45]);
  assert.deepEqual(yearsAlong(p.life, p.told).map(e => e.via), [null, "stay", "ladder"]);
});

test("the hidden value is the guna and aims already in state: no ledger of its own", () => {
  const a = game(52), b = game(52);
  endTurn(a, resolveChoice(a, planTurn(a, 3), "keep"));
  endTurn(b, resolveChoice(b, planTurn(b, 3), "return"));
  assert.ok(a.players[0].gunas.r > b.players[0].gunas.r);
  assert.ok(b.players[0].gunas.s > a.players[0].gunas.s);
  assert.ok(a.players[0].aims.dharma < b.players[0].aims.dharma);
});

test("a gate withholds an option with its reason, and one option is always open", () => {
  const p = game(56).players[0];
  p.gunas = { s: 0.2, r: 0.6, t: 0.2 };
  const look = optionsFor(p, SITUATIONS[59]).find(o => o.id === "look");
  assert.equal(look.open, false);
  assert.ok(look.why.en && look.why.hi);
  p.gunas = freshGunas();
  assert.equal(passes(p, look.require), true);
  for (const sit of Object.values(SITUATIONS)) assert.ok(sit.options.some(o => !o.require));
});

test("a computer chooses without touching the dice, and only what is open", () => {
  const s = game(56), plan = planTurn(s, 3), before = { ...s.rng };
  s.players[0].gunas = { s: 0.2, r: 0.6, t: 0.2 };
  for (let i = 0; i < 40; i++) { s.players[0].life = Array(i).fill(1); assert.notEqual(choiceFor(s, SITUATIONS[59]), "look"); }
  assert.deepEqual(s.rng, before);
  assert.equal(choiceFor(s, plan.situation), choiceFor(s, plan.situation));
  policy("honest", () => assert.equal(choiceFor(game(52), SITUATIONS[55]), "return"));
  policy("dishonest", () => assert.equal(choiceFor(game(52), SITUATIONS[55]), "keep"));
});

test("the dishonest player plays the board as it was: every least-worth option is the old snake, ladder or square", () => {
  const saved = { ...SITUATIONS };
  const run = () => Array.from({ length: 300 }, (_, i) => playGame(i + 1, { players: 2 })).map(g => JSON.stringify([g.log, g.turns, g.winner, g.players.map(p => [p.life, p.years])]));
  const crooked = policy("dishonest", run);
  for (const k of Object.keys(SITUATIONS)) delete SITUATIONS[k];
  try { assert.deepEqual(run(), crooked); } finally { Object.assign(SITUATIONS, saved); }
});

test("the account tells the outcome chosen, passes the years silently, and keeps callbacks to the moment named", () => {
  const kept = all(lived([55, 55, 55], ["return", "stay", "stay"]));
  assert.match(kept, /goes back to the counter with the extra change/);
  assert.doesNotMatch(kept, /pockets it quietly|sat .* out/);
  // the snake option is the square's own moment, and its tail follows as before
  assert.match(all(lived([55, 43], ["keep", null])), /pockets it quietly[\s\S]*years came undone/);
  // 30 calls back 19's lie: said after the sea, not after the truth
  const echo = SQ[30].echo.en.trim().slice(0, 20);
  assert.ok(all(lived([19, 11, 15, 30], ["sea", null, null, null])).includes(echo));
  assert.ok(!all(lived([19, 19, 19, 19, 19, 20, 30], ["home", "stay", "stay", "stay", "stay", null, null])).includes(echo));
  assert.equal(momentOf(55, "keep").own, true);
  assert.equal(momentOf(55, "return").own, false);
});

test("every prompt and outcome agrees in Hindi for a man and a woman, and leaves no choice unmade", () => {
  for (const [n, sit] of Object.entries(SITUATIONS)) {
    const texts = [sit.prompt, ...sit.options.flatMap(o => [o.outcome, o.outcome?.mirror].filter(Boolean)), ...sit.options.map(o => o.label), ...sit.options.map(o => o.why).filter(Boolean)];
    for (const m of texts) {
      for (const gender of ["m", "f", "n"]) for (const l of ["en", "hi"]) assert.doesNotMatch(fill(m[l], { name: "Asha", gender, age: "x" }), /[{}|]/, `situation ${n} ${l} ${gender}`);
      if (/\{[^{}]*\|/.test(m.hi)) assert.notEqual(fill(m.hi, { name: "A", gender: "m", age: "x" }), fill(m.hi, { name: "A", gender: "f", age: "x" }), `situation ${n}`);
    }
  }
});

test("the lint: cheaper, never further; never every option withheld; a gate says why", () => {
  const lints = (n, edit) => { const saved = JSON.stringify(SITUATIONS[n]); edit(SITUATIONS[n]); try { return lintContent(); } finally { SITUATIONS[n] = JSON.parse(saved); } };
  const opt = (sit, id) => sit.options.find(o => o.id === id);
  assert.ok(lints(28, s => { opt(s, "lie").cost = 2; }).some(e => e.includes("situations.28: the option worth least (lie) costs more years")));
  assert.ok(lints(12, s => { opt(s, "lie").move = "ladder"; opt(s, "laugh").move = "here"; }).some(e => e.includes("goes further than the one worth most (laugh)")));
  assert.ok(lints(56, s => { opt(s, "eaten").require = { guna: { r: { max: 0.5 } } }; opt(s, "eaten").why = opt(s, "give").why; }).some(e => e.includes("can withhold every option")));
  assert.ok(lints(59, s => { delete opt(s, "look").why; }).some(e => e.includes("situations.59.look why")));
  assert.ok(lints(59, s => { opt(s, "look").require = { guna: { r: { min: 2 } } }; }).some(e => e.includes("min 2 cannot be passed")));
  assert.ok(lints(55, s => { opt(s, "return").move = "ladder"; }).some(e => e.includes("takes a ladder on a square that has none")));
});
