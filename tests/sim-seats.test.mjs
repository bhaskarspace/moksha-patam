// Phase 20: the sim keeps a record for every life of every seat. A seat born again on its own last turn, while another
// seat ends the game, never plays the life it is born into; before this, that life had no record and `npm run sim`
// with two or more seats threw (tools/sim.mjs, the report's loop over livesOf). Step 5 measures Together's lengths on it.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { playGame, livesOf } from "../tools/sim.mjs";

for (const players of [2, 3]) {
  test(`${players} seats: every life the game holds has its record, race and together`, () => {
    for (const mode of ["race", "together"]) {
      for (let seed = 1; seed <= 300; seed++) {
        const g = playGame(seed, { players, rules: { six: true, cards: "off", mode } });
        for (const x of livesOf(g)) assert.ok(g.per[x.i][x.k], `${mode} seed ${seed}: seat ${x.i}, life ${x.k + 1} has no record`);
      }
    }
  });
  test(`npm run sim with ${players} seats runs to its report`, () => {
    const out = execFileSync(process.execPath, ["tools/sim.mjs", "300", String(players), "1"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    assert.match(out, /turns per player until the game ends/);
    assert.match(out, /how lives end/);
  });
}
