// The door rewards an honest life (REDESIGN.md Phase 14): whatever penance comes to cost (Phase 16), liberation per life
// must stay ordered by how a life chooses on its situations, honest above mixed above dishonest. Measured by tools/sim.mjs
// on single-player games; 20,000 each gave 46.9%, 39.8% and 29.0% when this was written.
import test from "node:test";
import assert from "node:assert/strict";
import { setPolicy } from "../src/engine/qbn.js";
import { playGame, livesOf } from "../tools/sim.mjs";

const GAMES = 3000;
const liberation = policy => {
  setPolicy(policy);
  try {
    let won = 0;
    for (let i = 1; i <= GAMES; i++) won += playGame(i, { players: 1 }).winner === 0;
    return won / GAMES;
  } finally { setPolicy(null); }
};

test("liberation per life: honest > mixed > dishonest", () => {
  const [honest, mixed, dishonest] = ["honest", "mixed", "dishonest"].map(liberation);
  assert.ok(honest > mixed && mixed > dishonest, JSON.stringify({ honest, mixed, dishonest }));
});

// Phase 17, step 3: under Mīmāṃsā the exit is svarga, the exact landing on 101 with nothing owed, and every consequence is
// shown; the order still holds, and the win stays between the floor and the ceiling (5% and 60% of lives). A game holds
// every life of the seat since Śiva's snake became rebirth, so this counts lives; 20,000 games each gave 24.9%, 14.0%
// and 7.6% of lives when this was written.
test("Mīmāṃsā's svarga per life: honest > mixed > dishonest, within the floor and the ceiling", () => {
  const svarga = policy => {
    setPolicy(policy);
    try {
      let won = 0, lives = 0;
      for (let i = 1; i <= GAMES; i++) { const g = playGame(i, { players: 1, rules: { six: true, cards: "off", law: "mimamsa" } }); won += g.winner === 0; lives += livesOf(g).length; }
      return won / lives;
    } finally { setPolicy(null); }
  };
  const [honest, mixed, dishonest] = ["honest", "mixed", "dishonest"].map(svarga);
  assert.ok(honest > mixed && mixed > dishonest, JSON.stringify({ honest, mixed, dishonest }));
  assert.ok(dishonest >= 0.05 && honest <= 0.6, JSON.stringify({ honest, dishonest }));
});
