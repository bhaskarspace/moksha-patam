// ---- The laws (REDESIGN.md §2.7, §3.2, Phase 17) ----
// A law is the game's rules as one darśana holds them. The engine never asks which law it is playing; it asks the law
// (src/engine/laws/board.js lists the hooks, each as the board's law plays it). A player's law is their own (p.law), or
// the game's (rules.law), or the board's.
import { board } from "./board.js";
import { animal } from "./animal.js";

export const LAWS = { board, animal };
export const lawOf = (state, i = state.turn) => LAWS[state.players[i]?.law ?? state.rules?.law ?? "board"] ?? board;
// the laws a player may choose, in the order they are offered
export const choosable = () => Object.values(LAWS).filter(l => l.choosable);
