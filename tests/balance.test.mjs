// The door rewards an honest life (REDESIGN.md Phase 14): whatever penance comes to cost (Phase 16), liberation per life
// must stay ordered by how a life chooses on its situations, honest above mixed above dishonest. Measured by tools/sim.mjs
// on single-player games; 20,000 each gave 46.9%, 39.8% and 29.0% when this was written.
import test from "node:test";
import assert from "node:assert/strict";
import { setPolicy } from "../src/engine/qbn.js";
import { playGame } from "../tools/sim.mjs";

const GAMES = 3000;
const liberation = policy => {
  setPolicy(policy);
  try {
    let won = 0;
    for (let i = 1; i <= GAMES; i++) won += playGame(i, { players: 1 }).winner === 0;
    return won / GAMES;
  } finally { setPolicy("mixed"); }
};

test("liberation per life: honest > mixed > dishonest", () => {
  const [honest, mixed, dishonest] = ["honest", "mixed", "dishonest"].map(liberation);
  assert.ok(honest > mixed && mixed > dishonest, JSON.stringify({ honest, mixed, dishonest }));
});
