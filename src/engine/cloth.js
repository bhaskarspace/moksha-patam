// ---- The old cloth (REDESIGN.md Phase 18) ----
// A historical board played as the old game: a pawn, the board's own randomizer, its snakes and ladders, and its rules
// as the sources give them. None of the life the 110 carries: no years, moments, situations, debts, curse, cast, door,
// omen or rebirth. Its plans have the shape src/engine/turn.js's have (path, jump, target, final, win, and the log in
// pre, after and end), so the page animates them as it does any turn; turn.js hands a turn here when the board in play
// says engine "cloth" (content/boards.json rules). Pure.
import { BOARD, GOAL, TOP, SNAKES, LADDERS } from "../content.js";
import { throwOf } from "./dice.js";

const TUMBLE = 7;
export const isCloth = () => BOARD.rules?.engine === "cloth";
// what the board is thrown with: the game's setting, else the board's own
export const randOf = state => (state.rules?.rand && state.rules.rand !== "own" ? state.rules.rand : BOARD.rules?.rand ?? "die");

// Every pawn begins in square 1, where the old charts begin (Schmidt-Madsen 2019, ch. 5, pp. 214, 217). The log begins
// with the old game, and names no law: the board's is its own.
export function setup(state) {
  state.log = [entry("cNew")];
  for (const p of state.players) Object.assign(p, { pos: 1, life: [1], told: [null] });
}

// A throw, tumbling as the page shows it: TUMBLE throws drawn and dropped, then the one that counts, all off the game's
// sequence so the page and tools/sim.mjs draw alike. The shells of a cowrie throw are kept for the page to show.
export function rollDice(state) {
  const kind = randOf(state);
  for (let i = 0; i < TUMBLE; i++) throwOf(state.rng, kind);
  const t = throwOf(state.rng, kind);
  state.shells = t.up ?? null;
  return [t.v];
}
export const movesFor = (state, dice) => [dice[0]];

// The square a throw of v from square `from` reaches, and the squares walked to it. On the 72 a throw that would pass
// the last square stops on it (above: "snake"), and its snake takes the pawn down. The sources are silent on the
// count left over: Dampier (1895: 25), the only early witness for the 72, says the pawn lands on 72 and follows the
// snake to 51, or passes 72 and plays on from 1 (Schmidt-Madsen 2019, ch. 5, "Endgame", p. 208); Schmidt-Madsen's
// carrying of the rest of the count on from 51 (pp. 210, 214) is his reading of Jeṭhābhāī's rule for the 84 (JBRR 2-3),
// which Jeṭhābhāī prescribes for that board alone. So the conservative reading: the pawn stops on 72, takes the snake,
// and stays on 51 (Bhaskar, 3 Nov).
export function walk(from, v) {
  const to = Math.min(from + v, TOP), path = [];
  for (let n = from; n < to; ) path.push(++n);
  return { path, past: from + v > TOP };
}

export const entry = (k, v = {}, kind = "", who = null) => ({ k, v, kind, who });

export function planTurn(state, v, dice = [v]) {
  const idx = state.turn, p = state.players[idx], from = p.pos, pre = [], after = [], end = [];
  const base = { idx, v, dice, spare: [], sit: false, from, jump: null, win: false, died: false, again: false, told: [], cost: 0, pre, after, end };
  // no shell face up: the pawn stays where it is, and the turn passes
  if (!v) {
    after.push(entry("cZero", { pos: from, sq: from }, "", idx));
    return { ...base, stay: true, why: "zero", path: [], target: from, final: from };
  }
  const { path, past } = walk(from, v), target = path.at(-1);
  const passed = path.slice(0, -1);
  if (passed.length) after.push(entry("lPassed", { passed }, "passed", idx));
  if (past) after.push(entry("cPast", { v, pos: target, sq: target }, "", idx));
  const s = SNAKES[target], l = LADDERS[target];
  const jump = s ? { kind: "snake", to: s.to } : l ? { kind: "ladder", to: l.to } : null;
  const final = jump ? jump.to : target;
  if (jump) after.push(entry(s ? "cSnake" : "cLadder", { v, pos: target, to: jump.to, sq: target }, s ? "snake" : "ladder", idx));
  else if (!past) after.push(entry("cMove", { v, pos: target, sq: target }, target === GOAL ? "heaven" : "", idx));
  const win = final === GOAL;
  if (win) end.push(entry("cWin", { pos: GOAL, sq: GOAL }, "heaven", idx));
  return { ...base, path, target, final, jump, win, told: [null, ...(jump ? [null] : [])] };
}

// The turn's end: the pawn where the plan put it, the squares it stood on kept for the path at the end, and the turn
// passed. The first to reach the goal wins and the game is over: the old game is a race (ch. 5, pp. 214, 217).
export function endTurn(state, plan, addLog) {
  const p = state.players[plan.idx];
  p.pos = plan.final;
  if (!plan.stay) (p.life ||= []).push(plan.target, ...(plan.jump ? [plan.jump.to] : []));
  if (plan.win) { p.won = "cloth"; state.winner = plan.idx; }
  else state.turn = (plan.idx + 1) % state.players.length;
  state.over = state.winner != null;
  plan.end.forEach(e => addLog(state, e));
}
