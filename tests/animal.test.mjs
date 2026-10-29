// REDESIGN.md Phase 16: the animal interlude (src/engine/animal.js). A death by ledger is born an animal first, the
// Panchatantra creature of the vice it held, on squares 1 to 40 for at most fifteen throws; the human birth is earned
// back at the forest's edge, and it can never become a trap.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn, planTurn, endTurn } from "../src/engine/turn.js";
import { ANIMAL_TOP, ANIMAL_TURNS, animalOf, animalRules, afterAnimal, masterOf, interludeFor } from "../src/engine/animal.js";
import { soulOf, bornOf, validSoul } from "../src/engine/samskara.js";
import { lifeOf, lifeText, pathOf } from "../src/engine/account.js";
import { birthRanking } from "../tools/lint-content.mjs";
import { firstLives } from "./lives.mjs";

const cast = [{ role: "friend", gender: "m", en: "Rohan", hi: "रोहन" }, { role: "rival", gender: "f", en: "Nīrā", hi: "नीरा" }];
const interlude = (seed, kind = "tortoise", round = 1) => {
  const s = createGame({ players: [{ name: "", alias: { en: "Ravi", hi: "रवि" }, type: "cpu", gender: "m" }], rules: animalRules({ kind, master: masterOf(cast), round }, { six: true }), seed });
  while (!s.over) playTurn(s);
  return s;
};

test("an interlude is at most fifteen throws on 1 to 40, one die, no omen, no choice, no seed, no curse", () => {
  let earned = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const s = interlude(seed), p = s.players[0];
    assert.ok(p.throws <= ANIMAL_TURNS, `seed ${seed}: ${p.throws} throws`);
    assert.ok(p.earned !== !!p.short, `seed ${seed}: ended one way`);
    // nothing past the forest's edge but a ladder's top that carries the animal out of it
    assert.ok(p.life.every((n, k) => n <= ANIMAL_TOP || p.life[k - 1] < ANIMAL_TOP && p.earned), `seed ${seed}: ${p.life}`);
    assert.equal(s.winner, null);
    assert.ok(!p.reckonings.length && !p.witness.length && !p.curse && !p.karma.agami.length, `seed ${seed}`);
    assert.ok(s.log.every(e => !/^l(Reckon|Six|Ego|Refused|Died)/.test(e.k)), `seed ${seed}`);
    earned += !!p.earned;
  }
  // most earn it, some do not
  assert.ok(earned > 300 && earned < 400, `${earned} of 400 earned`);
});

test("a throw that reaches the forest's edge earns the human birth, and the throws running out falls short", () => {
  const s = interlude(1);
  const t = createGame({ players: [{ name: "", alias: { en: "Ravi", hi: "रवि" }, type: "cpu", gender: "m" }], rules: s.rules, seed: 1 });
  t.players[0].pos = 37;
  const plan = planTurn(t, 5);
  assert.ok(plan.earned && plan.final === ANIMAL_TOP && !plan.fell);
  endTurn(t, plan);
  assert.ok(t.over && t.players[0].earned && t.winner === null);
  const u = createGame({ players: [{ name: "", alias: { en: "Ravi", hi: "रवि" }, type: "cpu", gender: "m" }], rules: s.rules, seed: 1 });
  for (let k = 0; k < ANIMAL_TURNS; k++) { u.players[0].pos = 1; endTurn(u, planTurn(u, 1)); }
  assert.ok(u.over && u.players[0].short);
});

test("the animal is the creature of the vice held, and the master the rival, or else the friend", () => {
  assert.equal(animalOf(14), "tortoise");
  assert.equal(animalOf(19), "jackal");
  assert.equal(animalOf(55), "jackal");
  assert.equal(animalOf(59), "mongoose");
  assert.equal(animalOf(88), "cat");
  assert.equal(animalOf(39), "lion");
  assert.equal(animalOf(null), "tortoise");
  assert.equal(masterOf(cast).en, "Nīrā");
  assert.equal(masterOf(cast.slice(0, 1)).en, "Rohan");
  assert.equal(masterOf([]), null);
  // a death by ledger is owed one, from its own cast; any other end is not
  let owed = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const s = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f" }], rules: { six: true }, seed });
    while (!s.over) playTurn(s);
    const f = firstLives(s), soul = soulOf(f, 0), p = f.players[0];
    if (!soul) continue;
    assert.equal(!!soul.animal, p.death?.by === "ledger", `seed ${seed}`);
    assert.ok(validSoul(soul));
    if (!soul.animal) continue;
    owed++;
    assert.deepEqual(soul.animal, interludeFor(soul.last.holding, soul.cast));
    const m = soul.animal.master;
    if (m) assert.ok(soul.cast.some(c => c.en === m.en && (c.role === "rival" || c.role === "friend")));
  }
  assert.ok(owed > 3, `${owed} interludes owed`);
});

test("two short rounds give a human birth regardless; earned nudges the next life toward sattva and dreams the animal", () => {
  const soul = { v: 1, lives: 1, last: { name: { en: "Meera", hi: "मीरा" }, gender: "f", end: "ledger", age: 70, gunas: { s: 0.2, r: 0.4, t: 0.4 }, peak: null, holding: 19 }, sancita: [], cast, dream: null, animal: interludeFor(19, cast) };
  const once = afterAnimal(soul, false);
  assert.equal(once.animal.round, 2);
  const twice = afterAnimal(once, false);
  assert.equal(twice.animal, null);
  assert.equal(twice.nudge, undefined);
  const won = afterAnimal(soul, true);
  assert.equal(won.animal, null);
  assert.ok(bornOf(won).gunas.s > bornOf(twice).gunas.s);
  assert.equal(bornOf(won).prior.was, "jackal");
  const s = createGame({ players: [{ name: "", alias: { en: "Ravi", hi: "रवि" }, type: "cpu", gender: "m", born: bornOf(won) }], rules: { six: true }, seed: 3 });
  while (!s.over) playTurn(s);
  assert.match(lifeOf(firstLives(s), 0, "en").open, /Some nights Ravi dreams of being a jackal\./);
  assert.match(lifeOf(firstLives(s), 0, "hi").open, /कुछ रातों को रवि सपना देखता है कि वह एक सियार है।/);
});

test("the interlude's account names the animal and its master, tells its fables as the moment, and has no years", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const s = interlude(seed, "lion");
    const en = lifeText(s, 0, "en"), hi = lifeText(s, 0, "hi");
    assert.match(en, /^Ravi, the lion\n\nRavi was born a lion this time, in Nīrā's house\./);
    assert.match(hi, /रवि का जन्म इस बार शेर के रूप में हुआ, नीरा के घर में।/);
    for (const t of [en, hi]) assert.doesNotMatch(t, /[{}]|undefined|null|NaN|\d|[०-९]/, `seed ${seed}`);
    assert.ok(pathOf(s, 0, "en").rows.every(r => r.age === ""));
    for (const t of [en, hi]) assert.deepEqual(birthRanking(t), []);
  }
  assert.deepEqual(birthRanking("a lower birth, as a dog"), ["lower birth"]);
  assert.deepEqual(birthRanking("नीच योनि में जन्म"), ["नीच योनि"]);
});
