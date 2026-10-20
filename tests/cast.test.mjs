// Phase 10C: the cast (src/engine/cast.js, src/i18n.js castFill) and what it does to the life account.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn } from "../src/engine/turn.js";
import { lifeOf, lifeText } from "../src/engine/account.js";
import { castOf, castAlong, castArcs, peopleOf, nameKey, MEMBERS } from "../src/engine/cast.js";
import { yearsAlong } from "../src/engine/self.js";
import { CAST, SQ, SNAKES, SITUATIONS, squareOf } from "../src/content.js";
import { fill, castFill } from "../src/i18n.js";
import { lintFates, lintContent } from "../tools/lint-content.mjs";
import { playGame } from "../tools/sim.mjs";
import PHASE10 from "./cast-phase10.json" with { type: "json" };

const game = (name = "Meera", gender = "f", seed = 7) => createGame({ players: [{ name, type: "cpu", gender }], rules: { six: true }, seed });
const lived = (life, { told, ...extra } = {}, s = game()) => { Object.assign(s.players[0], { life, pos: life.at(-1), told: told ?? life.map(() => null), ...extra }); return s; };
const all = (s, l = "en") => lifeOf(s, 0, l).paras.map(p => p.text).join(" ");
const uncast = fn => { const names = CAST.names; CAST.names = null; try { return fn(); } finally { CAST.names = names; } };
// every moment that can be told, with its square and what Phase 10C calls it
const MOMENTS = [];
for (let n = 1; n <= 110; n++) {
  const q = squareOf(n);
  if (!q) continue;
  for (const [which, m] of [["own", q.moment], ["roll", SQ[n]?.roll?.moment], ["prompt", SITUATIONS[n]?.prompt], ...(SITUATIONS[n]?.options || []).map(o => [o.id, o.outcome])]) if (m) MOMENTS.push({ n, which, m });
}

test("the draw: the same every time, nobody named twice, and no name anyone at the table already has", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const s = game("Meera", seed % 2 ? "f" : "m", seed), before = { ...s.rng }, a = castOf(s, 0, 0);
    assert.deepEqual(castOf(s, 0, 0), a);
    assert.deepEqual(s.rng, before, "the dice are never touched");
    const named = MEMBERS.map(w => a[w].en).filter(Boolean);
    assert.equal(new Set(named).size, named.length, `seed ${seed}: a name drawn twice`);
    assert.ok(!named.some(n => nameKey(n) === nameKey("Meera")), `seed ${seed}: Mīrā is the player's own name`);
    assert.equal(a.mother.en, null);
    assert.equal(a.father.en, null);
    assert.equal(a.son.gender, "m");
    assert.equal(a.daughter.gender, "f");
    assert.equal(a.spouse.gender, s.players[0].gender === "f" ? "m" : "f");
    assert.notDeepEqual(castOf(s, 0, 1), a, "a life after the fall from Brahma draws its own");
  }
  // a computer called Kabir at the table keeps Kabīr out of everyone's cast; Devanagari compares as written
  const t = createGame({ players: [{ name: "", alias: { en: "Kabir", hi: "कबीर" }, type: "cpu", gender: "m" }, { name: "आशा", type: "human", gender: "f" }], rules: {}, seed: 3 });
  for (let i = 0; i < 2; i++) for (let seed = 1; seed < 200; seed++) {
    t.rng.seed = seed;
    const names = MEMBERS.map(w => castOf(t, i, 0)[w].en);
    assert.ok(!names.includes("Kabīr") && !names.includes("Āśā"), `seed ${seed}`);
  }
  assert.equal(nameKey("Meera"), nameKey("Mīrā"));
  assert.equal(nameKey("Asha"), nameKey("Āśā"));
  assert.notEqual(nameKey("ज़ोया"), nameKey("जया"));
});

test("nothing moves and nothing is drawn from the game: every game plays exactly as it does with the cast taken away", () => {
  const play = () => Array.from({ length: 300 }, (_, i) => playGame(i + 1, { players: 2 })).map(g => JSON.stringify([g.log, g.turns, g.winner, g.players.map(p => [p.life, p.told, p.years])]));
  const named = play();
  assert.deepEqual(uncast(play), named);
});

test("with the cast's names taken away, every moment and closing phrase that names the cast reads as Phase 10 wrote it", () => {
  const now = {};
  for (const { n, which, m } of MOMENTS) if (m.cast) for (const l of ["en", "hi"]) now[`${n} ${which} ${l}`] = castFill(m[l]);
  for (const [n, sn] of Object.entries(SNAKES)) for (const f of ["holding", "letgo"]) if (sn[f] && /\{(child|rival)=/.test(sn[f].en)) for (const l of ["en", "hi"]) now[`${n} ${f} ${l}`] = castFill(sn[f][l]);
  // compared as each player reads it: square 6's Hindi now chooses by the player too (a girl's girl friend is a सहेली)
  const read = (t, gender) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, fill(v, { name: "{name}", age: "{age}", gender })]));
  for (const gender of ["m", "f", "n"]) assert.deepEqual(read(now, gender), read(PHASE10.text, gender), gender);
  // and the whole account, seed by seed (tools/accounts.mjs runs 2000 against main)
  for (let seed = 1; seed <= 50; seed++) {
    const s = game("Meera", "f", seed);
    while (!s.over) playTurn(s);
    const text = uncast(() => lifeText(s, 0, "en"));
    assert.doesNotMatch(text, /(His|Her) name is |was there again|was waiting|was back|was still there|whom Meera last saw/);
  }
});

test("a friend is met on their first square, named there once, and called by name on every square after", () => {
  const s = lived([6, 15, 16, 20]), friend = castOf(s, 0, 0).friend, en = all(s), hi = all(s, "hi");
  const her = friend.gender === "f" ? "Her" : "His";
  assert.match(en, new RegExp(`has found a friend\\. They share a biscuit by breaking it badly, and both halves get eaten anyway\\. ${her} name is ${friend.en}\\.`));
  assert.equal(en.split(" name is ").length - 1, 2, "the friend once, and the teacher at 20");
  assert.match(en, new RegExp(`for something ${friend.en} did too\\. ${friend.en} owns up`));
  assert.match(en, new RegExp(`with ${friend.en}, works out how to get the ball back`));
  assert.doesNotMatch(en, /the friend/i);
  assert.match(hi, new RegExp(`उसका नाम ${friend.hi} है।`));
  assert.match(hi, new RegExp(`${friend.hi} आगे आकर मान ${friend.gender === "f" ? "लेती" : "लेता"} है`));
  // a life that meets the friend first at 15 is introduced there instead
  const late = lived([15, 16]), f2 = castOf(late, 0, 0).friend;
  assert.match(all(late), new RegExp(`The friend owns up, and they take the scolding together\\. (His|Her) name is ${f2.en}\\. Then Meera is nine and, with ${f2.en},`));
});

test("the same person returning is joined by name, recalling where they were met; a return just after is not", () => {
  const s = lived([6, 15, 20, 25, 26, 48]), friend = castOf(s, 0, 0).friend.en, en = all(s);
  assert.match(en, new RegExp(`${friend}, who once broke a biscuit badly with Meera, was there again: Meera is thirty-three and it is a bad year\\. Meera borrows from ${friend} for food`));
  // 6 → 15 is the very next moment: the ladder's own join, no reminder
  assert.match(en, /And so, Meera is eight/);
  assert.equal(en.split("was there again").length - 1, 1, "the friend at 48");
  // each member returns in their own words: the teacher at 26, after 20, was waiting
  const teacher = castOf(s, 0, 0).teacher.en;
  assert.match(en, new RegExp(`${teacher}, whom Meera was taken to meet in clean clothes, was waiting: Meera is fifteen`));
  const hi = all(s, "hi"), hiName = castOf(s, 0, 0).friend.hi;
  assert.match(hi, new RegExp(`${hiName} से, जिसके साथ Meera ने कभी एक बिस्कुट टेढ़ा-मेढ़ा तोड़कर बाँटा था, फिर मुलाक़ात हुई: Meera तैंतीस बरस की है`));
  // the echo outranks it: 37 calls back to 26, the teacher's own square
  const e = lived([20, 26, 30, 37]);
  assert.match(all(e), new RegExp(SQ[37].echo.en.trim().slice(0, 12)));
  assert.doesNotMatch(all(e).split("Meera is twenty-two")[0].slice(-60), /was there again|was waiting/);
});

test("a moment that opens on a member of the cast keeps the capital of their name after a join", () => {
  const m = SQ[16].moment, saved = m.en;
  m.en = "{friend=The friend} and {name}, at {age}, get the ball back from the cross neighbour's yard without asking.";
  try {
    const s = lived([6, 9, 16]), friend = castOf(s, 0, 0).friend.en;
    assert.match(all(s), new RegExp(`was there again: ${friend} and Meera, at nine, get the ball back`));
    assert.doesNotMatch(all(s), new RegExp(friend.toLowerCase()));
  } finally { m.en = saved; }
});

test("the son and the daughter are two people, each met on their own square", () => {
  const s = lived([59, 50, 62]), c = castOf(s, 0, 0), en = all(s);
  assert.notEqual(c.son.en, c.daughter.en);
  assert.match(en, new RegExp(`She does not cry, which is worse\\. Her name is ${c.daughter.en}\\.`));
  assert.match(en, new RegExp(`has never once said no to the son, and does not say it now, when it matters most\\. His name is ${c.son.en}\\.`));
  // 60 names the son's son, so it never introduces: the son keeps his title until he is met
  const g = lived([60, 62]), c2 = castOf(g, 0, 0);
  assert.match(all(g), /and Meera's son has a son\./);
  assert.match(all(lived([62, 60])), new RegExp(`and ${castOf(lived([62, 60]), 0, 0).son.en} has a son\\.`));
  assert.ok(c2);
});

test("the teacher is called with जी in Hindi, and the Hindi agrees with the teacher, not the player", () => {
  for (let seed = 1; seed < 60; seed++) {
    const s = lived([20, 23], {}, game("Rohit", "m", seed)), t = castOf(s, 0, 0).teacher, hi = all(s, "hi");
    assert.match(hi, new RegExp(`उनका नाम ${t.hi} है।`));
    assert.match(hi, new RegExp(`${t.hi}जी ने कहा था`));
    assert.match(hi, new RegExp(`${t.hi}जी कहकर ${t.gender === "f" ? "भूल चुकी थीं" : "भूल चुके थे"}।`));
    // and the player's own agreement is still the player's
    assert.match(hi, /Rohit उन पर बाँहें फैलाए झुका है, पूरा भीगा हुआ।/);
  }
});

test("every moment that names the cast fills cleanly, for every gender of the member and of the player", () => {
  for (const { n, which, m } of MOMENTS) {
    if (!m.cast) continue;
    for (const gender of ["m", "f"]) for (const pg of ["m", "f", "n"]) for (const met of [false, true]) for (const l of ["en", "hi"]) {
      const people = { [m.cast === "son" || m.cast === "daughter" ? "child" : m.cast]: { gender, name: met ? "Tārā" : null } };
      const text = fill(castFill(m[l], people), { name: "Asha", gender: pg, age: "x" });
      assert.doesNotMatch(text, /[{}|]/, `${n} ${which} ${l}`);
    }
    if (/\{\w+:[^{}|]*\|/.test(m.hi)) {
      const r = m.hi.match(/\{(\w+):/)[1];
      assert.notEqual(castFill(m.hi, { [r]: { gender: "m" } }), castFill(m.hi, { [r]: { gender: "f" } }), `${n} ${which}`);
    }
  }
});

test("fates: one line per member the life met, in the order met, after the end, and none before the life is over", () => {
  const s = lived([6, 15, 20, 48, 52, 100], { years: 92, dead: true, holding: null });
  const { fates, end } = lifeOf(s, 0, "en"), c = castOf(s, 0, 0);
  assert.equal(fates.length, 3);
  assert.ok(fates[0].startsWith(`${c.friend.en}, whom Meera last saw at thirty-three, `), fates[0]);
  assert.ok(fates[1].startsWith(`${c.teacher.en}, whom Meera last saw at eleven, `), fates[1]);
  assert.ok(fates[2].startsWith(`${c.rival.en}, whom Meera last saw at thirty-eight, `), fates[2]);
  // 100 says the people who knew her young are gone: the friend and the teacher died before it
  for (const a of castArcs(s, 0, yearsAlong(s.players[0].life))) if (a.who !== "rival") assert.equal(a.kind, "died");
  assert.ok(lifeText(s, 0, "en").endsWith(`${end}\n\n${fates.join(" ")}\n`));
  // a game that ended before this life did has no closing fates
  assert.deepEqual(lifeOf(lived([6, 15, 48]), 0, "en").fates, []);
  // the father whose death at 53 the life saw has no fate; the mother gets the family line
  const f = lived([3, 18, 53], { years: 80, dead: true });
  assert.deepEqual(lifeOf(f, 0, "en").fates.map(x => x.split(" died")[0].split(" outlived")[0]), ["Meera's mother"]);
  assert.match(lifeOf(f, 0, "hi").fates[0], /^Meera की माँ /);
  // a son always outlives
  assert.match(lifeOf(lived([62], { years: 90, dead: true }), 0, "en").fates[0], new RegExp(`^${castOf(s, 0, 0).son.en} outlived Meera\\.$`));
});

test("the closing says four fates at most, the fourth in the short form", () => {
  // friend, mother, teacher, spouse, rival, daughter, son: seven met, four said
  const s = lived([6, 18, 20, 41, 52, 59, 62], { years: 90, dead: true }), c = castOf(s, 0, 0);
  const arcs = castArcs(s, 0, yearsAlong(s.players[0].life)), fates = lifeOf(s, 0, "en").fates;
  assert.equal(arcs.length, 7);
  assert.equal(fates.length, 4);
  assert.ok(fates[0].startsWith(`${c.friend.en}, whom Meera last saw at three, `), fates[0]);
  assert.ok(fates[1].startsWith("Meera's mother "), fates[1]);
  assert.ok(fates[2].startsWith(`${c.teacher.en}, whom Meera last saw at eleven, `), fates[2]);
  const spouse = arcs[3];
  assert.equal(fates[3], spouse.kind === "outlived" ? `${c.spouse.en} outlived Meera.` : `${c.spouse.en} died when Meera was ${lifeOf(s, 0, "en").fates[3].match(/was (.*)\.$/)[1]}.`);
  assert.doesNotMatch(fates[3], /whom|by .* years?|Nobody wrote|was not told/);
  assert.equal(lifeOf(s, 0, "hi").fates.length, 4);
});

test("the fate lint holds for 2000 seeded lives in each gender: nobody dies before the life last saw them", () => {
  assert.deepEqual(lintFates(2000), []);
});

test("the lint: a cast member is declared, named alike in both languages, and agreed with in Hindi", () => {
  const lints = (n, edit) => { const q = squareOf(n), saved = JSON.stringify(q.moment); edit(q.moment); try { return lintContent(); } finally { q.moment = JSON.parse(saved); } };
  assert.ok(lints(15, m => { delete m.cast; }).some(e => e.includes("square 15 moment") && e.includes("without saying so")));
  assert.ok(lints(15, m => { m.cast = "rival"; }).some(e => e.includes("is about the rival but names {friend}")));
  assert.ok(lints(16, m => { m.hi = m.hi.replace("{friend=दोस्त}", "दोस्त"); }).some(e => e.includes("names the friend in one language only")));
  assert.ok(lints(23, m => { m.hi = m.hi.replace("{teacher:भूल चुके थे|भूल चुकी थीं}", "भूल चुके थे"); }).some(e => e.includes("agrees with the teacher without a {teacher:m|f} choice")));
  assert.ok(lints(15, m => { delete m.recall; }).some(e => e.includes("no recall for the returns join")));
});
