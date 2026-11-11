// Phase 19 step 3's review: a game saved before the per-throw dice resumes on the old dice exactly, to the end, never
// silently on new ones; and a life link says which dice its game threw, so a life is never shown on dice it did not throw.
// A game from before step 3 is one createGame wrote without state.throws, as main's did; setDice("stream") makes one here.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn } from "../src/engine/turn.js";
import { setDice, streamOf } from "../src/engine/throws.js";
import { lifeOf, inputsOfLife, checkOf, pack, unpack } from "../src/share.js";
import { replay, inputsOf, sameGame } from "../src/engine/compare.js";
import { played, person, cpu } from "./played.mjs";

const CAP = 6000;
const lives = s => JSON.stringify(s.players.map(p => [...(p.past ?? []), p].map(q => [q.life, Math.floor(q.years ?? 0), q.curse?.id ?? null, q.reckonings?.length ?? 0])));
// a game begun as main began it, with the old shared sequence
const before = (players, seed, rules) => { setDice("stream"); try { return createGame({ players, rules, seed }); } finally { setDice("throw"); } };

test("a new game says it throws each throw its own; one begun before does not", () => {
  assert.equal(createGame({ players: [person("Mira", "f")], rules: { six: true }, seed: 1 }).throws, "own");
  const old = before([person("Mira", "f")], 1, { six: true });
  assert.equal(old.throws, undefined);
  assert.ok(streamOf(old) && !streamOf(createGame({ players: [person("Mira", "f")], rules: { six: true }, seed: 1 })));
});

test("a game saved before step 3 resumes on the old dice exactly, to the end, whenever it was saved", () => {
  for (const [table, rules] of [[[cpu()], { six: true }], [[cpu(), cpu()], { six: true }], [[cpu(), cpu(), cpu(), cpu()], { six: true, mode: "together" }]]) {
    for (let seed = 1; seed <= 15; seed++) {
      // the whole game on the old dice, as main plays it
      setDice("stream");
      let whole;
      try { whole = createGame({ players: table.map(x => ({ ...x })), rules, seed }); for (let n = 0; n < CAP && !whole.over; n++) playTurn(whole); } finally { setDice("throw"); }
      for (const at of [0, 7, 40]) {
        // saved part way (mp-game is JSON), and resumed by this version
        const s = before(table.map(x => ({ ...x })), seed, rules);
        setDice("stream");
        try { for (let n = 0; n < at && !s.over; n++) playTurn(s); } finally { setDice("throw"); }
        const resumed = JSON.parse(JSON.stringify(s));
        for (let n = 0; n < CAP && !resumed.over; n++) playTurn(resumed);
        assert.equal(lives(resumed), lives(whole), `${table.length} seats ${rules.mode ?? "race"}, seed ${seed}, saved after ${at} turns`);
      }
    }
  }
});

test("a game from before step 3, finished and sent as a life, plays again on the dice it threw", async () => {
  for (let seed = 1; seed <= 15; seed++) {
    // a person's game begun before, played to its end after
    const fresh = played([person("Mira", "f")], seed, { six: true });
    const old = (() => {
      setDice("stream");
      try { return played([person("Mira", "f")], seed, { six: true }); } finally { setDice("throw"); }
    })();
    delete old.throws;
    assert.notEqual(lives(old), lives(fresh), `seed ${seed}: the two dice differ`);
    const x = lifeOf(old);
    assert.equal(x.d, "stream", "the link says which dice");
    const got = inputsOfLife(await unpack(await pack(x))), r = replay(got.inputs);
    assert.ok(r.ok && sameGame(old, r.state), `seed ${seed}: played again on the old dice`);
    assert.deepEqual(checkOf(r.state, got.seat), got.check);
    // and the game played again from the page's own record of it
    assert.ok(sameGame(old, replay(inputsOf(old)).state));
  }
});

test("a link that does not say its dice truly is caught by its check, and never shown as a life", async () => {
  let caught = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const old = (() => { setDice("stream"); try { return played([person("Mira", "f")], seed, { six: true }); } finally { setDice("throw"); } })();
    delete old.throws;
    const x = { ...lifeOf(old) };
    delete x.d;
    const got = inputsOfLife(x), r = replay(got.inputs);
    // the page adds a life only when it plays again and ends as its check says (src/main.js addLife): otherwise it says
    // "That life was played on another version of the game" and shows nothing
    if (!(r.ok && JSON.stringify(checkOf(r.state, got.seat)) === JSON.stringify(got.check))) caught++;
  }
  assert.equal(caught, 20, "every one caught");
});
