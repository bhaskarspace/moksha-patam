// ---- The old cloth (REDESIGN.md Phase 18) ----
// A historical board played as the old game: a pawn, the board's own randomizer, its snakes and ladders, and its rules
// as the sources give them. None of the life the 110 carries: no years, moments, situations, debts, curse, cast, door,
// omen or rebirth. Its plans have the shape src/engine/turn.js's have (path, jump, target, final, win, and the log in
// pre, after and end), so the page animates them as it does any turn; turn.js hands a turn here when the board in play
// says engine "cloth" (content/boards.json rules). Pure.
import { BOARD, GOAL, TOP, SNAKES, LADDERS } from "../content.js";
import { drawThrow } from "./throws.js";

export const isCloth = () => BOARD.rules?.engine === "cloth";
// what the board is thrown with: the game's setting, else the board's own
export const randOf = state => (state.rules?.rand && state.rules.rand !== "own" ? state.rules.rand : BOARD.rules?.rand ?? "die");

// Every pawn begins in square 1, where the old charts begin (Schmidt-Madsen 2019, ch. 5, pp. 214, 217). The log begins
// with the old game, and names no law: the board's is its own.
export function setup(state) {
  state.log = [entry("cNew")];
  for (const p of state.players) Object.assign(p, { pos: 1, life: [1], told: [null] });
}

// A throw, tumbling as the page shows it: TUMBLE throws drawn and dropped, then the one that counts, drawn as the page and
// tools/sim.mjs both draw it (src/engine/throws.js). The shells of a cowrie throw are kept for the page to show.
export function rollDice(state) {
  const t = drawThrow(state, 1, { kind: randOf(state) });
  state.shells = t.up;
  return t.dice;
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

// The 84's walk above 80 (above: "turn"), as Jeṭhābhāī gives it (JBRR 1; Schmidt-Madsen 2019, App. F2, p. 606): a pawn
// that has not thrown the 1 on 80 goes on to the last square, 84, turns there, and comes back down the row to 76, whose
// snake takes it to 52, "and one should climb up again". The playthrough's rules (ch. 5, p. 217) finish the throw from 52,
// and a pawn whose throw ends on the way back keeps going back next time (back), so a 1 on 80 coming down still climbs.
// Returns the squares walked, whether the walk reached the snake on the way back (slide), the count left after it
// (rest), and whether the pawn is still coming back. With bounce (Harikṛṣṇa's endgame, roam below) the pawn turns at low
// too, and goes back and forth between low and end for as long as the throw lasts.
export function turnWalk(from, v, back, { end, back: low, bounce = false }) {
  const path = [];
  let n = from, dir = back ? -1 : 1;
  for (let i = 0; i < v; i++) {
    if (dir > 0 && n === end) dir = -1;
    else if (bounce && dir < 0 && n === low) dir = 1;
    n += dir;
    path.push(n);
    if (!bounce && dir < 0 && n === low) return { path, slide: true, rest: v - i - 1, back: false };
  }
  return { path, slide: false, rest: 0, back: dir < 0 };
}

// What a move that ends on square n does there: a snake takes the pawn down; a ladder is climbed at once, unless the
// board climbs on a 1 alone (climb: "one", the 84), when the pawn waits at its foot.
function landOn(n) {
  const s = SNAKES[n], l = LADDERS[n];
  if (s) return { kind: "snake", to: s.to };
  if (l && BOARD.rules.climb !== "one") return { kind: "ladder", to: l.to };
  return null;
}
// a square from which a 1 climbs (climb: "one"): a ladder's foot, or a footprint, up to the square above it
const climbFrom = n => (LADDERS[n] ? { kind: "ladder", to: LADDERS[n].to } : BOARD.rules.footprints?.[n] != null ? { kind: "foot", to: BOARD.rules.footprints[n] } : null);
// the log's line for a pawn that stays: no shell face up, not yet the 1 (or the 6) that leaves square 1, in the squares
// above, or a throw past the last square lost (exact)
const STAY = { zero: "cZero", entry: "cEntry", six: "cSix", top: "cTop", exact: "cExact" };

// The game's other rules for an old board (Phase 18 step 4), each off unless chosen, and each only where the board offers
// it (variants in content/boards.json rules). None is the board's own: two are modern and one is another board's.
// - start "six": only a 6 leaves square 1. Johari's rule for his modern redesign of the 72 (2007: 8), where the pawns
//   begin in Vaikuṇṭha; "not attested in any other sources" (Schmidt-Madsen 2019, ch. 5, p. 205). On the 84 it takes the
//   place of Jeṭhābhāī's 1.
// - end "exact": a throw that would pass the last square is lost, so past 68 the pawn must land exactly on 72 and take its
//   snake. Johari's again (2007: 9–10), "probably adapted from the modern game" (ibid. p. 208 fn. 353). Not on the 84,
//   where nothing above 80 goes down and a pawn past it could never move again.
// - end "roam": Harikṛṣṇa's endgame for an 84-square Vaiṣṇava chart (KK 245, comm.; ibid. p. 208 and fn. 353): a pawn past
//   the gate (gate.at: the 72's 68, the 84's 80) goes back and forth between it and the row's end until a throw ends on
//   it; on the 84, a 1 from 80 then climbs. A snake in the row still takes a pawn that ends on its head (the 72's on 72).
export const variantOf = (state, k) => { const v = state.rules?.[k]; return v && BOARD.rules.variants?.[k]?.includes(v) ? v : null; };

export function planTurn(state, v, dice = [v]) {
  const r = BOARD.rules, idx = state.turn, p = state.players[idx], from = p.pos, pre = [], after = [], end = [];
  const base = { idx, v, dice, spare: [], sit: false, from, jump: null, win: false, died: false, again: false, told: [], cost: 0, pre, after, end, back: false };
  const stay = why => { after.push(entry(STAY[why], { v, pos: from, sq: from, end: TOP }, "", idx)); return { ...base, stay: true, why, path: [], target: from, final: from, back: !!p.back }; };
  const done = plan => {
    const win = plan.final === GOAL;
    if (win) end.push(entry("cWin", { pos: GOAL, sq: GOAL }, "heaven", idx));
    return { ...base, ...plan, win, told: [null, ...(plan.jump ? [null] : [])] };
  };
  // no shell face up: the pawn stays where it is, and the turn passes
  if (!v) return stay("zero");
  // Jeṭhābhāī: one keeps throwing until a 1, and the 1 moves the pawn out of the first square (JBRR 1); or a 6, chosen
  const six = variantOf(state, "start") === "six", close = variantOf(state, "end");
  if (six ? from === 1 && v !== 6 : r.entry && from === 1 && v !== r.entry) return stay(six ? "six" : "entry");
  // the squares above the grid (steps): each 1 climbs one, up to the goal, and nothing else moves the pawn there
  const k = (r.steps ?? []).indexOf(from);
  if (k >= 0) {
    if (v !== 1) return stay("top");
    const to = r.steps[k + 1];
    after.push(entry("cStep", { v, pos: to, sq: to }, to === GOAL ? "heaven" : "", idx));
    return done({ path: [to], target: to, final: to });
  }
  // a 1 thrown at a ladder's foot or on a footprint climbs it, on a board that climbs so (climb: "one")
  const up = r.climb === "one" && v === 1 ? climbFrom(from) : null;
  if (up) {
    after.push(entry(up.kind === "foot" ? "cFoot" : "cClimb", { v, pos: from, to: up.to, sq: from }, "ladder", idx));
    return done({ path: [], target: from, jump: up, final: up.to });
  }
  // Johari's exact throw: a throw that would pass the last square is lost
  if (close === "exact" && from + v > TOP) return stay("exact");
  // Harikṛṣṇa's roam: past the gate, back and forth along the row until a throw ends on it
  if (close === "roam" && (p.back || from + v > r.gate.at)) {
    const w = turnWalk(from, v, !!p.back, { end: r.gate.end, back: r.gate.at, bounce: true }), target = w.path.at(-1);
    const passed = w.path.slice(0, -1);
    if (passed.length) after.push(entry("lPassed", { passed }, "passed", idx));
    const jump = landOn(target), wait = !jump && r.climb === "one" && climbFrom(target), roamed = w.back || w.path.includes(r.gate.end);
    const k2 = jump ? (jump.kind === "snake" ? "cSnake" : "cLadder") : target === GOAL ? "cMove" : wait ? "cMoveFoot" : roamed ? "cRoam" : "cMove";
    after.push(entry(k2, { v, pos: target, to: jump?.to, sq: target }, jump?.kind ?? (target === GOAL ? "heaven" : ""), idx));
    return done({ path: w.path, target, jump, final: jump ? jump.to : target, back: !jump && w.back });
  }
  if (r.above === "turn") {
    const w = turnWalk(from, v, !!p.back, r.turn), turned = !p.back && w.path.includes(r.turn.end) && w.path.at(-1) !== r.turn.end;
    const passed = w.path.slice(0, -1);
    if (passed.length) after.push(entry("lPassed", { passed }, "passed", idx));
    if (w.slide) {
      // down 76's snake, and the rest of the throw on from its tail
      const low = r.turn.back, tail = SNAKES[low].to, then = Array.from({ length: w.rest }, (_, i) => tail + i + 1);
      after.push(entry("cSlide", { v, pos: low, to: tail, sq: low }, "snake", idx));
      const last = then.at(-1), jump2 = last != null ? landOn(last) : null;
      if (last != null) after.push(entry(jump2 ? (jump2.kind === "snake" ? "cOnSnake" : "cOnLadder") : "cOn", { pos: last, to: jump2?.to, sq: last }, jump2?.kind === "snake" ? "snake" : "", idx));
      return done({ path: w.path, target: low, jump: { kind: "snake", to: tail }, then, jump2, final: jump2 ? jump2.to : last ?? tail });
    }
    const target = w.path.at(-1), jump = landOn(target), wait = !jump && r.climb === "one" && climbFrom(target);
    const k2 = jump ? (jump.kind === "snake" ? "cSnake" : "cLadder") : turned ? "cTurn" : w.back ? "cBack" : wait ? "cMoveFoot" : "cMove";
    after.push(entry(k2, { v, pos: target, to: jump?.to, sq: target }, jump?.kind ?? (target === GOAL ? "heaven" : ""), idx));
    return done({ path: w.path, target, jump, final: jump ? jump.to : target, back: w.back });
  }
  const { path, past } = walk(from, v), target = path.at(-1);
  const passed = path.slice(0, -1);
  if (passed.length) after.push(entry("lPassed", { passed }, "passed", idx));
  if (past) after.push(entry("cPast", { v, pos: target, sq: target }, "", idx));
  const jump = landOn(target), wait = !jump && r.climb === "one" && climbFrom(target);
  if (jump) after.push(entry(jump.kind === "snake" ? "cSnake" : "cLadder", { v, pos: target, to: jump.to, sq: target }, jump.kind, idx));
  else if (!past) after.push(entry(wait ? "cMoveFoot" : "cMove", { v, pos: target, sq: target }, target === GOAL ? "heaven" : "", idx));
  return done({ path, target, jump, final: jump ? jump.to : target });
}

// The turn's end: the pawn where the plan put it, the squares it stood on kept for the path at the end, and the turn
// passed. The first to reach the goal wins and the game is over: the old game is a race (ch. 5, pp. 214, 217).
export function endTurn(state, plan, addLog) {
  const p = state.players[plan.idx];
  p.pos = plan.final;
  // coming back down the 84's top row, or not (p.back: see turnWalk)
  if (plan.back) p.back = true; else delete p.back;
  if (!plan.stay) (p.life ||= []).push(...[plan.target, plan.jump?.to, plan.then?.at(-1), plan.jump2?.to].filter(n => n != null));
  if (plan.win) { p.won = "cloth"; state.winner = plan.idx; }
  else state.turn = (plan.idx + 1) % state.players.length;
  state.over = state.winner != null;
  plan.end.forEach(e => addLog(state, e));
}
