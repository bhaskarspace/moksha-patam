// A life born again in a seat is never called by a name any life in its game has had: one at the table, one a seat lived
// before, or one the table sat down with (Phase 19, reviewed 11 Nov). The cast's own rule is unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn } from "../src/engine/turn.js";
import { nameKey } from "../src/engine/cast.js";

const cpu = () => ({ name: "", type: "cpu", gender: "" });
const people = [{ name: "Dev", type: "human", gender: "m" }, { name: "Asha", type: "human", gender: "f" }];

test("no two lives in a game share a name, however many are born again", () => {
  let reborn = 0;
  for (const [table, rules] of [[[cpu(), cpu(), cpu(), cpu()], { six: true, mode: "together" }], [[...people, cpu()], { six: true, mode: "together" }], [[cpu(), cpu()], { six: true }]]) {
    for (let seed = 1; seed <= 60; seed++) {
      const s = createGame({ players: table.map(x => ({ ...x })), rules, seed });
      for (let n = 0; n < 6000 && !s.over; n++) playTurn(s);
      const names = s.players.flatMap(p => [...(p.past ?? []), p]).map(q => q.name?.trim() || q.alias?.en).filter(Boolean);
      reborn += s.players.reduce((n, p) => n + (p.rebirths ?? 0), 0);
      const seen = new Set();
      for (const x of names) { assert.ok(!seen.has(nameKey(x)), `seed ${seed}, ${table.length} seats: ${x} twice in ${names.join(", ")}`); seen.add(nameKey(x)); }
    }
  }
  assert.ok(reborn > 500, "lives born again: " + reborn);
});
