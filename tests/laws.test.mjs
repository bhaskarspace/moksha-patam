// REDESIGN.md Phase 17: the laws. The engine asks a law (src/engine/laws/index.js) and never which law it is playing.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createGame, playTurn } from "../src/engine/turn.js";
import { LAWS, lawOf, choosable, canChoose } from "../src/engine/laws/index.js";
import { board } from "../src/engine/laws/board.js";
import { soulOf, bornOf } from "../src/engine/samskara.js";
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
  assert.deepEqual(choosable().map(l => l.id), ["board"]);
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
