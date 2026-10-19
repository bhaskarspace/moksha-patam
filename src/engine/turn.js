// The rules of a turn, with no DOM: the UI animates a plan, and tools/sim.mjs plays plans headless.
import { GOAL, TOP, LADDERS, SNAKES, HEAVEN } from "../content.js";
import { makeRng, die } from "../rng.js";
import { SPAN, turnYears, grow, freshGunas, freshAims, holdingOf, slotsFor, stageOfPlayer, SANNYASA } from "./self.js";

// The die shows this many random faces while it tumbles before the real roll. They come from the
// game's own sequence, so a headless game must draw them too to stay in step with the UI.
export const TUMBLE = 7;
export function rollValue(rng) {
  for (let i = 0; i < TUMBLE; i++) die(rng);
  return die(rng);
}

// ---- Dice as currency (REDESIGN.md Phase 9) ----
// From the top of the last ladder the player rolls two dice, sees both, and moves by either. Measured against
// "move up to the roll", which let a player stop on the exit every time and so never met the rebirth snake.
// Below 94 a turn is one die, as it always was.
export let ENDGAME = 94;
// tools/sim.mjs sweeps it; nothing in the game changes it
export const setEndgame = n => { ENDGAME = n; };
export const diceFor = p => (p.pos >= ENDGAME ? 2 : 1);
// The dice tumble together: each frame draws a face for every die, then each die draws its value. One die
// draws exactly what rollValue does, so a game below the endgame replays as it did before.
export function rollDice(rng, n) {
  for (let i = 0; i < TUMBLE; i++) for (let k = 0; k < n; k++) die(rng);
  return Array.from({ length: n }, () => die(rng));
}
// A sannyasin on the last squares of earth may move by neither die and sit the year out in practice. Only a
// sannyasin: practice counts for nobody else (src/engine/self.js grow). The divine row has only one slot: there
// you walk.
export const canSit = p => p.pos >= ENDGAME && p.pos <= 100 && stageOfPlayer(p) === SANNYASA && slotsFor(p).includes("practice");
// The moves a roll offers: each die's value once, and 0 for sitting.
export function movesFor(state, dice) {
  const p = state.players[state.turn], out = [...new Set(dice)];
  if (dice.length > 1 && canSit(p)) out.push(0);
  return out;
}
// The computer's choice, the same in the page and in tools/sim.mjs: the exit if a die reaches it, otherwise a
// die that is not a snake, the bigger one first; sitting only when both dice are snakes.
export function moveFor(state, dice) {
  const moves = movesFor(state, dice), plans = moves.filter(Boolean).map(v => planTurn(state, v, dice));
  const win = plans.find(pl => pl.win);
  if (win) return win.v;
  const safe = plans.filter(pl => pl.jump?.kind !== "snake").sort((a, b) => b.v - a.v);
  if (safe.length) return safe[0].v;
  return moves.includes(0) ? 0 : Math.max(...dice);
}

// A player has a gender for Hindi agreement (docs/NARRATIVE.md §4), an alias {en, hi} when the name was
// drawn rather than typed, and a life: every square landed on, in order, for the life account. Phase 8 adds
// who they are (src/engine/self.js): years lived, gunas, aims, the bhumika in sannyasa and the highest
// reached, and once the years run out, dead and the vice they were still holding.
export function createGame({ players, rules, seed }) {
  return {
    players: players.map((r, i) => ({ name: r.name.trim(), type: r.type, gender: r.gender || "m", alias: r.alias || null, color: i, pos: 0, face: "r", life: [], hasFallen: false,
      years: 0, gunas: freshGunas(), aims: freshAims(), practised: 0, bhumika: null, peak: null, dead: false, holding: null })),
    rules: { ...rules },
    // over: someone reached the exit, or nobody is left alive to
    turn: 0, winner: null, over: false, last: null,
    log: [{ k: "lNew", kind: "" }],
    rng: makeRng(seed),
  };
}

// Log entries keep a message key and values, so they re-translate when the language changes.
export const entry = (k, v = {}, kind = "", who = null) => ({ k, v, kind, who });
export function addLog(state, e) {
  state.log.unshift(e);
  state.log = state.log.slice(0, 80);
}

// What a roll of v does for the current player. Log entries come in three groups, by when the UI
// shows them: pre (before walking), after (on landing) and end (once the turn is over).
// A roll that would pass the top of the board walks up to it and back down by the remainder (bounce-back), so
// no roll is ever wasted. The exit sits partway along the divine row (REDESIGN.md Phase 7): landing exactly on it
// is liberation, passing it carries the player into the higher heavens, and a bounce off the top can bring them
// back down onto it. Under the Brahmaloka rule the exit stays shut until the player has once fallen by the
// rebirth snake: the first arrival walks on to its head instead (REDESIGN.md Phase 4).
// The rebirth snake takes a player back to birth, so it is rare: it takes only someone climbing onto its head,
// never one coming back down onto it from above, and only once in a life.
export const rebirthHead = () => +Object.keys(SNAKES).find(h => SNAKES[h].rebirth);
// v is the move: a die's value, or 0 to sit. dice is everything rolled; the dice not moved by are spare, and in
// sannyasa they go to practice (src/engine/self.js).
export function planTurn(state, v, dice = [v]) {
  const idx = state.turn, p = state.players[idx], from = p.pos, rules = state.rules;
  const pre = [], after = [], end = [], path = [];
  const spare = [...dice];
  if (v) spare.splice(spare.indexOf(v), 1);
  if (dice.length > 1) pre.push(entry(v ? "lDice" : "lDiceSit", { a: dice[0], b: dice[1], v }, "", idx));
  if (!v) {
    // a year sat out: no walk, no landing, and the year still passes
    const years = turnYears(p.years ?? 0, { sit: true }), died = years > SPAN;
    after.push(entry("lSit", { pos: from, sq: from }, "", idx));
    if (died) end.push(entry("lDied", { pos: from, age: years, sq: from }, "death", idx));
    return { idx, v, dice, spare, sit: true, from, path, target: from, final: from, jump: null, win: false, died, again: false, pre, after, end };
  }
  for (let i = 0, n = from, dir = 1; i < v; i++) {
    if (n === TOP) dir = -1;
    path.push((n += dir));
  }
  let target = path.at(-1);
  const bounced = from + v > TOP;
  const closed = rules.brahmaloka && !p.hasFallen && target === GOAL && rebirthHead();
  if (closed) for (let n = GOAL, d = Math.sign(closed - GOAL); n !== closed; ) path.push((target = n += d));
  // every square walked over and not landed on, once each, in the order they were passed
  const passed = [...new Set(path.slice(0, -1))].filter(n => n !== target);
  if (passed.length) after.push(entry("lPassed", { passed }, "passed", idx));
  let jump = null, final = target;
  const climbing = target > (path.at(-2) ?? from);
  const s = SNAKES[target] && (!SNAKES[target].rebirth || (climbing && !p.hasFallen)) ? SNAKES[target] : null, l = LADDERS[target];
  if (closed) after.push(entry("lClosed", { v, pos: target }, "", idx));
  if (s || l) {
    jump = { kind: s ? "snake" : "ladder", to: (s || l).to, rebirth: !!s?.rebirth };
    final = jump.to;
    after.push(entry(s?.rebirth ? "lRebirth" : s ? "lSnake" : "lLadder", { v, pos: target, to: jump.to, sq: target }, s ? "snake" : "ladder", idx));
  } else if (bounced) {
    after.push(entry("lBounce", { v, pos: target, sq: target }, HEAVEN[target] ? "heaven" : "", idx));
  } else if (HEAVEN[target]) {
    after.push(entry("lHeaven", { v, pos: target, sq: target }, "heaven", idx));
  } else if (target !== GOAL) {
    after.push(entry(from === 0 ? "lBorn" : "lMove", { v, pos: target, sq: target }, "", idx));
  }
  const win = final === GOAL;
  // A life ends when its years run out on earth (REDESIGN.md Phase 8). Only a life that walks ground it has
  // already lived can outrun the span, so only the snakes bring this about.
  const years = turnYears(p.years ?? 0, { target, final, jump }), died = !win && final <= 100 && years > SPAN;
  const again = !win && !died && v === 6 && rules.six;
  // coming back down onto the exit, after overshooting it, is said so: it is the point of the geometry
  if (win) end.push(entry(from > GOAL ? "lWinAbove" : "lWin", { pos: GOAL }, "heaven", idx));
  else if (died) end.push(entry("lDied", { pos: final, age: years, sq: final }, "death", idx));
  else if (again) end.push(entry("lSix", {}, "", idx));
  return { idx, v, dice, spare, sit: false, from, path, target, final, jump, win, died, again, pre, after, end };
}

export function endTurn(state, plan) {
  const p = state.players[plan.idx];
  p.pos = plan.final;
  // a snake or a ladder is two moments: the square that did it, and the one it led to
  // a year sat out is the same square again: on earth nothing else lands where it stands (src/engine/self.js)
  (p.life ||= []).push(...(plan.jump ? [plan.target, plan.final] : [plan.target]));
  if (plan.jump?.rebirth) p.hasFallen = true;
  Object.assign(p, grow(p, plan));
  if (plan.died) { p.dead = true; p.holding = holdingOf(p.life); }
  if (plan.win) state.winner = plan.idx;
  // the turn passes to the next player still alive; with nobody left, the game is over
  else if (!plan.again) for (let k = 1; k <= state.players.length; k++) {
    const i = (plan.idx + k) % state.players.length;
    if (!state.players[i].dead) { state.turn = i; break; }
  }
  // Over when someone is through, or nobody is left to be: in a game with people in it, once none of them is
  // alive, since the computers would only be playing on for nobody.
  const alive = state.players.filter(q => !q.dead), humans = state.players.some(q => q.type === "human");
  state.over = state.winner != null || !alive.length || (humans && !alive.some(q => q.type === "human"));
  plan.end.forEach(e => addLog(state, e));
}

// One whole turn without animation. A number is one die moved by; an array is the dice rolled, and pick chooses
// the move from them.
export function playTurn(state, roll = rollDice(state.rng, diceFor(state.players[state.turn])), pick = moveFor) {
  const dice = typeof roll === "number" ? [roll] : roll, v = dice.length > 1 ? pick(state, dice) : dice[0];
  state.last = v || dice[0];
  const plan = planTurn(state, v, dice);
  [...plan.pre, ...plan.after].forEach(e => addLog(state, e));
  endTurn(state, plan);
  return plan;
}
