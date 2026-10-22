import test from "node:test";
import assert from "node:assert/strict";
import { GOAL, SQ } from "../src/content.js";
import { createGame, planTurn, toldOn, ENDGAME } from "../src/engine/turn.js";
import { omenFor, omenChance, OMEN } from "../src/engine/karma.js";

// REDESIGN.md §5 and Phase 12: the 1 is the threshold face and the 6 is the world's. The world's events come on a 6
// and never on a 1 alone; a slow arrival on a 1 is the one that notices.
const ripe = (src = 12, opt = "lie") => ({ sancita: [], agami: [], prarabdha: [{ src, opt, at: 7, fuse: 15, weight: 1 }] });
const game = (pos, karma = ripe()) => {
  const s = createGame({ players: [{ name: "", type: "human" }], rules: { six: true }, seed: 9 });
  Object.assign(s.players[0], { pos, years: 40, karma });
  return s;
};
const ground = [...Array.from({ length: 100 }, (_, i) => i + 1), GOAL];
const allDice = [...[1, 2, 3, 4, 5, 6].map(a => [a]), ...[1, 2, 3, 4, 5, 6].flatMap(a => [1, 2, 3, 4, 5, 6].map(b => [a, b]))];

test("the omen never comes without a 6: a 1, or any dice with no 6, never fires it", () => {
  for (const pos of ground) for (const dice of allDice.filter(d => !d.includes(OMEN))) {
    const s = game(pos);
    for (let lived = 0; lived < 40; lived += 7) assert.equal(omenFor(s, 0, { dice, pos, years: 40, lived }), null, `${dice} at ${pos}`);
  }
});

test("only a 6 gives the omen a chance, and on the ground that chance is never zero", () => {
  for (const pos of ground) {
    const s = game(pos);
    const six = omenFor(s, 0, { dice: [6], pos, years: 40, lived: 3 });
    assert.ok(six && six.chance > 0 && six.chance === omenChance(pos), `6 at ${pos}`);
    assert.equal(omenFor(s, 0, { dice: [1], pos, years: 40, lived: 3 }), null);
  }
  // with nothing ripe a 6 is only a 6
  assert.equal(omenFor(game(60, { sancita: [], agami: [], prarabdha: [] }), 0, { dice: [6], pos: 60, years: 40, lived: 3 }), null);
});

test("every square told by the roll brings its misfortune on the high faces, never on a 1", () => {
  const rolls = Object.entries(SQ).filter(([, q]) => q.roll);
  assert.ok(rolls.length >= 10);
  for (const [n, q] of rolls) {
    assert.equal(q.roll.valence, "bad", `square ${n}`);
    assert.equal(toldOn(+n, 1), "else", `square ${n}: a 1 tells the noticing moment`);
    assert.equal(toldOn(+n, 6), null, `square ${n}: a 6 tells the square's own`);
  }
});

test("the win and the gate never depend on a face being 6", () => {
  for (let from = GOAL - 6; from < GOAL; from++) {
    const v = GOAL - from, dice = from >= ENDGAME ? [v, v === 1 ? 2 : 1] : [v];
    const clean = planTurn(game(from, { sancita: [], agami: [], prarabdha: [] }), v, dice);
    assert.equal(clean.win, true, `${v} from ${from}`);
    const owing = planTurn(game(from, { sancita: [], agami: [{ src: 12, opt: "lie", at: 7, fuse: 15, weight: 1 }], prarabdha: [] }), v, dice);
    assert.equal(owing.win, false);
    assert.ok(owing.refused?.debts?.length, `${v} from ${from}: refused for the debt`);
  }
});
