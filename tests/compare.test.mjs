// Phase 19 step 2: a game played again from its inputs is the same game, and the comparison reads it without a number
// reaching any text. The people here choose as the page records them (src/main.js noteChoice): a die or the law's act when
// there is more than one move, an option on a situation, a year in practice or not when one could be sat, and the law of
// a life born again at its first throw.
import test from "node:test";
import assert from "node:assert/strict";
import { replay, inputsOf, sameGame, compareOf } from "../src/engine/compare.js";
import { played, person, cpu } from "./played.mjs";


test("a game played again from its seed, its table and each person's choices is the same game, in every mode", () => {
  const tables = [
    [[person("Mira", "f"), person("Ravi", "m"), person("Asha", "f"), person("Dev", "n")], { six: true, mode: "together" }],
    [[person("Mira", "f"), cpu()], { six: true, mode: "together", length: "free" }],
    [[person("Mira", "f"), person("Ravi", "m"), cpu()], { six: true, mode: "together", length: "one" }],
    [[person("Mira", "f"), cpu(), cpu()], { six: true, mode: "race" }],
    [[person("Mira", "f")], { six: true }],
  ];
  for (const [t, rules] of tables) for (let seed = 1; seed <= 25; seed++) {
    const live = played(t.map(x => ({ ...x })), seed, rules, { laws: true });
    const r = replay(inputsOf(live));
    assert.ok(r.ok, `${rules.mode ?? "one person"} seed ${seed}: every choice was used where it was made`);
    assert.ok(sameGame(live, r.state), `${rules.mode ?? "one person"} seed ${seed}: the same game`);
  }
});

test("a game stopped part way is played again to where it stopped, with a trace a throw of every life", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const live = played([person("Mira", "f"), person("Ravi", "m"), cpu(), cpu()], seed, { six: true, mode: "together" }, { stopAt: 90 + seed });
    const r = replay(inputsOf(live));
    assert.ok(r.ok && sameGame(live, r.state), `seed ${seed}`);
    live.players.forEach((p, i) => {
      const lives = [...(p.past ?? []), p];
      assert.equal(r.traces[i].length, lives.length, `seed ${seed} seat ${i}: a trace for every life`);
      for (const tr of r.traces[i]) for (const x of tr) assert.equal(x.g.length, 3);
    });
  }
});

test("the comparison has every soul's lives and ends, the squares two lives chose on, and the lives that crossed", () => {
  let same = 0, met = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const live = played([person("Mira", "f"), person("Ravi", "m"), person("Asha", "f"), person("Dev", "m")], seed, { six: true, mode: "together" });
    const r = replay(inputsOf(live)), c = compareOf(live, r.traces);
    assert.equal(c.souls.length, 4);
    for (const s of c.souls) {
      assert.equal(s.lives.length, (live.players[s.seat].past?.length ?? 0) + 1);
      assert.ok(s.lives.slice(0, -1).every(l => l.end !== "living" && l.end !== "liberated"), `seed ${seed}: a closed life ended otherwise`);
      assert.ok(["liberated", "svarga", "living"].includes(s.lives.at(-1).end) || live.players[s.seat].dead || live.players[s.seat].fell);
    }
    for (const x of c.same) assert.ok(new Set(x.by.map(b => `${b.seat}.${b.life}`)).size >= 2);
    same += c.same.length; met += c.met.length;
  }
  assert.ok(same > 0 && met > 0, "some squares were chosen on by two lives, and some lives crossed");
});
