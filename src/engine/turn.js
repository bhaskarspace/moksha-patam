// The rules of a turn, with no DOM: the UI animates a plan, and tools/sim.mjs plays plans headless.
import { GOAL, LADDERS, SNAKES, HEAVEN } from "../content.js";
import { makeRng, die } from "../rng.js";

// The die shows this many random faces while it tumbles before the real roll. They come from the
// game's own sequence, so a headless game must draw them too to stay in step with the UI.
export const TUMBLE = 7;
export function rollValue(rng) {
  for (let i = 0; i < TUMBLE; i++) die(rng);
  return die(rng);
}

// A player has a gender for Hindi agreement (docs/NARRATIVE.md §4), an alias {en, hi} when the name was
// drawn rather than typed, and a life: every square landed on, in order, for the life account.
export function createGame({ players, rules, seed }) {
  return {
    players: players.map((r, i) => ({ name: r.name.trim(), type: r.type, gender: r.gender || "m", alias: r.alias || null, color: i, pos: 0, face: "r", life: [] })),
    rules: { ...rules },
    turn: 0, winner: null, last: null,
    log: [{ k: "lNew", kind: "" }],
    rng: makeRng(seed),
  };
}

// Log entries keep a message key and values, so they re-translate when the language changes.
export const entry = (k, v = {}, kind = "", who = null) => ({ k, v, kind, who });
export function addLog(state, e) {
  state.log.unshift(e);
  state.log = state.log.slice(0, 60);
}

// What a roll of v does for the current player. Log entries come in three groups, by when the UI
// shows them: pre (before walking), after (on landing) and end (once the turn is over).
export function planTurn(state, v) {
  const idx = state.turn, from = state.players[idx].pos, rules = state.rules;
  const pre = [], after = [], end = [];
  let target = from + v;
  if (target > GOAL) {
    if (rules.exact) {
      pre.push(entry("lExact", { v, need: GOAL - from, pos: from }, "", idx));
      target = from;
    } else target = GOAL;
  }
  let jump = null, final = target;
  if (target !== from) {
    const s = SNAKES[target], l = LADDERS[target];
    if (s || l) {
      jump = { kind: s ? "snake" : "ladder", to: (s || l).to };
      final = jump.to;
      after.push(entry(s ? "lSnake" : "lLadder", { v, pos: target, to: jump.to, sq: target }, s ? "snake" : "ladder", idx));
    } else if (HEAVEN[target]) {
      after.push(entry("lHeaven", { v, pos: target, sq: target }, "heaven", idx));
    } else if (target !== GOAL) {
      after.push(entry(from === 0 ? "lBorn" : "lMove", { v, pos: target, sq: target }, "", idx));
    }
  }
  const win = final === GOAL, again = !win && v === 6 && rules.six;
  if (win) end.push(entry("lWin", { pos: GOAL }, "heaven", idx));
  else if (again) end.push(entry("lSix", {}, "", idx));
  return { idx, v, from, target, final, jump, win, again, pre, after, end };
}

export function endTurn(state, plan) {
  const p = state.players[plan.idx];
  p.pos = plan.final;
  // a snake or a ladder is two moments: the square that did it, and the one it led to
  if (plan.target !== plan.from) (p.life ||= []).push(...(plan.jump ? [plan.target, plan.final] : [plan.target]));
  if (plan.win) state.winner = plan.idx;
  else if (!plan.again) state.turn = (state.turn + 1) % state.players.length;
  plan.end.forEach(e => addLog(state, e));
}

// One whole turn without animation.
export function playTurn(state, v = rollValue(state.rng)) {
  state.last = v;
  const plan = planTurn(state, v);
  [...plan.pre, ...plan.after].forEach(e => addLog(state, e));
  endTurn(state, plan);
  return plan;
}
