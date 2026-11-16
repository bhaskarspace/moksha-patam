// Phase 20: played together, one life each is the default; at its end the table may go on together, as if it had been
// played until every soul is free, the same game: its seed, lanes and names, kept and played again from its inputs.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn, gone, goOn, canGoOn } from "../src/engine/turn.js";
import { oneLife } from "../src/engine/mode.js";
import { replay, inputsOf, sameGame } from "../src/engine/compare.js";

const CAP = 6000;
const cpu = law => ({ name: "", type: "cpu", ...(law ? { law } : {}) });
const ONE = { six: true, mode: "together", length: "one" };
const run = s => { for (let n = 0; !s.over && n < CAP; n++) playTurn(s); assert.ok(s.over); return s; };
const names = s => s.players.map(p => [...(p.past ?? []), p].map(q => q.alias?.en ?? q.name));
const clone = s => JSON.parse(JSON.stringify(s));

test("one life each ends when every seat's one life has ended; nothing is born again at the table", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = run(createGame({ players: [cpu(), cpu(), cpu()], rules: ONE, seed }));
    assert.ok(oneLife(s));
    for (const p of s.players) { assert.ok(gone(p)); assert.equal(p.rebirths ?? 0, 0); assert.equal(p.past?.length ?? 0, 0); }
  }
});

test("go on together: the ended lives are born again in their seats, the same seed, lanes and names, and the game plays on to every soul free", () => {
  let went = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const s = run(createGame({ players: [cpu(), cpu(), cpu()], rules: ONE, seed }));
    const before = { seed: s.rng.seed, lanes: s.players.map(p => p.lane), names: names(s), turns: s.turns, free: s.players.map(p => !!p.free) };
    if (!canGoOn(s)) { assert.ok(s.players.every(p => p.free || p.law === "carvaka")); continue; }
    assert.ok(goOn(s));
    went++;
    assert.equal(s.rules.on, before.turns);
    assert.ok(!s.over && !oneLife(s));
    assert.equal(s.rng.seed, before.seed);
    assert.deepEqual(s.players.map(p => p.lane), before.lanes);
    s.players.forEach((p, i) => {
      // the life that ended keeps its name, first in the seat's lives; a freed soul stays as it was
      assert.equal(names(s)[i][0], before.names[i][0]);
      if (before.free[i]) assert.equal(p.rebirths ?? 0, 0);
      else assert.equal(p.rebirths, 1, `seed ${seed} seat ${i} born again`);
    });
    assert.ok(s.log.some(e => e.k === "lGoOn"));
    assert.equal(goOn(s), false, "a game goes on once");
    run(s);
    assert.ok(s.players.every(p => p.free || p.law === "carvaka"), `seed ${seed}: played on until every soul is free`);
  }
  assert.ok(went >= 30, `went on in ${went} of 40`);
});

test("a game that went on is played again from its inputs to the same game, and a save resumes either way", () => {
  for (let seed = 1; seed <= 12; seed++) {
    const s = run(createGame({ players: [cpu(), cpu()], rules: ONE, seed }));
    // saved at the end of one life each: it goes on from the save as it would have
    const kept = clone(s);
    if (!goOn(s)) continue;
    assert.ok(goOn(kept));
    assert.deepEqual(clone(kept), clone(s));
    // saved partway through the going on, and resumed
    for (let n = 0; n < 15 && !s.over; n++) playTurn(s);
    const mid = clone(s);
    run(s); run(mid);
    assert.ok(sameGame(s, mid), `seed ${seed}: resumed to the same game`);
    // replayed from its inputs, it goes on at the same turn
    const r = replay(inputsOf(s));
    assert.ok(r.ok, `seed ${seed}: replay ok`);
    assert.ok(sameGame(r.state, s), `seed ${seed}: replay is the same game`);
    assert.equal(r.state.rules.on, s.rules.on);
  }
});

test("going on at the very turn it ended, with nothing played after, replays to the game it is", () => {
  const s = run(createGame({ players: [cpu(), cpu()], rules: ONE, seed: 3 }));
  assert.ok(goOn(s));
  const r = replay(inputsOf(s));
  assert.ok(r.ok && sameGame(r.state, s) && !r.state.over);
});

test("a table with people in it goes on only for a person's soul", () => {
  // seed 2: the person is let go and the computer falls; going on would play on for the computer alone
  const s = run(createGame({ players: [{ name: "A", type: "human" }, cpu()], rules: ONE, seed: 2 }));
  assert.ok(s.players[0].free && !s.players[1].free);
  assert.equal(canGoOn(s), false);
  assert.equal(goOn(s), false);
  assert.ok(s.over && s.rules.on == null);
});
