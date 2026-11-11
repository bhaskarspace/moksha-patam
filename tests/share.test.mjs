// Phase 19 step 3: the links (src/share.js). A seed link carries the board, the law and the seed and nothing about anyone;
// a life link carries what its game was made of, and plays again to the same life on any device with this version of the
// game, wherever its person sat; today's seed is the date's. Nothing here is sent anywhere.
import test from "node:test";
import assert from "node:assert/strict";
import { packChoices, unpackChoices, pack, unpack, playHash, readPlay, lifeOf, lifeHash, readLife, sendable, checkOf, dailySeed, dayOf, hashOf } from "../src/share.js";
import { replay, sameGame, compareLives, partingOf } from "../src/engine/compare.js";
import { played, person, cpu } from "./played.mjs";

test("a seed link is the board, the law and the seed, and reads back as it was", () => {
  const h = playHash({ board: "110", law: "yoga", seed: 4294967295 });
  assert.equal(h, "#play=110.yoga.4294967295");
  assert.deepEqual(readPlay(h), { board: "110", law: "yoga", seed: 4294967295 });
  assert.equal(readPlay("#play=110.yoga.x"), null);
  assert.equal(readPlay("#sq/36"), null);
  assert.equal(hashOf("https://codebpr.com/moksha-patam/#play=110.board.7"), "#play=110.board.7");
});

test("a person's choices pack a character each, and anything unknown is written out", () => {
  const list = ["0", "6", "p", "r", "obuy", "owait", "lyoga", "lboard", "l", "oneverseen", "lnolaw", "3"];
  const packed = packChoices(list);
  assert.deepEqual(unpackChoices(packed), list);
  assert.equal(packChoices(["0", "6", "p", "obuy", "lyoga"]).length, 6);
});

test("packing gives back what was packed", async () => {
  for (const x of [{}, { a: [1, 2, "३"], b: "मोक्ष" }, { c: "3,5,oa,ob,p,r,lyoga".repeat(40) }]) assert.deepEqual(await unpack(await pack(x)), x);
  await assert.rejects(unpack("q123"));
});

test("a life sent plays again to the same life, wherever its person sat, and the sizes of its link", async () => {
  const sizes = { typical: [], long: [] };
  for (let seed = 1; seed <= 30; seed++) {
    for (const [table, rules] of [[[person("Mira", "f")], { six: true }], [[person("Mira", "f"), cpu()], { six: true, mode: "together", length: "free" }], [[cpu(), person("Mira", "f")], { six: true, mode: "race" }]]) {
      const live = played(table.map(x => ({ ...x })), seed, rules, { laws: true });
      assert.equal(sendable(live), null, `seed ${seed}: sendable`);
      const h = await lifeHash(live), got = await readLife(h);
      const r = replay(got.inputs);
      assert.ok(r.ok && sameGame(live, r.state), `seed ${seed} ${rules.mode ?? "alone"}: the same game`);
      assert.deepEqual(checkOf(r.state, got.seat), got.check);
      // nothing in it but what the game was made of: no saṃskāra, no soul key, no colour
      const x = lifeOf(live);
      assert.ok(x.t.every(row => !("born" in row) && !("soul" in row) && !("color" in row)));
      (live.players.length === 1 ? sizes.typical : sizes.long).push(h.length);
    }
  }
  const q = (xs, p) => [...xs].sort((a, b) => a - b)[Math.floor(p * (xs.length - 1))];
  console.log(`      link sizes: one life alone median ${q(sizes.typical, 0.5)}, p95 ${q(sizes.typical, 0.95)}; with a computer, every life till free, median ${q(sizes.long, 0.5)}, p95 ${q(sizes.long, 0.95)}, max ${Math.max(...sizes.long)}`);
  assert.ok(q(sizes.typical, 0.5) < 600);
});

test("a game set by hand, born of a life before, with two people, or not over, is not sent", () => {
  const live = played([person("Mira", "f")], 3, { six: true });
  assert.equal(sendable({ ...live, tampered: true }), "set by hand");
  assert.equal(sendable({ ...live, over: false }), "not over");
  assert.equal(sendable({ ...live, table: [{ ...live.table[0], born: {} }] }), "born of a life before");
  const two = played([person("Mira", "f"), person("Ravi", "m")], 3, { six: true, mode: "together" });
  assert.equal(sendable(two), "not one person");
});

test("a life replayed with its choices changed is found out by its check", async () => {
  let caught = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const live = played([person("Mira", "f")], seed, { six: true });
    const got = await readLife(await lifeHash(live)), c = got.inputs.choices[got.seat];
    if (c.length < 2) continue;
    c.reverse();
    const r = replay(got.inputs);
    if (!r.ok || JSON.stringify(checkOf(r.state, got.seat)) !== JSON.stringify(got.check)) caught++;
  }
  assert.ok(caught > 5, "changed lives caught: " + caught);
});

test("two lives on one seed, sent from two devices, are compared, and where they parted is found", async () => {
  let parted = 0;
  for (let seed = 1; seed <= 20; seed++) {
    // two people, each alone with the seed, one played honestly by its own sequence of choices, one by another's
    const a = played([person("Mira", "f")], seed, { six: true }), b = played([cpu(), person("Ravi", "m")], seed, { six: true, mode: "race" }, { salt: 7 });
    const ga = await readLife(await lifeHash(a)), gb = await readLife(await lifeHash(b));
    const games = [ga, gb].map(g => { const r = replay(g.inputs); return { state: r.state, traces: r.traces, seat: g.seat }; });
    const m = compareLives(games);
    assert.equal(m.souls.length, 2);
    const p = m.parted[0] ?? partingOf(m.souls[0], m.souls[1]);
    assert.ok(p, `seed ${seed}: the two lives are on one seed`);
    if (p.k != null) {
      parted++;
      // before they parted, the two threw the same dice at every throw
      const ta = m.souls[0].lives[0].trace.filter(x => x.k != null), tb = m.souls[1].lives[0].trace.filter(x => x.k != null);
      for (let k = 0; k < p.k - 1; k++) assert.deepEqual(ta[k].dice, tb[k].dice, `seed ${seed}: throw ${k + 1}`);
    }
  }
  assert.ok(parted > 10, "lives that parted: " + parted);
});

test("today's seed is the date's, the same all day and another tomorrow", () => {
  assert.equal(dayOf(new Date("2026-11-11T00:00:01Z")), "2026-11-11");
  assert.equal(dayOf(new Date("2026-11-11T23:59:59Z")), "2026-11-11");
  assert.equal(dailySeed("2026-11-11"), dailySeed("2026-11-11"));
  assert.notEqual(dailySeed("2026-11-11"), dailySeed("2026-11-12"));
  assert.ok(Number.isInteger(dailySeed("2026-11-11")) && dailySeed("2026-11-11") >= 0);
});
