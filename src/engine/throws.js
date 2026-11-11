// ---- Same dice, two lives (REDESIGN.md Phase 19) ----
// Every throw is its own sequence, keyed by what it is: the game's seed, the lane of the life that throws, which of the
// seat's lives it is, and how many throws that life has made (p.thrown). Nothing a life chooses, sits out or walks
// changes the throws after it, and two people who play one seed on two devices throw the same dice, throw for throw,
// for as long as they live the same number of lives.
// A lane is not a seat: the people at a table take lanes 0, 1, … in the order they sit, and the computers the lanes after
// them, so a person playing a seed with or without a computer, before it or after it, is lane 0 (laneOf). The sequences
// of a life's own (the omen, the ego, grace, the curse, the cast, the joins, the mirror, a new birth's name) are salted by
// the lane too, and the omen, the ego and grace by the throw they follow rather than the squares walked.
// setDice("stream") gives back the game before Phase 19 exactly: one sequence for every seat, drawn in turn (the tumble
// first, then the dice), and every salt the seat's. Tools only (tools/accounts.mjs --dice=stream proves the prose).
import { makeRng, die } from "../rng.js";
import { throwOf } from "./dice.js";

export const TUMBLE = 7;
let DICE = "throw";
export const setDice = m => { DICE = m === "stream" ? "stream" : "throw"; };
export const diceMode = () => DICE;
// Whether game state throws off the shared sequence: under setDice("stream"), or a game begun before Phase 19 step 3,
// which never says how it throws (state.throws, written by createGame). A game saved before then and resumed goes on
// throwing as it always did, the same dice to the end, and every salt the seat's.
export const streamOf = state => DICE === "stream" || state?.throws !== "own";
// what createGame writes, so a game knows how it throws for as long as it is kept
export const throwsNew = () => (DICE === "stream" ? {} : { throws: "own" });

// The lanes of a table, from its rows: people first, in order, then computers
export const lanesOf = players => {
  let people = 0;
  const humans = players.filter(p => p.type === "human").length;
  let cpus = 0;
  return players.map(p => (p.type === "human" ? people++ : humans + cpus++));
};
// The lane of seat i: what every sequence of its own is salted by
export const laneOf = (state, i) => (streamOf(state) ? i : state.players[i]?.lane ?? i);
// What the omen, the ego and grace are salted by after a move: the squares walked, before Phase 19, or now the throws made
export const drawnOf = (state, i, lived) => (streamOf(state) ? lived : state.players[i]?.thrown ?? 0);

// a word of 32 bits from several, every bit of each reaching every bit of the result
export function mix(...xs) {
  let h = 0x9e3779b9;
  for (const x of xs) {
    h = Math.imul(h ^ (x >>> 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}
const DIE = 0x51ed2701, TUMBLES = 0x7b4a11e3, CLOTH = 0x3c0ffee5;
// The sequence of throw k of seat i's present life, for one purpose
export const throwRng = (state, i, k, what = DIE) =>
  makeRng(mix(state.rng.seed, what, laneOf(state, i) + 1, (state.players[i]?.rebirths ?? 0) + 1, k + 1));

// The next throw of seat i: n dice (or, on an old cloth, one throw of its randomizer, kind), and the TUMBLE frames the
// page shows before it. Die d of a throw is the d-th draw of its sequence, so one die at 55 and two at 95 share the first.
// forced (?debug's mp.roll) takes the dice's place; it is not drawn, but it is a throw, and counts.
// Returns { frames: [[faces]…], dice, up }: up is a cowrie throw's shells.
export function drawThrow(state, n, { i = state.turn, kind = null, forced = null } = {}) {
  const p = state.players[i], k = p.thrown ?? 0, stream = streamOf(state);
  const r = stream ? state.rng : throwRng(state, i, k), rt = stream ? state.rng : throwRng(state, i, k, TUMBLES);
  let frames, dice, up = null;
  if (kind) {
    frames = Array.from({ length: TUMBLE }, () => throwOf(rt, kind));
    const t = forced != null ? null : throwOf(stream ? r : throwRng(state, i, k, CLOTH), kind);
    dice = [forced?.[0] ?? t.v];
    up = t?.up ?? null;
    frames = frames.map(f => ({ v: [f.v], up: f.up ?? null }));
  } else {
    frames = Array.from({ length: TUMBLE }, () => ({ v: Array.from({ length: n }, () => die(rt)), up: null }));
    dice = forced ? Array.from({ length: n }, (_, d) => forced[d] ?? forced[0]) : Array.from({ length: n }, () => die(r));
  }
  if (!stream) p.thrown = k + 1;
  return { frames, dice, up };
}
