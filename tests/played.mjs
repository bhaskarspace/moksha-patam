// A game with people in it, who choose at random off a sequence of their own, recorded as the page records them
// (src/main.js noteChoice): a die or the law's act when there is more than one move, an option on a situation, a year in
// practice or not when one could be sat, and the law of a life born again at its first throw. Shared by the Phase 19 tests.
import { createGame, playTurn, throwDice, diceFor, movesFor, moveFor, spentOf, canPractise, practisesNow } from "../src/engine/turn.js";
import { lawOf, setLaw } from "../src/engine/laws/index.js";
import { optionsFor } from "../src/engine/qbn.js";
import { makeRng, next } from "../src/rng.js";

export const CAP = 6000;
// a game with people in it, who choose at random off a sequence of their own, recorded as the page records them
export function played(players, seed, rules, { stopAt = Infinity, laws = false, salt = 0 } = {}) {
  const s = createGame({ players, rules, seed }), r = makeRng((seed ^ 0x51ed ^ Math.imul(salt, 0x9e3779b1)) >>> 0), noted = s.players.map(() => 0);
  const note = (p, x) => (p.choices ||= []).push(x);
  let n = 0;
  while (!s.over && n++ < Math.min(CAP, stopAt)) {
    const i = s.turn, p = s.players[i], human = p.type === "human", auto = lawOf(s, i).auto;
    let prac = false;
    if (human) {
      if ((p.rebirths ?? 0) !== noted[i]) {
        noted[i] = p.rebirths ?? 0;
        // now and then a law chosen between lives, as the card offers
        if (laws && next(r) < 0.4) setLaw(s, i, ["board", "bhakti", "yoga", "jain"][Math.floor(next(r) * 4)]);
        note(p, "l" + (p.law ?? ""));
      }
      if (!spentOf(p) && canPractise(s, i)) { prac = next(r) < 0.3; note(p, prac ? "p" : "r"); }
    }
    const roll = spentOf(p) || (human ? prac : practisesNow(s)) ? [] : throwDice(s, diceFor(p));
    const pick = (st, dice) => {
      if (!human || auto) return moveFor(st, dice);
      const m = movesFor(st, dice);
      if (m.length < 2) return m[0] ?? null;
      const v = m[Math.floor(next(r) * m.length)];
      note(p, String(v));
      return v;
    };
    const choose = (st, sit) => {
      if (!human || auto) return lawOf(st).choose(st, sit);
      const open = optionsFor(p, sit).filter(o => o.open), id = open[Math.floor(next(r) * open.length)].id;
      note(p, "o" + id);
      return id;
    };
    playTurn(s, roll, pick, choose);
  }
  // Stop here, if it came first
  if (!s.over) Object.assign(s, { over: true, stopped: true });
  return s;
}
export const person = (name, gender, law) => ({ name, type: "human", gender, ...(law ? { law } : {}) });
export const cpu = () => ({ name: "", alias: { en: "Ravi", hi: "रवि" }, type: "cpu", gender: "m" });
