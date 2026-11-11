// An animal's life carries no person's name (reviewed 11 Nov): it is called by its kind and its household, "the tortoise
// in Vikram's house" / "विक्रम के घर का कछुआ", or "the tortoise at the edge of a village" with no master, in the account,
// the line, the players panel and the comparison (all through pnameIn); the soul keeps the last human life's name.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn } from "../src/engine/turn.js";
import { animalRules } from "../src/engine/animal.js";
import { lifeText } from "../src/engine/account.js";
import { pastOf } from "../src/engine/samskara.js";
import { pnameIn } from "../src/state.js";
import { tIn, fill, animalNameIn } from "../src/i18n.js";
import { PLAYER_NAMES } from "../src/content.js";

const PEOPLE = [PLAYER_NAMES, PLAYER_NAMES.again].flatMap(list => ["m", "f"].flatMap(g => list[g]));
const cpu = () => ({ name: "", type: "cpu", gender: "" });
const SHAPE_EN = /^The (tortoise|jackal|mongoose|cat|lion) (in \S+'s house|at the edge of a village)$/;
const SHAPE_HI = /^(\S+ के घर|गाँव के किनारे) (का|की) (कछुआ|सियार|नेवला|बिल्ली|शेर)$/;
// a person's name in a text, other than the master's, whose house it is
const othersIn = (text, master) => PEOPLE.filter(([en, hi]) => en !== master?.en && hi !== master?.hi && (new RegExp(`\\b${en}\\b`).test(text) || text.includes(hi)));

test("no animal life in a game played together carries a person's name, in its name or its book", () => {
  let animals = 0;
  for (let seed = 1; seed <= 120 && animals < 40; seed++) {
    const s = createGame({ players: [cpu(), cpu(), cpu(), cpu()], rules: { six: true, mode: "together" }, seed });
    for (let n = 0; n < 6000 && !s.over; n++) playTurn(s);
    s.players.forEach((p, i) => [...(p.past ?? []), p].forEach((q, k) => {
      if (!q.animal) return;
      animals++;
      assert.equal(q.name, "", `seed ${seed}: an animal has no name`);
      assert.equal(q.alias, null, `seed ${seed}: no name is drawn for an animal`);
      assert.match(pnameIn(q, "en"), SHAPE_EN);
      assert.match(pnameIn(q, "hi"), SHAPE_HI);
      const st = pastOf(s, i, k === (p.past ?? []).length ? null : k);
      for (const l of ["en", "hi"]) assert.deepEqual(othersIn(lifeText(st, i, l), q.animal.master), [], `seed ${seed}, seat ${i}, life ${k}, ${l}`);
    }));
  }
  assert.ok(animals >= 40, "animal lives seen: " + animals);
});

test("an interlude between games carries no name, whatever row it was given", () => {
  for (const kind of ["tortoise", "jackal", "mongoose", "cat", "lion"]) {
    const s = createGame({ players: [{ name: "Dev", alias: { en: "Ravi", hi: "रवि" }, type: "human", gender: "f" }], rules: animalRules({ kind, master: null, round: 1 }, { six: true }), seed: 3 });
    const p = s.players[0];
    assert.equal(p.name, "");
    assert.equal(p.alias, null);
    assert.equal(p.gender, kind === "cat" ? "f" : "m", "it agrees as its creature does");
    assert.match(pnameIn(p, "en"), / at the edge of a village$/);
  }
});

test("the name is said as a sentence needs it: lower case inside one, and in Hindi oblique before a postposition", () => {
  const a = { kind: "tortoise", master: { en: "Vikram", hi: "विक्रम" } }, en = animalNameIn("en", a), hi = animalNameIn("hi", a);
  assert.equal(en, "The tortoise in Vikram's house");
  assert.equal(hi, "विक्रम के घर का कछुआ");
  assert.equal(animalNameIn("hi", { kind: "cat", master: null }), "गाँव के किनारे की बिल्ली");
  assert.equal(tIn("en", "lAnimalShort", { name: en }), "The seasons turn, and the tortoise in Vikram's house is still in the forest.");
  assert.equal(tIn("en", "lMove", { name: en, v: 3, pos: 9, what: "x" }).slice(0, 32), "The tortoise in Vikram's house r");
  assert.equal(tIn("hi", "lMove", { name: hi, v: 3, pos: 9, what: "x" }).split(":")[0], "विक्रम के घर के कछुए का ३ आया");
  assert.equal(fill(tIn("hi", "lAnimalHuman", { name: hi }), { gender: "m" }).split(" तक")[0], "विक्रम के घर का कछुआ जंगल के किनारे");
  assert.equal(tIn("hi", "lAnimalShort", { name: hi }), "मौसम बदल गए, और विक्रम के घर का कछुआ अब भी जंगल में है।");
  // a person's name is said exactly as before
  assert.equal(tIn("en", "lAnimalShort", { name: "Dev" }), "The seasons turn, and Dev is still in the forest.");
  assert.equal(tIn("hi", "lMove", { name: "देव", v: 3, pos: 9, what: "x" }).split(":")[0], "देव का ३ आया");
});
