// ---- Yoga (REDESIGN.md §2.7, Phase 17 step 5; Bhaskar, 29 Oct) ----
// Yogaś citta-vṛtti-nirodhaḥ (Yogasūtra 1.2): yoga is the stilling of the mind's turnings. Two acts, kept apart as
// Patañjali keeps them (1.12). Practice, abhyāsa, is chosen blind: before the throw, at any age and on any square of earth,
// the life may sit a year in practice instead of throwing, and each year sat stores one stillness, nirodha, up to three.
// Letting go, vairāgya, is restraint in the face of what came: after a throw, while a stillness is stored, the life may let
// the throw go, and spend one. It stays where it is and the year passes. No extra dice before 94. The stillness is said in
// words on the player's line, never as a number. The exit and everything else is the board's. Pure.
import { board } from "./board.js";
import { SNAKES, TOP } from "../../content.js";
import { canSit } from "../turn.js";
import { situationAt } from "../qbn.js";

export const NIRODHA_CAP = 3;
// the stillness player p has stored
export const stillness = p => p.nirodha ?? 0;
const earthly = p => p.pos >= 1 && p.pos <= 100;
// whether a 0 among the moves would be the law's: not Phase 9's year in practice, which a sannyāsin from 94 has already
const letsGo = (p, dice) => stillness(p) > 0 && earthly(p) && !(dice.length > 1 && canSit(p));
// a snake's head that bites on landing: not a situation's square, where the snake is a choice (a computer that dodged those
// would never be tested, and would plant a third of the debts it does)
const bites = n => !!SNAKES[n] && !situationAt(n);
// a throw its computer lets go: one that lands on a snake's head that bites, or on Śiva's square
const bad = (p, v) => bites(p.pos + v) || p.pos + v === TOP;

export const yoga = {
  ...board,
  id: "yoga",
  practice: (state, i) => { const p = state.players[i]; return earthly(p) && stillness(p) < NIRODHA_CAP; },
  // its computer sits when it holds no stillness and a snake's head that bites is within a throw
  sits: state => { const p = state.players[state.turn]; return stillness(p) === 0 && [1, 2, 3, 4, 5, 6].some(d => bites(p.pos + d)); },
  movesFor: (state, dice, base) => (letsGo(state.players[state.turn], dice) && !base.includes(0) ? [...base, 0] : base),
  zero: (state, i, dice) => (letsGo(state.players[i], dice) ? { act: "letGo", line: "lLetGo" } : null),
  // and lets a throw go when every die it could move by is bad
  prefer: (state, moves, dice) => {
    const p = state.players[state.turn];
    return moves.includes(0) && letsGo(p, dice) && moves.filter(Boolean).every(v => bad(p, v)) ? 0 : null;
  },
  afterTurn: (state, plan, p) => {
    if (plan.act === "practice") p.nirodha = Math.min(NIRODHA_CAP, stillness(p) + 1);
    if (plan.act === "letGo") p.nirodha = stillness(p) - 1;
  },
  line: p => (stillness(p) ? `still${stillness(p)}` : null),
  text: { ...board.text, name: "lawYoga", about: "lawYogaAbout", scholar: "lawYogaScholar" },
};
