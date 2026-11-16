// Phase 20: the book beside the board (src/render/book.js) is written as the life goes, and never rewrites a line:
// every turn's book of a life still going on begins with the last turn's, block for block (bookOf in account.js).
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn } from "../src/engine/turn.js";
import { bookOf, lifeOf } from "../src/engine/account.js";
import { LAWS } from "../src/engine/laws/index.js";

const lifeKey = p => `${p.rebirths ?? 0}.${p.past?.length ?? 0}.${!!p.animal}.${p.name}`;

function grows(state, l, seen, where) {
  state.players.forEach((p, i) => {
    const key = `${i}.${lifeKey(p)}`, now = bookOf(state, i, l), was = seen.get(i);
    if (was && was.key === key && (p.life?.length ?? 0) >= was.len) {
      assert.ok(now.length >= was.book.length, `${where} seat ${i}: the book got shorter`);
      for (let k = 0; k < was.book.length; k++) assert.deepEqual(now[k], was.book[k], `${where} seat ${i}, block ${k} was rewritten`);
    }
    seen.set(i, { key, book: now, len: p.life?.length ?? 0 });
  });
}

const games = [];
for (let seed = 1; seed <= 24; seed++) games.push({ seed, players: 2, rules: { six: true } });
for (let seed = 1; seed <= 12; seed++) games.push({ seed: 100 + seed, players: 3, rules: { six: true, mode: "together", length: seed % 2 ? "one" : "free" } });
for (const law of Object.keys(LAWS)) games.push({ seed: 300, players: 2, rules: { six: true, law } });

test("the book of a life still going on only ever grows, in both languages, on every law and table", () => {
  for (const g of games) {
    for (const l of ["en", "hi"]) {
      const s = createGame({ players: Array.from({ length: g.players }, (_, k) => ({ name: ["Meera", "Ravi", "Asha"][k], type: "cpu", gender: k % 2 ? "m" : "f" })), rules: g.rules, seed: g.seed });
      const seen = new Map();
      let n = 0;
      while (!s.over && n++ < 900) { playTurn(s); grows(s, l, seen, `seed ${g.seed} ${l} turn ${n}`); }
    }
  }
});

test("the book names the āśrama where the life enters it, and its parts are the account's", () => {
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f" }], rules: { six: true }, seed: 5 });
  while (!s.over) playTurn(s);
  const book = bookOf(s, 0, "en"), L = lifeOf(s, 0, "en");
  assert.deepEqual(book.filter(b => b.stage).map(b => b.stage), L.paras.map(q => q.head.split(",")[0]));
  assert.equal(book.filter(b => b.text && !b.end).map(b => b.text).join(" "), L.paras.map(q => q.text).join(" "));
  assert.ok(book.at(-1).end, "a finished game's book ends on its ending");
});
