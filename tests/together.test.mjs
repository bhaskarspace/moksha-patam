// Phase 19 step 1: a game played together. Nobody wins by arriving first; a life let go frees its seat, every other end
// of a life is born again in it (a death by ledger through the animal life first), a Cārvāka seat has its one life, and
// the game is over when no person is still living. Lives that cross are kept in both books. The race is as it was.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn, gone } from "../src/engine/turn.js";
import { together, liberated } from "../src/engine/mode.js";
import { lifeOf } from "../src/engine/account.js";

const CAP = 6000;
const cpu = (law) => ({ name: "", alias: { en: "Ravi", hi: "रवि" }, type: "cpu", gender: "m", ...(law ? { law } : {}) });
function play(players, seed, rules = { six: true, mode: "together" }) {
  const s = createGame({ players, rules, seed });
  let n = 0;
  while (!s.over && n++ < CAP) playTurn(s);
  assert.ok(s.over, `seed ${seed} ended within ${CAP} turns`);
  return s;
}
// every life a seat lived, the closed ones first
const livesOf = p => [...(p.past ?? []), p];

test("together: nobody wins; every seat is freed, and every life before the last ended and was born again in the seat", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = play([cpu(), cpu(), cpu(), cpu()], seed);
    assert.ok(together(s));
    assert.equal(s.winner, null, `seed ${seed}: no winner`);
    s.players.forEach((p, i) => {
      assert.ok(p.free && liberated(s, i), `seed ${seed} seat ${i} is let go`);
      assert.equal(p.past?.length ?? 0, p.rebirths ?? 0);
      for (const q of p.past ?? []) assert.ok(q.dead || q.fell || q.earned || q.short, `seed ${seed} seat ${i}: a closed life ended`);
      assert.ok((p.past ?? []).every(q => !q.free), "only the last life is freed");
    });
  }
});

test("together: a death by ledger is born an animal in the seat first, and the interlude's end born human", () => {
  let seen = 0;
  for (let seed = 1; seed <= 300 && seen < 3; seed++) {
    const s = play([cpu(), cpu(), cpu(), cpu()], seed);
    for (const p of s.players) {
      const lives = livesOf(p);
      lives.forEach((q, k) => {
        if (q.death?.by !== "ledger") return;
        seen++;
        const a = lives[k + 1];
        assert.equal(a.law, "animal", `seed ${seed}: the life after a death by ledger is an animal's`);
        assert.ok(a.animal?.kind && a.carry, "it carries the soul through the interlude");
        // an animal once more after a first round short, then human
        let j = k + 1;
        while (lives[j]?.law === "animal") j++;
        if (lives[j]) assert.notEqual(lives[j].law, "animal");
      });
    }
  }
  assert.ok(seen >= 1, "a death by ledger came in some game");
});

test("together: a Cārvāka seat lives its one life and is done; the game ends when no person is still living", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const s = play([{ name: "Meera", type: "human", gender: "f", law: "carvaka" }, cpu(), cpu()], seed);
    const p = s.players[0];
    assert.ok(gone(p) && !p.free, `seed ${seed}: Cārvāka is done, not freed`);
    assert.equal(p.rebirths ?? 0, 0, "and was never born again");
    // the computers stop where they stand
    assert.ok(s.over);
  }
});

test("together: lives that cross are kept in both books, once a square in a life, and told in both languages", () => {
  let met = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const s = play([cpu(), cpu(), cpu(), cpu()], seed);
    s.players.forEach((p, i) => livesOf(p).forEach((q, k) => {
      for (const m of q.met ?? []) {
        met++;
        const o = livesOf(s.players[m.seat])[m.life];
        assert.ok(o?.met?.some(x => x.seat === i && x.sq === m.sq && x.life === k), `seed ${seed}: the meeting is in both books`);
      }
      const keys = (q.met ?? []).map(m => `${m.sq}.${m.seat}.${m.life}`);
      assert.equal(new Set(keys).size, keys.length, "a pair meets once a square in a life");
    }));
    const st = { ...s, players: s.players.map(p => ({ ...p })) };
    const i = s.players.findIndex(p => p.met?.length);
    if (i >= 0) for (const l of ["en", "hi"]) {
      const life = lifeOf(st, i, l), text = life.paras.map(x => x.text).join(" ");
      const m = s.players[i].met[0];
      assert.ok(text.includes(m.with[l]), `seed ${seed} ${l}: the account names who was met`);
    }
  }
  assert.ok(met > 0);
});

test("the race is as it was: the first through the exit wins, and nobody is born again but by Śiva's snake", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = play([cpu(), cpu(), cpu(), cpu()], seed, { six: true });
    assert.ok(!together(s));
    for (const p of s.players) {
      assert.ok(!p.free && !p.met);
      for (const q of p.past ?? []) assert.ok(q.fell, "a past life in the race is Śiva's snake's");
    }
  }
});
