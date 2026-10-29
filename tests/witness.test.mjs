// Phase 15: the witness. The ego's throw on the five ego tests (src/engine/qbn.js egoFaces, egoThrow), what the life
// takes when it rebels, what the player records (p.witness), and how the account and the cast tell it.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, planTurn, playTurn, endTurn, resolveChoice } from "../src/engine/turn.js";
import { egoOf, egoFaces, egoThrow, setPolicy, optionOf } from "../src/engine/qbn.js";
import { lifeOf, lifeText } from "../src/engine/account.js";
import { SITUATIONS, SNAKES } from "../src/content.js";
import { fill } from "../src/i18n.js";
import { firstLives } from "./lives.mjs";

const TESTS = { 49: "first", 54: "claim", 55: "keep", 56: "eaten", 59: "strike" };
const game = (pos, seed = 1) => {
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f" }], rules: { six: true }, seed });
  s.players[0].pos = pos;
  return s;
};
const policy = (x, fn) => { setPolicy(x); try { return fn(); } finally { setPolicy("mixed"); } };

test("five situations are ego tests, each naming the lower option the ego pulls toward", () => {
  const tagged = Object.keys(SITUATIONS).filter(n => egoOf(+n)).map(Number);
  assert.deepEqual(tagged, [49, 54, 55, 56, 59]);
  for (const [n, id] of Object.entries(TESTS)) {
    assert.equal(egoOf(+n).lower, id);
    assert.ok(optionOf(+n, id).seed, `${n}.${id} plants a debt`);
  }
});

test("the ego's faces follow the gunas: a 6 if sattva leads, 5–6 if mixed, 4–6 if rajas or tamas leads, none at the highest bhumikas", () => {
  assert.deepEqual(egoFaces({ gunas: { s: 0.6, r: 0.2, t: 0.2 } }), [6]);
  assert.deepEqual(egoFaces({ gunas: { s: 1 / 3, r: 1 / 3, t: 1 / 3 } }), [5, 6]);
  assert.deepEqual(egoFaces({ gunas: { s: 0.2, r: 0.6, t: 0.2 } }), [4, 5, 6]);
  assert.deepEqual(egoFaces({ gunas: { s: 0.2, r: 0.2, t: 0.6 } }), [4, 5, 6]);
  assert.deepEqual(egoFaces({ gunas: { s: 0.8, r: 0.1, t: 0.1 }, bhumika: 5 }), []);
  assert.deepEqual(egoFaces({ gunas: { s: 0.6, r: 0.2, t: 0.2 }, bhumika: 4 }), [6]);
});

test("the faces are on the plan before the choice; only an ego test carries them", () => {
  const s = game(52);
  assert.deepEqual(planTurn(s, 3).egoFaces, [5, 6]);
  assert.equal(planTurn(game(25), 3).egoFaces, null);
});

test("the ego's throw is a sequence of its own: the dice that move the token never change", () => {
  const s = game(52), before = { ...s.rng };
  egoThrow(s, 0, 4);
  resolveChoice(s, planTurn(s, 3), "return");
  assert.deepEqual(s.rng, before);
  // and it is the same throw every time it is asked for
  assert.equal(egoThrow(s, 0, 4), egoThrow(s, 0, 4));
});

test("choosing the lower option makes no throw: the ego already agrees", () => {
  const s = game(52);
  s.forceEgo = [1, 2, 3, 4, 5, 6];
  const plan = resolveChoice(s, planTurn(s, 3), "keep");
  assert.equal(plan.ego, undefined);
  assert.equal(plan.choice, "keep");
});

test("on an ego face the life takes the lower option: its move, years, guna, aims and seed", () => {
  const a = game(52), b = game(52);
  a.forceEgo = [1, 2, 3, 4, 5, 6];
  b.forceEgo = [];
  const rebelled = resolveChoice(a, planTurn(a, 3), "return"), held = resolveChoice(b, planTurn(b, 3), "return");
  assert.deepEqual(rebelled.ego.chose, "return");
  assert.deepEqual(rebelled.ego.took, "keep");
  assert.deepEqual([rebelled.jump, rebelled.cost, rebelled.mark.guna, rebelled.plant?.opt], [{ kind: "snake", to: SNAKES[55].to }, 0, "r", "keep"]);
  assert.deepEqual([held.ego.took, held.jump, held.cost, held.mark.guna, held.plant], ["return", null, 7, "s", null]);
  assert.ok(rebelled.after.some(e => e.k === "lEgoRebel") && held.after.some(e => e.k === "lEgoHeld"));
  // the debug faces are spent by the throw they forced
  endTurn(a, rebelled);
  assert.equal(a.forceEgo, undefined);
});

test("the player records what the witness chose and what the life did, where in the life", () => {
  const s = game(52);
  s.forceEgo = [1, 2, 3, 4, 5, 6];
  endTurn(s, resolveChoice(s, planTurn(s, 3), "return"));
  const [w] = s.players[0].witness;
  assert.deepEqual({ sq: w.sq, chose: w.chose, took: w.took, faces: w.faces }, { sq: 55, chose: "return", took: "keep", faces: [1, 2, 3, 4, 5, 6] });
  assert.equal(s.players[0].life[w.i], 55);
  // a choice that is not an ego test is recorded too, with no throw
  const t = game(25);
  endTurn(t, resolveChoice(t, planTurn(t, 3), "truth"));
  assert.deepEqual(t.players[0].witness, [{ sq: 28, chose: "truth", took: "truth", i: 0 }]);
});

test("the computer rebels by the same rule, and the account tells every rebellion in both languages", () => {
  let rebels = 0;
  policy("honest", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = createGame({ players: [{ name: "Meera", type: "cpu", gender: "m" }], rules: { six: true }, seed });
      while (!g.over) playTurn(g);
      const s = firstLives(g);
      const p = s.players[0], overruled = p.witness.filter(w => w.chose !== w.took);
      rebels += overruled.length;
      for (const w of overruled) {
        for (const l of ["en", "hi"]) {
          const line = fill(SITUATIONS[w.sq].ego.account[l], { name: "Meera", gender: "m" });
          assert.ok(lifeText(s, 0, l).includes(line), `seed ${seed} ${l}: the rebellion on ${w.sq} is told`);
        }
      }
    }
  });
  assert.ok(rebels > 30, `${rebels} rebellions in 300 honest lives`);
});

test("a cast member who returns is joined by what they saw the life do, and a rebellion is seen as the deed", () => {
  let any = 0, rebel = 0;
  policy("honest", () => {
    for (let seed = 1; seed <= 400 && !(any && rebel); seed++) {
      const g = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f" }], rules: { six: true }, seed });
      while (!g.over) playTurn(g);
      const s = firstLives(g), life = lifeOf(s, 0, "en"), text = life.paras.map(p => p.text).join(" ");
      if (life.witnessed) any++;
      if (/had meant to give a plate|never what Meera had meant/.test(text)) rebel++;
    }
  });
  assert.ok(any, "some return is joined by what was witnessed");
  assert.ok(rebel, "some return reacts to a rebellion");
});
