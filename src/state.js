// Shared mutable state for the page. gen changes on every new game, so animations from an
// abandoned turn stop where they are.
import { t } from "./i18n.js";
import { createGame } from "./engine/turn.js";
import { freshSeed } from "./rng.js";

export const G = { setup: null, state: null, busy: false, cpuTimer: null, gen: 0, forcedRoll: null, cardClose: null };

export const defaultSetup = () => ({
  count: 2,
  rows: [{ name: "", type: "human" }, { name: "", type: "cpu" }, { name: "", type: "cpu" }, { name: "", type: "cpu" }],
  rules: { exact: true, six: true, cards: "all" },
});
// older saves stored cards as true/false
export const cardsMode = r => (r.cards === true || r.cards == null ? "all" : r.cards === false ? "off" : r.cards);

export const pname = p => p.name || t("def" + p.color);
export const cur = () => G.state.players[G.state.turn];

export function newState(seed = freshSeed()) {
  return createGame({ players: G.setup.rows.slice(0, G.setup.count), rules: G.setup.rules, seed });
}
