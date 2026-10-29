// REDESIGN.md Phase 14, docs/NARRATIVE.md §13.6: the curse, a fuse with a sentence.
import test from "node:test";
import assert from "node:assert/strict";
import { CURSES } from "../src/content.js";
import { createGame, playTurn } from "../src/engine/turn.js";
import { curseOf, curseIn } from "../src/engine/curse.js";
import { lifeOf, lifeText } from "../src/engine/account.js";
import { firstLives } from "./lives.mjs";

const life = (seed, gender = "f") => {
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender }], rules: { six: true }, seed });
  while (!s.over) playTurn(s);
  return firstLives(s);
};

test("one curse is drawn per life, off a sequence of its own: the same game draws the same, and every one is drawn", () => {
  const seen = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const a = createGame({ players: [{ name: "", type: "cpu" }], rules: {}, seed }), b = createGame({ players: [{ name: "", type: "cpu" }], rules: {}, seed });
    assert.equal(curseOf(a, 0).id, curseOf(b, 0).id);
    seen.add(curseOf(a, 0).id);
  }
  assert.equal(seen.size, CURSES.list.length);
  // eight, each tied to a family of late squares, and none names a square
  assert.equal(CURSES.list.length, 8);
  for (const c of CURSES.list) {
    assert.ok(c.family.length >= 4 && c.family.every(n => n >= 44), c.id);
    for (const l of ["en", "hi"]) assert.doesNotMatch(c.line[l], /\d|square|खाना/, `${c.id} ${l}`);
  }
});

test("the curse is spoken early, and closed in the account either way", () => {
  let landed = null, not = null;
  for (let seed = 1; seed <= 300 && !(landed && not); seed++) {
    const s = life(seed), p = s.players[0], cu = curseIn(p);
    assert.ok(cu && cu.age >= cu.c.from && cu.age <= 20, `seed ${seed} spoken at ${cu?.age}`);
    if (cu.closedAt != null) landed ??= s; else if (p.fell || p.dead || s.winner === 0) not ??= s;
  }
  for (const [s, way] of [[landed, "landed"], [not, "not"]]) {
    const cu = curseIn(s.players[0]);
    for (const l of ["en", "hi"]) {
      // the line said reads on after its join, so it may begin in lower case
      const text = lifeText(s, 0, l).toLowerCase(), said = cu.c.line[l].split("{")[0].toLowerCase();
      const close = cu.c[way][l].replace("{name}", "Meera").replace(/\{[^|}]*\|([^}]*)\}/, "$1").toLowerCase();
      assert.ok(text.includes(said) && text.includes(close), `${way} ${l}\n${text}`);
      assert.ok(text.indexOf(said) < text.indexOf(close), `${way} ${l}: closed before it was said`);
      assert.doesNotMatch(text, /[{}]|undefined/);
    }
    // landed, it is closed where it came true; not, after the life's last line
    assert.equal(!!lifeOf(s, 0, "en").curse, way === "not");
  }
});

test("with the curses taken away nothing is drawn, and the account has no curse in it", () => {
  const saved = CURSES.list;
  CURSES.list = null;
  try {
    const s = life(5);
    assert.equal(s.players[0].curse ?? null, null);
    assert.equal(lifeOf(s, 0, "en").curse, "");
  } finally { CURSES.list = saved; }
});

// Bhaskar's live check of Phase 15: a curse is said only in childhood or brahmacharya. A life that never lands there young
// enough (here, a token moved by hand to 52, as mp.jump does) never hears it, and the account never closes it.
test("a curse is never spoken late, and an unspoken curse is never closed", () => {
  for (let seed = 1; seed <= 20; seed++) {
    let s = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f" }], rules: { six: true }, seed });
    s.players[0].pos = 52;
    while (!s.over) playTurn(s);
    s = firstLives(s);
    assert.equal(s.players[0].curse, undefined, `seed ${seed}`);
    for (const l of ["en", "hi"]) assert.equal(lifeOf(s, 0, l).curse, "");
  }
});
