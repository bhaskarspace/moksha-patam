// REDESIGN.md Phase 17: the laws. The engine asks a law (src/engine/laws/index.js) and never which law it is playing.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createGame, playTurn, planTurn, resolveChoice, endTurn, addLog, movesFor, moveFor, canSit, foresee, gone, canPractise, practisesNow, zeroOf } from "../src/engine/turn.js";
import { LAWS, lawOf, choosable, canChoose, setLaw } from "../src/engine/laws/index.js";
import { board } from "../src/engine/laws/board.js";
import { soulOf, bornOf, endOf, keepOf, storeWith } from "../src/engine/samskara.js";
import { optionOf, choiceFor, situationAt } from "../src/engine/qbn.js";
import { carried, answerOf, examineOf, refusalOf, inferLinesIn, reckonSignIn, reckonLinesIn, refusalIn, debtIn } from "../src/engine/karma.js";
import { leadOf } from "../src/engine/laws/sankhya.js";
import { yearsAlong } from "../src/engine/self.js";
import { doorOf } from "../src/engine/turn.js";
import { lifeOf } from "../src/engine/account.js";
import { animalRules } from "../src/engine/animal.js";

test("the engine never branches on a law's id", () => {
  const src = fs.readFileSync(new URL("../src/engine/turn.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\.law\s*===|law\s*!==|"animal"/);
});

test("a player's law is their own, else the game's, else the board's; every law has every hook", () => {
  const s = createGame({ players: [{ name: "", type: "cpu", law: "animal" }, { name: "", type: "cpu" }], rules: { six: true }, seed: 1 });
  assert.equal(lawOf(s, 0).id, "animal");
  assert.equal(lawOf(s, 1).id, "board");
  s.rules.law = "animal";
  assert.equal(lawOf(s, 1).id, "animal");
  s.players[1].law = "nonesuch";
  assert.equal(lawOf(s, 1).id, "board");
  for (const l of Object.values(LAWS)) for (const k of Object.keys(board)) assert.ok(k in l, `${l.id} has ${k}`);
  assert.deepEqual(choosable().map(l => l.id), ["board", "mimamsa", "carvaka", "jain", "bhakti", "nyaya", "sankhya", "advaita", "yoga"]);
});

test("the interlude plays through the animal law's hooks, as Phase 16 played it", () => {
  const s = createGame({ players: [{ name: "", type: "cpu", gender: "m" }], rules: animalRules({ kind: "jackal", master: null, round: 1 }, { six: true }), seed: 4 });
  while (!s.over) playTurn(s);
  const p = s.players[0];
  assert.ok(p.earned || p.short);
  assert.ok(!p.curse && !(p.witness ?? []).length && !(p.reckonings ?? []).length);
  assert.ok(Math.max(...p.life) <= 40);
});

test("the law a life lived under is kept in its saṃskāra and offered to the next", () => {
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f", law: "board" }], rules: { six: true }, seed: 3 });
  s.players[0].dead = true; s.players[0].death = { by: "years", age: 111 };
  const soul = soulOf(s, 0);
  assert.equal(soul.law, "board");
  assert.equal(bornOf(soul).law, "board");
  assert.equal(bornOf({ ...soul, law: "animal" }).law, undefined, "the interlude is never chosen");
});

test("the animal's law is never offered: not in the picker, not from a setup, not from a saṃskāra", () => {
  // with a second law beside the board's, as from step 3, so the picker shows
  LAWS.other = { ...board, id: "other" };
  try {
    const ids = choosable().map(l => l.id);
    assert.ok(ids.length > 1 && !ids.includes("animal"), ids.join());
    assert.ok(canChoose("other") && canChoose("board"));
    for (const id of ["animal", "nonesuch", "__proto__", "constructor", undefined]) assert.equal(canChoose(id), false, String(id));
  } finally { delete LAWS.other; }
  // the picker on the between-lives card and the setup's select are built from choosable() and read back through canChoose
  for (const f of ["../src/render/card.js", "../src/main.js"]) {
    const src = fs.readFileSync(new URL(f, import.meta.url), "utf8");
    assert.match(src, /choosable\(\)\.map/, `${f} builds its picker from choosable()`);
    assert.match(src, /canChoose\(/, `${f} reads a pick back through canChoose`);
  }
});

// ---- Step 3: Mīmāṃsā and Cārvāka ----
const under = (law, pos, extra = {}) => {
  const s = createGame({ players: [{ name: "Mira", type: "human", gender: "f", law }, { name: "", type: "cpu" }], rules: { six: true }, seed: 1 });
  Object.assign(s.players[0], { pos, years: 85, ...extra });
  return s;
};
const DEBT = { src: 12, opt: "lie", at: 10, fuse: 15, weight: 2 };

test("Mīmāṃsā: the exact landing on Indra's heaven with nothing owed is svarga, and the soul is kept to return", () => {
  const s = under("mimamsa", 97), p = s.players[0];
  const plan = playTurn(s, [4, 1], () => 4);
  assert.ok(plan.win && p.pos === 101 && s.winner === 0 && s.over && p.won === "svarga");
  assert.equal(s.log.find(e => e.who === 0 && e.kind === "heaven")?.k, "lSvarga");
  assert.equal(endOf(s, 0), "svarga");
  assert.ok(soulOf(s, 0), "svarga returns (Gītā 9.21): its saṃskāra is kept");
  assert.match(lifeOf(s, 0, "en").end, /svarga/);
  // owing, the heaven does not keep the life, and it goes on
  const o = under("mimamsa", 97, { karma: { sancita: [], agami: [{ ...DEBT }], prarabdha: [] } });
  const owed = playTurn(o, [4, 1], () => 4);
  assert.ok(!owed.win && o.players[0].pos === 101 && !o.over && o.log.some(e => e.k === "lSvargaOwed"));
  // under the board's law 101 is a realm like any other
  const b = under("board", 97);
  assert.ok(!playTurn(b, [4, 1], () => 4).win);
});

test("Mīmāṃsā and Cārvāka: 105 is an ordinary square, with no door, no win and no sitting there", () => {
  for (const law of ["mimamsa", "carvaka"]) {
    const s = under(law, 103), p = s.players[0];
    const plan = playTurn(s, [2, 1], () => 2);
    assert.ok(p.pos === 105 && !plan.win && !plan.refused && !p.door && !s.over, law);
    s.turn = 0;
    assert.ok(!movesFor(s, [1, 2]).includes(0), `${law} offers a sit at 105`);
  }
  const b = under("board", 105, { years: 95, door: { aim: "artha" } });
  assert.ok(canSit(b.players[0]) && movesFor(b, [1, 2]).includes(0), "the board's door is where a sannyāsin sits");
});

test("Mīmāṃsā: each option names the debt it would plant and when it ripens, and its computer plays honest", () => {
  const s = under("mimamsa", 10, { years: 9 });
  const plan = planTurn(s, 2);
  assert.ok(plan.situation);
  const lie = foresee(s, plan, optionOf(12, "lie"));
  assert.ok(lie && lie.src === 12 && lie.opt === "lie" && lie.ripe === lie.at + lie.fuse);
  assert.equal(foresee(s, plan, optionOf(12, "laugh")), null);
  assert.equal(lawOf(s, 0).choose(s, plan.situation), choiceFor(s, plan.situation, "honest"));
  // under the board's law nothing is foreseen on the card, and Cārvāka plants nothing to foresee
  assert.ok(!lawOf(under("board", 10), 0).foresight);
  const c = under("carvaka", 10, { years: 9 });
  assert.equal(foresee(c, planTurn(c, 2), optionOf(12, "lie")), null);
});

test("Cārvāka: no ledger, no omen, no curse; Śiva's snake ends the life and nothing is born of it", () => {
  const s = createGame({ players: [{ name: "Mira", type: "human", gender: "f", law: "carvaka", born: { gunas: { s: 0.3, r: 0.4, t: 0.3 }, karma: { sancita: [{ ...DEBT }], agami: [{ ...DEBT }], prarabdha: [] }, prior: null } }], rules: { six: true }, seed: 2 });
  const p = s.players[0];
  assert.deepEqual(p.karma, { sancita: [], agami: [], prarabdha: [] }, "a life before carries nothing in");
  // even a debt set by hand and an omen forced (mp.fire) bring no reckoning
  Object.assign(p, { pos: 10, years: 40, karma: { sancita: [], agami: [], prarabdha: [{ ...DEBT }] } });
  s.forceOmen = true;
  const plan = planTurn(s, 2);
  const done = resolveChoice(s, plan, "lie");
  assert.equal(done.plant, null);
  [...done.pre, ...done.after].forEach(e => addLog(s, e));
  endTurn(s, done);
  assert.ok(!done.omen && !done.reckon && !p.curse);
  p.karma = { sancita: [], agami: [], prarabdha: [] };
  // the pleasure of the moment: on 47, buying it (kāma) over waiting
  assert.equal(lawOf(s, 0).choose(s, situationAt(47)), "buy");
  // Śiva's snake, and the end
  Object.assign(p, { pos: 104, years: 90 });
  s.turn = 0;
  const fall = playTurn(s, [6, 1], () => 6);
  assert.ok(fall.fell && p.fell && !p.past && !p.rebirths && gone(p) && s.over);
  assert.equal(s.log.find(e => e.kind === "fall")?.k, "lSivaOnce");
  assert.equal(soulOf(s, 0)?.law, "carvaka");
  assert.ok(!lawOf(s, 0).rebirth);
  assert.equal(keepOf(s, 0), null, "the store is left as it was (main.js keepLives)");
  const end = lifeOf(s, 0, "en").end;
  assert.match(end, /This life was all there was\.$/);
  assert.doesNotMatch(end, /went back down into the world/);
});

test("Cārvāka neither adds to nor takes from a kept soul: the same person, later under another law, carries what they did", () => {
  // Mira's soul as a life under the board's law left it: a debt unmet, sattva leading
  const b = createGame({ players: [{ name: "Mira", type: "human", gender: "f" }], rules: { six: true }, seed: 3 });
  Object.assign(b.players[0], { pos: 60, years: 70, dead: true, death: { by: "years" }, gunas: { s: 0.6, r: 0.2, t: 0.2 }, karma: { sancita: [{ ...DEBT }], agami: [], prarabdha: [] } });
  const kept = keepOf(b, 0)?.soul;
  assert.ok(kept && kept.sancita.length === 1);
  const store = storeWith(null, "mira", kept), before = JSON.stringify(store);
  // born of it under Cārvāka: the life carries nothing in, and Śiva's snake ends it
  const s = createGame({ players: [{ name: "", type: "human", gender: "f", law: "carvaka", soul: "mira", born: bornOf(kept) }], rules: { six: true }, seed: 4 });
  const p = s.players[0];
  assert.equal(carried(p.karma).length, 0);
  Object.assign(p, { pos: 104, years: 90 });
  playTurn(s, [6, 1], () => 6);
  assert.ok(p.fell && s.over && endOf(s, 0));
  // nothing kept and nothing let go: the store is byte for byte what it was
  assert.equal(keepOf(s, 0), null);
  const k = keepOf(s, 0), after = k ? storeWith(store, "mira", k.drop ? null : k.soul) : store;
  assert.equal(JSON.stringify(after), before);
  // later, under the board's law, the same soul is born with what it carried before Cārvāka
  const next = createGame({ players: [{ name: "", type: "human", gender: "f", soul: "mira", born: bornOf(after.souls.mira) }], rules: { six: true }, seed: 5 });
  const q = next.players[0];
  assert.equal(q.law, undefined);
  assert.deepEqual(q.prior.lives, kept.lives);
  assert.equal(carried(q.karma).length, 1, "the heaviest unmet debt comes in as prārabdha");
  assert.ok(q.gunas.s > 1 / 3, "the guṇas carry half of the life before");
});

test("a law chosen between lives that keeps no ledger takes the one the life was born with away", () => {
  const s = under("board", 10, { karma: { sancita: [], agami: [{ ...DEBT }], prarabdha: [] } });
  setLaw(s, 0, "mimamsa");
  assert.equal(s.players[0].law, "mimamsa");
  assert.equal(carried(s.players[0].karma).length, 1);
  setLaw(s, 0, "carvaka");
  assert.equal(carried(s.players[0].karma).length, 0);
  setLaw(s, 0, "nonesuch");
  assert.equal(s.players[0].law, "carvaka");
});

// ---- Step 4: the Jain law and Bhakti ----
// a seat at n with the life so far, told nothing, at an age of its own
const at = (law, life, extra = {}) => {
  const s = under(law, life.at(-1), { years: 12, life: [...life], told: life.map(() => null), ...extra });
  s.turn = 0;
  return s;
};

test("Jain: a ladder waits at its foot, the 1 climbs it on a later turn, and any other throw loses it", () => {
  const s = at("jain", [18, 20]), p = s.players[0];
  playTurn(s, [3], () => 3);
  assert.equal(p.pos, 23, "landed at Devotion's foot and stayed");
  assert.ok(s.log.some(e => e.k === "lAtFoot"));
  s.turn = 0;
  const climb = playTurn(s, [1], () => 1);
  assert.ok(climb.fromFoot && p.pos === 37 && climb.jump?.kind === "ladder");
  assert.deepEqual(p.life.slice(-3), [20, 23, 37], "the foot is lived once, then the top");
  const last = yearsAlong(p.life, p.told).at(-1);
  assert.ok(last.via === "ladder" && last.from === 23);
  // another throw from the foot walks on
  const t = at("jain", [18, 20]);
  playTurn(t, [3], () => 3);
  t.turn = 0;
  playTurn(t, [2], () => 2);
  assert.equal(t.players[0].pos, 25);
  // under the board's law the ladder is taken on landing, as ever
  const b = at("board", [18, 20]);
  playTurn(b, [3], () => 3);
  assert.equal(b.players[0].pos, 37);
});

test("Jain: an option that takes the ladder waits at the foot; one that stays turns away from it", () => {
  for (const [id, after1] of [["lie", 24], ["give", 13]]) {
    const s = at("jain", [8, 10], { years: 9 }), p = s.players[0];
    const plan = planTurn(s, 2);
    const done = resolveChoice(s, plan, id);
    [...done.pre, ...done.after].forEach(e => addLog(s, e));
    endTurn(s, done);
    assert.equal(p.pos, 12, `${id}: stays at the foot`);
    s.turn = 0;
    playTurn(s, [1], () => 1);
    assert.equal(p.pos, after1, `${id}: the 1`);
  }
});

test("Jain: a climb while the vice it heals is held is upaśama, which the door's book does not take; a clean climb answers", () => {
  // pride (77) heals by Devotion (23): a debt of pride, and the pride snake the one most taken
  const debt = { src: 54, opt: "claim", at: 10, fuse: 15, weight: 2, i: 0 };
  const held = at("jain", [5, 77, 58, 20, 23], { karma: { sancita: [], agami: [{ ...debt }], prarabdha: [] } });
  playTurn(held, [1], () => 1);
  const hp = held.players[0];
  assert.equal(hp.told.at(-1), "upasama");
  assert.equal(answerOf(hp, debt), null, "suppression is no answer");
  const clean = at("jain", [5, 20, 23], { karma: { sancita: [], agami: [{ ...debt }], prarabdha: [] } });
  playTurn(clean, [1], () => 1);
  const cp = clean.players[0];
  assert.equal(cp.told.at(-1), null);
  assert.ok(answerOf(cp, debt), "destruction answers, as on the board");
  // the account says the climb, and that the vice only lay down
  assert.match(lifeOf(held, 0, "en").paras.map(x => x.text).join(" "), /the old habit only lay down; it did not leave\./);
  assert.match(lifeOf(held, 0, "hi").paras.map(x => x.text).join(" "), /पुरानी आदत बस दबकर बैठ गई थी/);
  assert.doesNotMatch(lifeOf(clean, 0, "en").paras.map(x => x.text).join(" "), /only lay down/);
});

test("Jain: merit binds; once nothing is owed the door asks last about the merit, let go in a year sat there", () => {
  const witness = [{ sq: 28, chose: "truth", took: "truth", i: 3 }];
  const s = under("jain", 103, { years: 90, witness }), p = s.players[0];
  s.turn = 0;
  const arrive = playTurn(s, [2, 5], () => 2);
  assert.ok(arrive.refused?.merit && p.pos === 105 && !s.over);
  assert.ok(s.log.some(e => e.k === "lRefused"));
  s.turn = 0;
  const sat = playTurn(s, [3, 4], () => 0);
  assert.ok(sat.exam?.merit && sat.win && s.winner === 0 && p.exam.merit === 1);
  assert.ok(s.log.some(e => e.k === "lExamMerit"));
  // under the board's law the same life goes through
  const b = under("board", 103, { years: 90, witness });
  b.turn = 0;
  assert.ok(playTurn(b, [2, 5], () => 2).win);
});

test("Bhakti: grace may turn the lower choice on an ego test to the higher; never before the choice, and off its own die", () => {
  for (const [face, took] of [[1, "feed"], [6, "first"]]) {
    const s = at("bhakti", [44, 45], { years: 40 }), p = s.players[0];
    const plan = planTurn(s, 4);
    assert.ok(plan.situation && !("grace" in plan), "nothing of grace before the choice");
    s.forceGrace = face;
    const done = resolveChoice(s, plan, "first");
    assert.equal(done.choice, took);
    [...done.pre, ...done.after].forEach(e => addLog(s, e));
    endTurn(s, done);
    const w = p.witness.at(-1);
    assert.equal(w.chose, "first");
    assert.equal(!!w.grace, face === 1);
    if (face === 1) assert.match(lifeOf(s, 0, "en").paras.map(x => x.text).join(" "), /grace turned it/);
  }
  // the game's dice and the ego's are untouched by it: the same turn under the board's law leaves the same sequence
  const a = at("bhakti", [44, 45], { years: 40 }), b = at("board", [44, 45], { years: 40 });
  for (const s of [a, b]) { const pl = planTurn(s, 4); endTurn(s, resolveChoice(s, pl, "first")); }
  assert.deepEqual(a.rng, b.rng);
});

test("Bhakti: at the door grace may forgive, once a life, a debt the book cannot answer, even one no penance pays", () => {
  const heavy = { src: 59, opt: "strike", at: 40, fuse: 10, weight: 3, i: 0 }, light = { src: 12, opt: "lie", at: 10, fuse: 15, weight: 1, i: 0 };
  const s = under("bhakti", 105, { years: 90, karma: { sancita: [], agami: [], prarabdha: [{ ...heavy }, { ...light }] } }), p = s.players[0];
  p.door = refusalOf(p);
  s.turn = 0;
  s.forceGrace = 1;
  const first = playTurn(s, [3, 4], () => 0);
  assert.ok(first.exam?.graced && first.exam.cleared);
  assert.ok(p.sittings.at(-1).graced);
  assert.equal(carried(p.karma).length, 1);
  // the second debt: grace has come once in this life, and does not come again
  s.turn = 0;
  s.forceGrace = 1;
  const next = examineOf(p, doorOf(s, 0));
  assert.ok(!next.graced);
  // under the board's law the heavy debt is never paid
  const b = under("board", 105, { years: 90, karma: { sancita: [], agami: [], prarabdha: [{ ...heavy }] } });
  b.players[0].door = refusalOf(b.players[0]);
  b.forceGrace = 1;
  assert.ok(examineOf(b.players[0], doorOf(b, 0)).never);
});

test("Bhakti: Devotion is the one ladder to the end, and the life reads it as a ladder; the board's goes where it always did", () => {
  const s = at("bhakti", [18, 20]), p = s.players[0];
  const plan = playTurn(s, [3], () => 3);
  assert.equal(p.pos, 94);
  assert.ok(plan.after.some(e => e.k === "lDevotion"));
  assert.equal(p.told.at(-1), "climb");
  const last = yearsAlong(p.life, p.told).at(-1);
  assert.ok(last.via === "ladder" && last.from === 23);
  // a debt of pride planted before it is answered by that climb
  assert.ok(answerOf(p, { src: 54, opt: "claim", at: 10, fuse: 15, weight: 2, i: 0 }));
  const b = at("board", [18, 20]);
  playTurn(b, [3], () => 3);
  assert.equal(b.players[0].pos, 37);
  assert.equal(b.players[0].told.at(-1), null);
});

test("Jain: at a ladder's foot a life may wait, a year a throw; once waiting only the 1 moves it, up the ladder", () => {
  const s = at("jain", [18, 20]), p = s.players[0];
  playTurn(s, [3], () => 3);
  s.turn = 0;
  assert.deepEqual(movesFor(s, [4]), [4, 0], "move on, or wait");
  assert.deepEqual(movesFor(s, [1]), [1], "the 1 climbs");
  assert.equal(moveFor(s, [4]), 0, "its computer waits");
  const y = p.years;
  const sat = playTurn(s, [4], () => 0);
  assert.ok(sat.sit && p.pos === 23 && p.years === y + 1 && s.log.some(e => e.k === "lFootWait"));
  s.turn = 0;
  assert.deepEqual(movesFor(s, [5]), [0], "waiting, any other throw moves nothing");
  playTurn(s, [5]);
  assert.equal(p.pos, 23);
  s.turn = 0;
  playTurn(s, [1]);
  assert.equal(p.pos, 37);
  assert.deepEqual(p.life.slice(-4), [23, 23, 23, 37]);
  const along = yearsAlong(p.life, p.told);
  assert.deepEqual(along.slice(-4).map(e => e.via), [null, "sit", "sit", "ladder"]);
  // under the board's law nobody waits at a foot
  const b = at("board", [18, 20]);
  b.players[0].pos = 23; b.players[0].life.push(23); b.players[0].told.push(null);
  assert.deepEqual(movesFor(b, [4]), [4]);
});

// ---- Phase 17 step 5: Nyāya, Sāṃkhya, Advaita, Yoga ----

test("Yoga: a year in practice before the throw draws no dice and stores a stillness, up to three", () => {
  const s = at("yoga", [18, 20]), p = s.players[0];
  assert.ok(canPractise(s));
  const rng = { ...s.rng }, y = p.years;
  const sat = playTurn(s, []);
  assert.deepEqual(s.rng, rng, "nothing thrown");
  assert.ok(sat.sit && sat.act === "practice" && p.pos === 20 && p.years === y + 1 && p.nirodha === 1);
  assert.ok(s.log.some(e => e.k === "lPractice"));
  assert.equal(yearsAlong(p.life, p.told).at(-1).via, "sit");
  for (const _ of [1, 2, 3]) { s.turn = 0; if (canPractise(s)) playTurn(s, []); }
  assert.equal(p.nirodha, 3, "capped at three");
  assert.ok(!canPractise(s));
  // in words on the player's line, never a count
  assert.equal(lawOf(s, 0).line(p), "still3");
  assert.equal(lawOf(s, 0).line({ ...p, nirodha: 0 }), null);
  // under the board's law there is no such sitting
  assert.ok(!canPractise(at("board", [18, 20])));
});

test("Yoga: a stored stillness lets a throw go: the life stays and the year passes; without one, nothing is offered", () => {
  const s = at("yoga", [18, 20], { nirodha: 1 }), p = s.players[0];
  assert.deepEqual(movesFor(s, [4]), [4, 0]);
  assert.equal(zeroOf(s, [4]).act, "letGo");
  const y = p.years, gone1 = playTurn(s, [4], () => 0);
  assert.ok(gone1.act === "letGo" && p.pos === 20 && p.years === y + 1 && p.nirodha === 0 && s.log.some(e => e.k === "lLetGo"));
  s.turn = 0;
  assert.deepEqual(movesFor(s, [4]), [4], "nothing stored, nothing to let go");
  // from 94 a sannyāsin's 0 is Phase 9's year in practice, and spends nothing
  const e = under("yoga", 95, { years: 92, nirodha: 2 });
  e.turn = 0;
  assert.ok(canSit(e.players[0]) && zeroOf(e, [1, 2]) === null);
  playTurn(e, [1, 2], () => 0);
  assert.equal(e.players[0].nirodha, 2);
});

test("Yoga: its computer sits with nothing stored and a snake's head within a throw, and lets a throw onto one go", () => {
  const s = at("yoga", [18, 20, 25]);
  assert.ok(practisesNow(s), "29 is within a throw of 25");
  const f = at("yoga", [18, 20]);
  assert.ok(!practisesNow(f), "no snake's head from 21 to 26");
  const g = at("yoga", [18, 20, 25], { nirodha: 1 });
  assert.ok(!practisesNow(g), "it holds one already");
  assert.equal(moveFor(g, [4]), 0, "25 + 4 is the snake's head on 29");
  assert.equal(moveFor(g, [3]), 3);
});

test("Nyāya: the door refuses as a sign and opens on no win; release is a life that ends owing nothing", () => {
  const s = under("nyaya", 103), p = s.players[0];
  const through = playTurn(s, [2, 1], () => 2);
  assert.ok(p.pos === 105 && !through.win && !s.over && s.log.some(e => e.k === "lDoorThrough"));
  // owing, it is refused, and the refusal is said as a sign, never by what is owed
  const o = under("nyaya", 103, { karma: { sancita: [], agami: [{ ...DEBT }], prarabdha: [] } });
  const refused = playTurn(o, [2, 1], () => 2);
  assert.ok(refused.refused && o.players[0].door);
  const who = { name: "Mira", gender: "f" };
  assert.deepEqual(refusalIn("en", refused.refused, who, false, true).slice(0, 1), [STR_SIGN]);
  assert.ok(!refusalIn("en", refused.refused, who, false, true).join(" ").includes(debtIn("en", DEBT, who)));
  // no examination there; a computer is offered nothing, Mira (a person) her inference
  o.turn = 0;
  assert.equal(zeroOf(o, [1, 2])?.act, "infer");
  // Śiva's snake with nothing owed: apavarga, won, not born again, and let go from the store
  const f = under("nyaya", 104);
  const fall = playTurn(f, [6, 1], () => 6);
  assert.ok(fall.fell && fall.freed && f.winner === 0 && f.over && f.players[0].won === "apavarga" && !f.players[0].past);
  assert.deepEqual(keepOf(f, 0), { drop: true });
  assert.match(lifeOf(f, 0, "en").end, /apavarga/);
  // owing, the snake is rebirth as on the board
  const fo = under("nyaya", 104, { karma: { sancita: [], agami: [{ ...DEBT }], prarabdha: [] } });
  playTurn(fo, [6, 1], () => 6);
  assert.ok(fo.winner == null && fo.players[0].rebirths === 1);
  // the years running out with nothing owed is release too
  const y = at("nyaya", [28, 30], { years: 110 });
  const died = playTurn(y, [3]);
  assert.ok(died.died && y.winner === 0 && y.players[0].dead && y.players[0].won === "apavarga");
  // a death by the ledger never is
  const d = at("nyaya", [28, 30], { years: 60, karma: { sancita: [], agami: [], prarabdha: [{ ...DEBT }] } });
  d.forceDeath = "calamity";
  const ledger = playTurn(d, [3]);
  assert.ok(ledger.died && d.players[0].death.by === "ledger" && d.winner == null && !d.players[0].won);
});
const STR_SIGN = "The door does not open. Something is still owed.";

test("Nyāya: a reckoning is a sign, with no source anywhere; a person may spend a throw to infer it, in five members", () => {
  const s = at("nyaya", [28, 30], { years: 40, karma: { sancita: [], agami: [], prarabdha: [{ ...DEBT }] } }), p = s.players[0];
  assert.ok(lawOf(s, 0).veiled && !lawOf(s, 0).foresight);
  s.forceOmen = true;
  const rk = playTurn(s, [3]);
  assert.ok(rk.reckon);
  const line = s.log.find(e => e.kind === "reckon");
  assert.equal(line.k, "lSign");
  assert.deepEqual(line.v, {}, "the log names no square");
  const who = { name: "Mira", gender: "f" }, full = reckonLinesIn("en", rk.reckon, who), sign = reckonSignIn("en", rk.reckon, who);
  assert.ok(sign.length === full.length - 2 && !sign.some(t => t.includes("comes from")));
  // the sign offers its inference beside the move; the life stays and the year passes
  s.turn = 0;
  const pos = p.pos, y = p.years;
  assert.ok(movesFor(s, [2]).includes(0));
  const inf = playTurn(s, [2], () => 0);
  assert.ok(inf.act === "infer" && inf.infer.kind === "reckon" && p.pos === pos && p.years === y + 1);
  assert.deepEqual(p.inferred, [inf.infer.key]);
  s.turn = 0;
  assert.deepEqual(movesFor(s, [2]), [2], "inferred once, nothing more to infer");
  // the five members, ending on the deed, in words
  const lines = inferLinesIn("en", inf.infer, who);
  assert.equal(lines.length, 5);
  assert.ok(lines[4].includes(debtIn("en", { src: 12, opt: "lie", at: 10 }, who)), lines[4]);
  assert.ok(lines.every(t => !/\d/.test(t)), lines.join(" | "));
  // its computer never infers
  const c = at("nyaya", [28, 30], { type: "cpu", years: 40, reckonings: [{ at: 1, src: 12, opt: "lie", planted: 10, age: 35 }] });
  assert.deepEqual(movesFor(c, [2]), [2]);
});

test("Sāṃkhya: prakṛti chooses for the person by the guṇa leading the life, and the account closes on the dancer", () => {
  const s = under("sankhya", 45), p = s.players[0], sit = situationAt(47);
  assert.ok(lawOf(s, 0).auto);
  s.turn = 0;
  p.gunas = { s: 0.6, r: 0.2, t: 0.2 };
  assert.equal(leadOf(p), "s");
  assert.equal(lawOf(s, 0).choose(s, sit), choiceFor(s, sit, "honest"));
  p.gunas = { s: 0.2, r: 0.6, t: 0.2 };
  assert.equal(lawOf(s, 0).choose(s, sit), "buy", "rajas: the most wealth and pleasure");
  p.gunas = { s: 0.2, r: 0.2, t: 0.6 };
  assert.equal(lawOf(s, 0).choose(s, sit), choiceFor(s, sit, "inert"));
  p.gunas = { s: 1 / 3, r: 1 / 3, t: 1 / 3 };
  assert.equal(leadOf(p), null);
  assert.equal(lawOf(s, 0).choose(s, sit), choiceFor(s, sit, "mixed"), "in balance, the game's own");
  // the dancer of Sāṃkhyakārikā 59, won or not
  const f = under("sankhya", 104);
  playTurn(f, [6, 1], () => 6);
  f.players[0].past && (f.players[0] = f.players[0].past[0]);
  assert.match(lifeOf(f, 0, "en").end, /prakṛti stops once she has shown herself/);
});

test("Advaita: arriving at 105 wins nothing; from the sixth bhūmikā a sannyāsin recognises in place of a move, and wins", () => {
  const s = under("advaita", 103), p = s.players[0];
  const arrive = playTurn(s, [2, 1], () => 2);
  assert.ok(p.pos === 105 && !arrive.win && !arrive.refused && !s.over);
  assert.equal(lawOf(s, 0).text.goal, "advaitaGoal");
  const r = at("advaita", [48, 50], { years: 75, bhumika: 5 }), q = r.players[0];
  assert.ok(movesFor(r, [3]).includes(0));
  assert.equal(moveFor(r, [3]), 0, "its computer recognises whenever it may");
  const won = playTurn(r, [3]);
  assert.ok(won.win && won.act === "recognise" && q.pos === 50 && r.winner === 0 && q.won === "recognition");
  assert.ok(r.log.some(e => e.k === "lRecognised"));
  assert.deepEqual(keepOf(r, 0), { drop: true });
  assert.match(lifeOf(r, 0, "en").end, /recognition/);
  // the fifth is not enough
  const n = at("advaita", [48, 50], { years: 75, bhumika: 4 });
  assert.deepEqual(movesFor(n, [3]), [3]);
});
