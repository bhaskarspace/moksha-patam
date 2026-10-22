// Phase 8: the life account's joins, folds, opening and ending (src/engine/account.js).
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn } from "../src/engine/turn.js";
import { lifeOf, lifeText } from "../src/engine/account.js";
import { castFill } from "../src/i18n.js";
import { JOINS, SQ, SNAKES, CAST, GOAL, squareOf } from "../src/content.js";
import { debtsIn, refusalIn } from "../src/engine/karma.js";

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
// the prose as Phase 8–10 pinned it: with the cast stripped, every account is the one Phase 10 wrote (Phase 10C)
const uncast = fn => () => { const names = CAST.names; CAST.names = null; try { fn(); } finally { CAST.names = names; } };
const all = (s, l = "en") => lifeOf(s, 0, l).paras.map(p => p.text).join(" ");
// Seed 83 as Phase 8 played it, before the endgame's two dice: pinned, so the account is tested apart from the rules
const seed83 = () => {
  const s = lived([3, 8, 9, 10, 13, 18, 20, 25, 31, 32, 34, 53, 59, 50, 56, 60, 61, 65, 83, 89, 90, 95, 99, 61, 67, 68, 72, 89, 92, 97, 102, 106, 110, 106, 108, 108, 110, 104, 105], { years: 94, peak: 2 });
  s.winner = 0; s.over = true;
  return s;
};
// Seed 23 as Phase 8 played it: 55 turns, three times round the 99 → 61 loop, dead at a hundred and eleven
const SEED23 = [6, 15, 18, 20, 25, 29, 17, 20, 24, 25, 27, 31, 32, 37, 42, 43, 48, 49, 52, 56, 57, 75, 81, 83, 89, 91, 93, 64, 69, 52, 54, 55, 43, 46, 51, 67, 72, 89, 92, 98, 99, 61, 63, 64, 66, 72, 89, 92, 97, 99, 61, 64, 70, 73, 76, 81, 85, 94, 96, 99, 61, 63, 68, 74, 80, 82, 88, 71, 77, 58];
const seed23 = () => lived(SEED23, { years: 111, dead: true, holding: 99 });

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
  // the ages are the ones that ground was first walked at, and the line says so
  assert.match(text, /Meera went back over ground first walked at forty-three to forty-six\./);
  assert.doesNotMatch(text, /a second time/);
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
  // the joins that are whole sentences, or a part of one, stand alone
  const whole = ["foldRun", "foldOne", "foldHeights", "snakeAgain", "ladderAgain", "tallySnake", "tallyLadder", "times", "sitOne", "sitRun", "backTo"];
  for (const [k, j] of Object.entries(JOINS)) if (k !== "about" && !whole.includes(k)) for (const x of [j].flat()) for (const l of ["en", "hi"]) assert.ok(x[l].endsWith(" "), `${k} ${l}`);
  for (let seed = 1; seed <= 150; seed++) for (const l of ["en", "hi"]) for (const g of ["m", "f", "n"]) {
    const text = lifeText(meera(seed, g), 0, l);
    assert.doesNotMatch(text, /[{}]|undefined|NaN|null/, `seed ${seed} ${l} ${g}`);
  }
});

// REDESIGN.md Phase 12: the throw past 110 ends the life on a line of its own: the realm reached, the merit spent, and
// what was still held, the vice a death would have named.
test("a life that fell from the heavens closes on the realm, the merit spent and what it still held", uncast(() => {
  // a life that fell carrying an unmet debt closes on it instead (below); these two carry none
  let held = null, free = null;
  for (let seed = 1; !(held && free); seed++) {
    const g = meera(seed), p = g.players[0];
    if (!p.fell || p.karma.sancita.length || p.refusals.length) continue;
    if (p.holding) held ||= seed; else free ||= seed;
  }
  for (const [seed, holds] of [[held, true], [free, false]]) {
    const f = meera(seed), m = meera(seed, "m"), p = f.players[0];
    const realm = squareOf(Math.max(...p.life));
    const en = lifeOf(f, 0, "en").end;
    assert.ok(en.startsWith(`Meera rose as far as the realm of ${realm.en} and lived there on what had been earned below`), en);
    assert.ok(holds ? en.endsWith(`world, ${SNAKES[p.holding].holding.en.replace(/\{\w+=([^}]*)\}/g, "$1").replaceAll("{name}", "Meera")}.`) : en.endsWith("with nothing in particular in hand."), en);
    // Hindi agrees with who lived it
    const hf = lifeOf(f, 0, "hi").end, hm = lifeOf(m, 0, "hi").end;
    assert.ok(hf.startsWith(`Meera ${realm.hi} के लोक तक पहुँची,`) && hf.includes("लौट आई"), hf);
    assert.ok(hm.startsWith(`Meera ${realm.hi} के लोक तक पहुँचा,`) && hm.includes("लौट आया"), hm);
    assert.ok(!/[{}]/.test(en + hf + hm));
  }
}));

// Bhaskar's check of Phase 12: a life the door refused, that then fell, closes on what the door named, in the door's
// words, and its account says the refusal where it came, in one line joined as a snake is.
test("a life the door refused closes on what the door named, and the refusal is told where it came", uncast(() => {
  let seed = 1;
  for (; ; seed++) { const p = meera(seed).players[0]; if (p.fell && p.refusals.some(r => r.debts) && p.karma.sancita.length) break; }
  const f = meera(seed), p = f.players[0], who = l => ({ name: "Meera", gender: "f" });
  for (const l of ["en", "hi"]) {
    const life = lifeOf(f, 0, l), text = lifeText(f, 0, l), debts = debtsIn(l, p.karma.sancita, who(l));
    assert.ok(life.end.includes(debts), life.end);
    assert.ok(!life.end.includes("nothing in particular") && !life.end.includes("कुछ ख़ास लिए बिना"), life.end);
    const said = refusalIn(l, p.refusals[0], who(l))[0], join = JOINS.door[l].split("{age}")[1];
    assert.ok(text.includes(join) && text.includes(l === "en" ? said[0].toLowerCase() + said.slice(1) : said), text);
    assert.equal(text.split(join).length - 1, p.refusals.length);
  }
  // the door's own card heads itself as the door that did not open (src/render/card.js), which no test reaches in node;
  // here, only that it was refused at the exit
  assert.ok(p.life.includes(GOAL));
}));

test("the opening knows the shape of the life and says only what happened", () => {
  assert.equal(lifeOf(seed83(), 0, "en").open, "Meera lived to ninety-four, and at eighty-nine had to begin again.");
  assert.equal(lifeOf(lived([1, 5, 9]), 0, "en").open, "Nothing in Meera's life went backwards.");
});

test("a life that ran out of years ends on what it was still holding, carried in the state for Phase 12", uncast(() => {
  let s = null;
  for (let seed = 1; !s; seed++) { const g = meera(seed); if (g.players[0].dead) s = g; }
  const p = s.players[0], { open, end } = lifeOf(s, 0, "en");
  assert.match(open, /^Meera ran out of years at a hundred and/);
  assert.ok(end.startsWith(`Meera's years ran out at ${"a hundred and"}`), end);
  assert.ok(end.includes("on ground already walked once, still "), end);
  assert.ok(end.endsWith(castFill(squareOf(p.holding).holding.en).replace("{name}", "Meera") + "."), end);
  assert.match(lifeOf(s, 0, "hi").end, /उस राह पर जो एक बार चली जा चुकी थी, अब भी/);
  assert.doesNotMatch(lifeText(s, 0, "en"), /nobody won|no one/i);
}));

test("an unbroken climb reads every age as the square wrote it", () => {
  const climb = [1, 5, 9, 13, 18, 22, 27];
  const text = all(lived(climb));
  for (const n of [5, 9, 13, 18, 22, 27]) assert.ok(text.includes(SQ[n].moment.en.replace(/^\{name\} is \{age\}/, "").slice(0, 25)), `square ${n}`);
  assert.match(text, /Meera is one\./);
  assert.match(text, /Meera is sixteen and asks the big question/);
});

test("the seed-83 life, as a whole", uncast(() => {
  const text = lifeText(seed83(), 0, "en");
  assert.match(text, /^The life of Meera\nMumukṣu · longing to be free\n\nMeera lived to ninety-four/);
  assert.match(text, /That same year, Meera is eighteen and stirs sugar into tea/);
  assert.match(text, /Long after the hour asleep on that chest, Meera is thirty-nine/);
  // 61 was walked at fifty-one before the snake brought her back to it, so it is not told twice
  assert.match(text, /With that, thirty-eight years came undone, and Meera is still eighty-nine and back where Meera was at fifty-one\./);
  assert.equal(text.split("starts again from the beginning").length - 1, 1);
  assert.match(text, /And the same heights again\./);
  // a life let go names what it put down: the vice taken most, the latest on a tie, as a death names it held
  assert.match(text, /Then, at ninety-four, moksha, and Meera put down the body that seemed to settle it\.\n$/);
}));

// ---- Phase 9 ----
test("seed 23: a life stuck in the 99 → 61 loop reads as stuck in one line, not three verbatim cycles", () => {
  const s = seed23(), text = all(s);
  const count = re => (text.match(re) || []).length;
  assert.equal(count(/looks in the mirror and is satisfied/g), 1);
  assert.equal(count(/starts again from the beginning/g), 1);
  // the second time is one line, and the third only counted
  assert.match(text, /At ninety-six, Ego again, and thirty-eight more years came undone\./);
  assert.match(text, /Ego took Meera back three times in all, the last time at a hundred and four\./);
  // a ladder top already told, climbed to again, says only where it was first lived
  assert.match(text, /And so, Meera is eighty-seven and back where Meera was at seventy-seven\./);
  // the fold names the age the ground was first walked at, never the square's own age read as if it were now
  assert.doesNotMatch(text, /through fifty-three/);
  assert.match(text, /Meera went back over ground first walked at eighty-one\./);
  // no moment is told in full more than twice in the whole life
  for (const n of new Set(SEED23)) { const m = squareOf(n)?.moment?.en; if (m) assert.ok(text.split(m.split("{age}").at(-1).slice(0, 30)).length - 1 <= 2, `square ${n}`); }
  const hi = all(s, "hi");
  assert.match(hi, /छियानवे बरस पर फिर अहंकार, और अड़तीस बरस और अनकिए हो गए।/);
  assert.match(hi, /अहंकार से Meera कुल तीन बार पीछे गिरी, आख़िरी बार एक सौ चार बरस पर।/);
});

test("a ladder climbed a second time is one line, and from the third a tally", () => {
  // 72 → 89, three times, walking 89 → 92 → 72 is not possible, so each climb starts from the snake at 88 → 71
  const s = lived([71, 72, 89, 88, 71, 72, 89, 88, 71, 72, 89], { years: 90 }), text = all(s);
  assert.match(text, /lifted Meera again\./);
  assert.match(text, /Austerity lifted Meera three times in all/);
});

test("years sat out in practice are told as one line, at the years they were sat", () => {
  // 95 is eighty-three, and each year sat is a year more
  const one = all(lived([95, 95], { years: 84 }));
  assert.match(one, /Meera sat the year out in practice, at eighty-four\./);
  const run = all(lived([95, 95, 95, 95, 96], { years: 86 }));
  assert.match(run, /Meera sat three years out in practice, from eighty-four to eighty-six\./);
  assert.match(all(lived([95, 95, 95], { years: 85 }), "hi"), /Meera चौरासी से पचासी बरस तक, दो बरस, अभ्यास में बैठी रही।/);
});

test("a moment that opens on a one-letter word reads on after a join, and 'I' is left alone", () => {
  // 109's moment is "A habit {name} started…"
  assert.match(all(lived([107, 109])), /(Then|Later,|After a while,|In time,) a habit Meera started is still kept/);
  assert.doesNotMatch(all(lived([107, 109])), / A habit/);
});

test("a life let go with no vice taken has nothing to put down", () => {
  const s = lived([1, 5, 9], { years: 88 });
  s.winner = 0; s.over = true;
  assert.equal(lifeOf(s, 0, "en").end, "Then, at eighty-eight, moksha, with nothing to put down.");
  assert.equal(lifeOf(s, 0, "hi").end, "फिर, अट्ठासी बरस पर, मोक्ष, और छोड़ने को कुछ था ही नहीं।");
  const v = lived([13, 14, 8], { years: 88 });
  v.winner = 0; v.over = true;
  assert.equal(lifeOf(v, 0, "en").end, "Then, at eighty-eight, moksha, and Meera put down what was told in confidence.");
  assert.match(lifeOf(v, 0, "hi").end, /और Meera ने भरोसे में कही बात कह देने की आदत को छोड़ दिया।$/);
});
