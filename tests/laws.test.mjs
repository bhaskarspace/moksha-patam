// REDESIGN.md Phase 17: the laws. The engine asks a law (src/engine/laws/index.js) and never which law it is playing.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createGame, playTurn, planTurn, resolveChoice, endTurn, addLog, movesFor, canSit, foresee, gone } from "../src/engine/turn.js";
import { LAWS, lawOf, choosable, canChoose, setLaw } from "../src/engine/laws/index.js";
import { board } from "../src/engine/laws/board.js";
import { soulOf, bornOf, endOf, keepOf, storeWith } from "../src/engine/samskara.js";
import { optionOf, choiceFor, situationAt } from "../src/engine/qbn.js";
import { carried } from "../src/engine/karma.js";
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
  assert.deepEqual(choosable().map(l => l.id), ["board", "mimamsa", "carvaka"]);
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
