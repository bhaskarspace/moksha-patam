// Phase 8: the life account's joins, folds, opening and ending (src/engine/account.js).
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn } from "../src/engine/turn.js";
import { lifeOf, lifeText } from "../src/engine/account.js";
import { JOINS, SQ, squareOf } from "../src/content.js";

const meera = (seed, gender = "f") => {
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender }], rules: { six: true }, seed });
  while (!s.over) playTurn(s);
  return s;
};
// a game whose one life is exactly these squares
const lived = (life, extra = {}) => {
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f" }], rules: { six: true }, seed: 7 });
  Object.assign(s.players[0], { life, pos: life.at(-1), ...extra });
  return s;
};
const all = (s, l = "en") => lifeOf(s, 0, l).paras.map(p => p.text).join(" ");

test("a snake names the years it undid and never says time moved on; the moment says the same age, still", () => {
  const s = lived([95, 99, 61], { years: 89 });
  const text = all(s);
  assert.match(text, /With that, thirty-eight years came undone, and Meera is still eighty-nine and starts again/);
  assert.doesNotMatch(text, /Afterwards|fifty-one/);
  assert.match(all(s, "hi"), /उसी पल अड़तीस बरस का किया-धरा अनकिया हो गया, और Meera अब भी नवासी बरस की है।/);
});

test("an echo is said when the square it calls back to is in this life, and only then", () => {
  // 53 calls back to 3; reached by the 34 → 53 ladder, the echo is said instead of "And so"
  assert.match(all(lived([3, 34, 53])), /Long after the hour asleep on that chest, Meera is thirty-nine/);
  assert.match(all(lived([30, 34, 53])), /And so, Meera is thirty-nine/);
  // across the fall from Brahma it is another life, and the echo is not said
  assert.doesNotMatch(all(lived([3, 34, 53, 100, 106, 108, 1, 5, 34, 53])).split("Born again")[1] || "", /Long after the hour/);
});

test("the same year, the same months, and a long quiet stretch are each said", () => {
  assert.match(all(lived([31, 32])), /That same year, Meera is eighteen and stirs sugar/);
  assert.match(all(lived([2, 3])), /Within months, /);
  assert.match(all(lived([46, 54])), /Nine quiet years later, Meera is forty/);
});

test("squares lived a second time are folded, not told again", () => {
  // 59 → 50, then 51…57 again on foot: 50 and 56 are new, 58 already told
  const s = lived([56, 58, 59, 50, 56, 58], { years: 50 });
  const text = all(s);
  assert.equal(text.split("cannot get the lid off a jar").length - 1, 1);
  assert.match(text, /Meera walked through forty-three to forty-six a second time\./);
  // above the world, the same heights again
  assert.match(all(lived([102, 106, 110, 106, 102])), /And the same heights again\./);
});

test("the plain joins are drawn per life from the seed, not by position in a cycle of four", () => {
  const s = meera(83), a = lifeText(s, 0, "en"), b = lifeText(meera(83), 0, "en");
  assert.equal(a, b);
  const thens = [...a.matchAll(/(?:^|\. )(Then|Later,|After a while,|In time,) /gm)].map(m => m[1]);
  const cycle = thens.every((x, i) => i < 4 || x === thens[i - 4]);
  assert.ok(thens.length > 8 && !cycle, thens.join(" "));
  // and never the same one twice running
  assert.ok(thens.every((x, i) => !i || x !== thens[i - 1]));
});

test("every join reads on into its moment, and nothing is left unfilled in either language", () => {
  for (const [k, j] of Object.entries(JOINS)) if (k !== "about" && !k.startsWith("fold")) for (const x of [j].flat()) for (const l of ["en", "hi"]) assert.ok(x[l].endsWith(" "), `${k} ${l}`);
  for (let seed = 1; seed <= 150; seed++) for (const l of ["en", "hi"]) for (const g of ["m", "f", "n"]) {
    const text = lifeText(meera(seed, g), 0, l);
    assert.doesNotMatch(text, /[{}]|undefined|NaN|null/, `seed ${seed} ${l} ${g}`);
  }
});

test("the opening knows the shape of the life and says only what happened", () => {
  assert.equal(lifeOf(meera(83), 0, "en").open, "Meera lived to ninety-four, and at eighty-nine had to begin again.");
  assert.equal(lifeOf(lived([1, 5, 9]), 0, "en").open, "Nothing in Meera's life went backwards.");
  assert.equal(lifeOf(lived([1, 108, 1]), 0, "en").open, "Meera was born twice.");
  assert.equal(lifeOf(lived([1, 108, 1]), 0, "hi").open, "Meera का जन्म दो बार हुआ।");
});

test("a life that ran out of years ends on what it was still holding, carried in the state for Phase 12", () => {
  let s = null;
  // a life that died without first falling from Brahma, which the opening would name instead
  for (let seed = 1; !s; seed++) { const g = meera(seed); if (g.players[0].dead && !g.players[0].hasFallen) s = g; }
  const p = s.players[0], { open, end } = lifeOf(s, 0, "en");
  assert.match(open, /^Meera ran out of years at a hundred and/);
  assert.ok(end.startsWith(`Meera's years ran out at ${"a hundred and"}`), end);
  assert.ok(end.includes("on ground already walked once, still "), end);
  assert.ok(end.endsWith(squareOf(p.holding).holding.en.replace("{name}", "Meera") + "."), end);
  assert.match(lifeOf(s, 0, "hi").end, /उस राह पर जो एक बार चली जा चुकी थी, अब भी/);
  assert.doesNotMatch(lifeText(s, 0, "en"), /nobody won|no one/i);
});

test("an unbroken climb reads every age as the square wrote it", () => {
  const climb = [1, 5, 9, 13, 18, 22, 27];
  const text = all(lived(climb));
  for (const n of [5, 9, 13, 18, 22, 27]) assert.ok(text.includes(SQ[n].moment.en.replace(/^\{name\} is \{age\}/, "").slice(0, 25)), `square ${n}`);
  assert.match(text, /Meera is one\./);
  assert.match(text, /Meera is sixteen and asks the big question/);
});

test("the seed-83 life, as a whole", () => {
  const text = lifeText(meera(83), 0, "en");
  assert.match(text, /^The life of Meera\nMumukṣu · longing to be free\n\nMeera lived to ninety-four/);
  assert.match(text, /That same year, Meera is eighteen and stirs sugar into tea/);
  assert.match(text, /Long after the hour asleep on that chest, Meera is thirty-nine/);
  assert.match(text, /With that, thirty-eight years came undone, and Meera is still eighty-nine and starts again/);
  assert.match(text, /And the same heights again\./);
  assert.match(text, /Then, moksha\.\n$/);
});
