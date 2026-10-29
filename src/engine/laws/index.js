// ---- The laws (REDESIGN.md §2.7, §3.2, Phase 17) ----
// A law is the game's rules as one darśana holds them. The engine never asks which law it is playing; it asks the law
// (src/engine/laws/board.js lists the hooks, each as the board's law plays it). A player's law is their own (p.law), or
// the game's (rules.law), or the board's.
import { board } from "./board.js";
import { mimamsa } from "./mimamsa.js";
import { carvaka } from "./carvaka.js";
import { animal } from "./animal.js";

// in the order they are offered: the board's first, the default
export const LAWS = { board, mimamsa, carvaka, animal };
export const lawOf = (state, i = state.turn) => LAWS[state.players[i]?.law ?? state.rules?.law ?? "board"] ?? board;
// whether a law is the board's own, the default, which the log does not announce
export const isDefault = l => l === board;
// the laws a player may choose, in the order they are offered
export const choosable = () => Object.values(LAWS).filter(l => l.choosable);
// may a player choose this law (the animal interlude never)
export const canChoose = id => Object.hasOwn(LAWS, id) && !!LAWS[id].choosable;
// Player i takes law id, as chosen on the between-lives card or by mp.law: a law that keeps no ledger takes the one the
// life was born with away.
export function setLaw(state, i, id) {
  const p = state.players[i];
  if (!Object.hasOwn(LAWS, id)) return;
  p.law = id;
  if (!lawOf(state, i).karma) p.karma = { sancita: [], agami: [], prarabdha: [] };
}
