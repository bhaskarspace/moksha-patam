// REDESIGN.md Phase 16: the end of a life read three ways. The mirror's questions (src/engine/mirror.js) and the path
// (pathOf in src/engine/account.js).
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn, planTurn, resolveChoice, endTurn } from "../src/engine/turn.js";
import { mirrorOf, mirrorIn, mirrorIntroIn, ASKED } from "../src/engine/mirror.js";
import { pathOf, lifeText } from "../src/engine/account.js";
import { MIRROR } from "../src/content.js";

const life = (seed, gender = "f") => {
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender }], rules: { six: true }, seed });
  while (!s.over) playTurn(s);
  return s;
};

test("three questions a life, never one twice, the same for the same game, and nothing written", () => {
  const seen = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const s = life(seed), before = JSON.stringify(s), m = mirrorOf(s, 0);
    assert.equal(m.length, ASKED, `seed ${seed}`);
    assert.equal(new Set(m.map(x => x.id)).size, ASKED, `seed ${seed}`);
    assert.deepEqual(mirrorOf(life(seed), 0), m);
    for (const l of ["en", "hi"]) for (const x of m) {
      const q = mirrorIn(l, x);
      assert.ok(q.length > 10 && !/[{}]|undefined|null|\d/.test(q), `seed ${seed} ${l}: ${q}`);
    }
    assert.equal(JSON.stringify(s), before, "the mirror wrote to the state");
    m.forEach(x => seen.add(x.id));
  }
  // every question is asked of some life
  assert.deepEqual([...seen].sort(), MIRROR.questions.map(q => q.id).sort());
  for (const l of ["en", "hi"]) assert.ok(mirrorIntroIn(l));
});

test("a rebellion is always asked about first, by what was chosen and what the life took", () => {
  // square 55 at forty-two: the change given back, and the ego's die takes it
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f" }], rules: { six: true }, seed: 1 });
  s.players[0].pos = 52;
  s.forceEgo = [1, 2, 3, 4, 5, 6];
  endTurn(s, resolveChoice(s, planTurn(s, 3), "return"));
  s.forceEgo = [];
  while (!s.over) playTurn(s);
  const m = mirrorOf(s, 0);
  assert.equal(m[0].id, "rebel");
  assert.equal(mirrorIn("en", m[0]), "At forty-two you chose to give the change back, and the life kept it. Which of you was it?");
  assert.equal(mirrorIn("hi", m[0]), "बयालीस बरस पर आपने छुट्टा लौटाना चुना था, और जीवन ने उसे रख लिया। उन दोनों में आप कौन थे?");
  // and in lives where the ego rebelled on its own
  let rebels = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const t = life(seed), p = t.players[0];
    if (!(p.witness ?? []).some(w => w.chose !== w.took)) continue;
    rebels++;
    assert.equal(mirrorOf(t, 0)[0].id, "rebel", `seed ${seed}`);
  }
  assert.ok(rebels > 20, `${rebels} lives rebelled`);
});

test("the path is the life's moves in words, and ends on how the life ended", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const s = life(seed), p = s.players[0];
    for (const l of ["en", "hi"]) {
      const { rows, end } = pathOf(s, 0, l);
      assert.ok(rows.length > 5 && rows.every(r => r.age && r.sq), `seed ${seed}`);
      assert.ok(!rows.some(r => /\d|[{}]/.test(r.age + r.sq + r.via)), `seed ${seed} ${l}`);
      assert.equal(!!end, true);
    }
    const { end } = pathOf(s, 0, "en");
    assert.equal(end, s.winner === 0 ? "Through the door" : p.fell ? "The fall" : "Death");
  }
  // the book is unchanged by either: the Citragupta line belongs to the dialog, not to the account
  assert.doesNotMatch(lifeText(life(3), 0, "en"), /Citragupta reads/);
});
