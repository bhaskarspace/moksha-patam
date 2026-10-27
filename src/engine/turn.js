// The rules of a turn, with no DOM: the UI animates a plan, and tools/sim.mjs plays plans headless.
import { GOAL, TOP, LADDERS, SNAKES, HEAVEN, SQ } from "../content.js";
import { makeRng, die } from "../rng.js";
import { SPAN, turnYears, grow, freshGunas, freshAims, holdingOf, slotsFor, stageOfPlayer, SANNYASA } from "./self.js";
import { situationAt, optionOf, choiceFor, egoOf, egoFacesOn, egoThrow } from "./qbn.js";
import { freshKarma, karmaOf, carried, ripen, plantOf, omenFor, refusalOf, examineOf, meet, DEATH } from "./karma.js";
import { curseOf, spokenAt } from "./curse.js";

// The die shows this many random faces while it tumbles before the real roll. They come from the
// game's own sequence, so a headless game must draw them too to stay in step with the UI.
export const TUMBLE = 7;
export function rollValue(rng) {
  for (let i = 0; i < TUMBLE; i++) die(rng);
  return die(rng);
}

// ---- Dice as currency (REDESIGN.md Phase 9) ----
// From the top of the last ladder the player rolls two dice, sees both, and moves by either. Measured against
// "move up to the roll", which let a player stop on the exit every time and so never met the fall.
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
// ---- Roll-dependent squares (REDESIGN.md Phase 10) ----
// A story square below the endgame may tell one of two moments, by how fast the player arrived: the face of the
// die moved by, never the distance. A slow arrival noticed what was there; a fast one went straight past it, or it
// caught them. The square's own moment is the event, and its valence says which faces bring it: a good event the
// low ones, a misfortune the high ones. Only on one die: from ENDGAME the player chooses the die and could choose
// the event, so there it would be free. Returns "else" for the other moment, or null for the square's own. Nothing
// is drawn and nothing moves, so the dice and the board are exactly as they were.
export function toldOn(n, face, dice = [face]) {
  const r = SQ[n]?.roll;
  if (!r || dice.length !== 1 || !face || n >= ENDGAME) return null;
  const fires = r.valence === "good" ? face <= r.faces : face > 6 - r.faces;
  return fires ? null : "else";
}

// A sannyasin on the last squares of earth may move by neither die and sit the year out in practice. Only a
// sannyasin: practice counts for nobody else (src/engine/self.js grow). The divine row has only one slot: there
// you walk. A sannyasin the door at 105 has refused may sit there too (REDESIGN.md Phase 12); it is still earth, and
// since Phase 14 each year sat there is a question of the examination (src/engine/karma.js examineOf).
export const canSit = p => p.pos >= ENDGAME && (p.pos <= 100 || p.pos === GOAL) && stageOfPlayer(p) === SANNYASA && slotsFor(p).includes("practice");
// The moves a roll offers: each die's value once, and 0 for sitting.
export function movesFor(state, dice) {
  const p = state.players[state.turn], out = [...new Set(dice)];
  if (dice.length > 1 && canSit(p)) out.push(0);
  return out;
}
// The computer's choice, the same in the page and in tools/sim.mjs: the exit if a die reaches it; at a door that has
// refused it, sitting there to be examined, wherever it may (Phase 14); otherwise a die
// that stops short of the exit and is not a snake, the bigger first; then the exit even if it will refuse them (Phase
// 12); then sitting, where a sannyasin may; then a die
// into the heavens, the smaller first, to stay there longest; then a snake; and the fall last, since it ends the life
// (REDESIGN.md Phase 12 treats the throw past the top as the heavens' snake). Below the exit this is Phase 9's choice
// exactly; Phase 9's whole rule, the bigger die that is not a snake, is kept in tools/sim.mjs as --pick=phase9.
// It ranks by where the dice take it, before the omen: nobody sees a reckoning coming.
export function moveFor(state, dice) {
  const moves = movesFor(state, dice), plans = moves.filter(Boolean).map(v => planTurn(state, v, dice));
  const to = pl => pl.reckon?.from ?? pl.final;
  const win = plans.find(pl => pl.win);
  if (win) return win.v;
  // ...unless the door has already said that no penance pays what it owes (Phase 16): then it throws on
  const p = state.players[state.turn], ex = p.pos === GOAL ? examineOf(p) : null, stay = moves.includes(0) && !(ex?.never && ex.n > 1);
  if (stay && p.pos === GOAL) return 0;
  const short = plans.filter(pl => !pl.fell && to(pl) < GOAL && pl.jump?.kind !== "snake").sort((a, b) => b.v - a.v);
  if (short.length) return short[0].v;
  // a door that will refuse it is still the door: better stood at than passed (REDESIGN.md Phase 12)
  const door = plans.find(pl => pl.refused);
  if (door) return door.v;
  if (stay) return 0;
  const heaven = plans.filter(pl => !pl.fell && to(pl) > GOAL).sort((a, b) => a.v - b.v);
  if (heaven.length) return heaven[0].v;
  const snake = plans.filter(pl => !pl.fell).sort((a, b) => b.v - a.v);
  return snake.length ? snake[0].v : Math.max(...dice);
}
// A player still in the game: not dead, and not fallen from the heavens.
export const gone = p => !!(p.dead || p.fell);

// A player has a gender for Hindi agreement (docs/NARRATIVE.md §4), an alias {en, hi} when the name was
// drawn rather than typed, and a life: every square landed on, in order, for the life account. Phase 8 adds
// who they are (src/engine/self.js): years lived, gunas, aims, the bhumika in sannyasa and the highest
// reached, and once the years run out, dead and the vice they were still holding. Phase 12 adds fell: the life that
// threw past the top of the heavens, which ends it as the years running out does, and fellFrom, the realm it fell from;
// and the ledger (src/engine/karma.js): karma, its three buckets; held, the vices a reckoning added to what the life
// is holding; reckonings, each one met, where in the life it came; refusals, each arrival the exit refused, and where;
// and door, why the exit refused them while they stand at it. Phase 15 adds witness: each situation's choice, what the
// witness chose and what the life took.
export function createGame({ players, rules, seed }) {
  return {
    players: players.map((r, i) => ({ name: r.name.trim(), type: r.type, gender: r.gender || "m", alias: r.alias || null, color: i, pos: 0, face: "r", life: [], told: [], fell: false,
      years: 0, gunas: freshGunas(), aims: freshAims(), practised: 0, bhumika: null, peak: null, dead: false, holding: null,
      karma: freshKarma(), held: [], reckonings: [], refusals: [], door: null, witness: [] })),
    rules: { ...rules },
    // over: someone reached the exit, or nobody is left in the game to
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
// The exit sits partway along the divine row (REDESIGN.md Phase 7): landing exactly on it is liberation, and passing
// it carries the player into the heavens. Nothing above it turns back (REDESIGN.md Phase 12): the heavens are walked,
// and the throw that would carry the player past the top is the fall. Merit spent, the life ends there; there is no
// landing, and no square 1 with the years still running.
// v is the move: a die's value, or 0 to sit. dice is everything rolled; the dice not moved by are spare, and in
// sannyasa they go to practice (src/engine/self.js).
export function planTurn(state, v, dice = [v]) {
  const idx = state.turn, p = state.players[idx], from = p.pos, rules = state.rules;
  const pre = [], after = [], end = [], path = [];
  const spare = [...dice];
  if (v) spare.splice(spare.indexOf(v), 1);
  if (dice.length > 1) pre.push(entry(v ? "lDice" : "lDiceSit", { a: dice[0], b: dice[1], v }, "", idx));
  if (!v) {
    // a year sat out: no walk, no landing, and the year still passes. At a door that has refused the life it is a year
    // of the examination (REDESIGN.md Phase 14): one question, and the door opens when nothing is owed. A life whose
    // years run out there dies at the door.
    const years = turnYears(p.years ?? 0, { sit: true }), died = years > SPAN;
    // a reckoning may have met what was owed while the life sat there: then there is no question, and the door opens
    const atDoor = from === GOAL && !!p.door, exam = atDoor ? examineOf(p) : null;
    const win = atDoor && !died && (exam ? exam.open : !refusalOf(p));
    if (exam) after.push(entry(exam.pass ? "lExamPass" : exam.n === 1 ? (exam.cleared ? "lExamPaid" : "lExamFail") : exam.cleared ? "lExamPaid" : exam.never ? "lExamNever" : "lExamPenance", { pos: from, src: exam.src, sq: exam.src }, "", idx));
    else if (!win) after.push(entry("lSit", { pos: from, sq: from }, "", idx));
    if (died) end.push(entry(from === GOAL ? "lDiedDoor" : "lDied", { pos: from, age: years, sq: from }, "death", idx));
    else if (win) end.push(entry("lDoorOpen", { pos: GOAL }, "", idx), entry("lWin", { pos: GOAL }, "heaven", idx));
    return resolve(state, { idx, v, dice, spare, sit: true, from, path, target: from, final: from, jump: null, win, died, again: false, told: [null], exam, pre, after, end }, years);
  }
  // the fall (REDESIGN.md Phase 12): the throw past the top, or since Phase 14 a landing on it, where Śiva's snake
  // takes the life down to square 1. Either way the life ends; the snake's tail only marks where the next begins.
  const fell = from + v >= TOP, fellBy = from + v > TOP ? "past" : "snake";
  for (let n = from; n < Math.min(from + v, TOP); ) path.push(++n);
  if (fell) {
    // the walk goes to the top of the heavens and no further: what was passed, then the fall, and the life is over
    const passed = path.filter(n => n !== from && (fellBy === "past" || n !== TOP));
    if (passed.length) after.push(entry("lPassed", { passed }, "passed", idx));
    end.push(fellBy === "snake" ? entry("lSiva", { v, pos: TOP, sq: TOP }, "fall", idx) : entry("lFell", { v, pos: from }, "fall", idx));
    return { idx, v, dice, spare, sit: false, fell: true, fellBy, from, path, target: TOP, final: TOP, jump: null, win: false, died: false, again: false, told: [], cost: 0, pre, after, end };
  }
  const target = path.at(-1);
  // every square walked over and not landed on, once each, in the order they were passed
  const passed = path.slice(0, -1);
  if (passed.length) after.push(entry("lPassed", { passed }, "passed", idx));
  const plan = { idx, v, dice, spare, sit: false, from, path, target, final: target, jump: null, win: false, died: false, again: false, told: [null], cost: 0, pre, after, end };
  // a square where the player chooses (REDESIGN.md Phase 10): the plan waits for the choice, and resolveChoice
  // finishes it. A square with no situation is resolved at once, exactly as before.
  // On an ego test (Phase 15) the plan also carries the faces the ego owns, so the card can show them before the choice.
  const sit = situationAt(target);
  if (sit) return Object.assign(plan, { situation: sit, egoFaces: egoFacesOn(state, target) });
  return finish(state, plan, null);
}

// The choice made on a situation's square: the option's move, its cost in years, and its hidden guna and aims.
// On an ego test (REDESIGN.md Phase 15), choosing anything but the lower option is followed by the ego's throw, off a
// sequence of its own: on one of the ego's faces the life takes the lower option, and everything it does applies, since
// the life did it. plan.ego keeps what the witness chose, what the life took, the face and the faces; plan.choice is
// what the life took.
export function resolveChoice(state, plan, id) {
  const o = optionOf(plan.target, id);
  if (!plan.situation || !o) throw new Error(`no option ${id} on square ${plan.target}`);
  delete plan.situation;
  const ego = egoOf(plan.target), faces = egoFacesOn(state, plan.target);
  delete plan.egoFaces;
  if (!ego || id === ego.lower) return finish(state, plan, o);
  const p = state.players[plan.idx], face = egoThrow(state, plan.idx, p.life?.length ?? 0), rebel = faces.includes(face);
  const took = rebel ? optionOf(plan.target, ego.lower) : o;
  plan.ego = { chose: id, took: took.id, face, faces };
  plan.after.push(entry(rebel ? "lEgoRebel" : "lEgoHeld", { pos: plan.target, sq: plan.target }, "", plan.idx));
  return finish(state, plan, took);
}

// The rest of a turn, once it is known what the square does: the snake or ladder, the years, the win or the death.
function finish(state, plan, o) {
  const { idx, v, dice, from, target, after, end } = plan, p = state.players[idx], rules = state.rules;
  let jump = null, final = target;
  // a situation's option decides whether the snake or the ladder is taken; elsewhere the square does
  const s = o ? (o.move === "snake" ? SNAKES[target] : null) : SNAKES[target];
  const l = o ? (o.move === "ladder" ? LADDERS[target] : null) : LADDERS[target];
  const cost = o?.cost ?? 0;
  // the years an option costs pass on its square, before any snake or ladder
  if (cost) after.push(entry(cost === 1 ? "lStayOne" : "lStay", { n: cost, pos: target, sq: target }, "", idx));
  if (s || l) {
    jump = { kind: s ? "snake" : "ladder", to: (s || l).to };
    final = jump.to;
    after.push(entry(s ? "lSnake" : "lLadder", { v, pos: target, to: jump.to, sq: target }, s ? "snake" : "ladder", idx));
  } else if (HEAVEN[target]) {
    after.push(entry("lHeaven", { v, pos: target, sq: target }, "heaven", idx));
  } else if (target !== GOAL) {
    after.push(entry(from === 0 ? "lBorn" : "lMove", { v, pos: target, sq: target }, "", idx));
  }
  // the door (REDESIGN.md §2.3, Phase 12): the exit is reached, and refuses a life still carrying a debt it has not met
  const refused = final === GOAL ? refusalOf(p) : null;
  if (refused) after.push(entry("lRefused", { pos: GOAL, sq: GOAL }, "", idx));
  const win = final === GOAL && !refused;
  // A life ends when its years run out on earth (REDESIGN.md Phase 8). Only a life that walks ground it has
  // already lived can outrun the span, so only the snakes bring this about.
  const years = turnYears(p.years ?? 0, { target, final, jump, cost }), died = !win && final <= 100 && years > SPAN;
  const again = !win && !died && v === 6 && rules.six;
  if (win) end.push(entry("lWin", { pos: GOAL }, "heaven", idx));
  else if (died) end.push(entry("lDied", { pos: final, age: years, sq: final }, "death", idx));
  else if (again) end.push(entry("lSix", {}, "", idx));
  // which moment each square of this turn tells, in the order they join the life: one face for the whole turn. A
  // chosen option is what its square told; each year it cost is the square again, told as a stay.
  const told = [o ? o.id : toldOn(target, v, dice), ...Array(cost).fill("stay"), ...(jump ? [toldOn(final, v, dice)] : [])];
  // the hidden guna and aims of the choice, applied as a vice's or a virtue's are (src/engine/self.js grow)
  const mark = o ? { guna: o.guna, aims: o.aims } : null;
  // and what the choice plants: āgāmi, since the player could have chosen otherwise (src/engine/karma.js)
  const plant = plantOf(target, o, years);
  Object.assign(plan, { final, jump, win, died, again, told, cost, mark, choice: o?.id ?? null, plant, refused });
  return resolve(state, plan, years);
}

// RESOLVE (§2.1): once the move is made, the omen. A 6 among the dice, a ripe debt, on earth or at the door, and the
// chance that rises toward the exit: then a reckoning, prārabdha in fruit, which nobody could steer away from. What it
// costs is the ledger's (src/engine/karma.js reckonOf): years, which are the square again told as stays; a holding; at
// the third tier the square the debt was made on, reached as a snake reaches its tail, taking no time.
function resolve(state, plan, years) {
  const { idx } = plan, p = state.players[idx];
  const omen = plan.win || plan.died ? null : omenFor(state, idx, { dice: plan.dice, pos: plan.final, years, lived: p.life?.length ?? 0, force: !!(state.forceOmen || state.forceDeath) });
  // mp.die(form) (Phase 16): the omen that fires is the death tier, in that form, whatever the ledger weighs
  if (omen?.reckon && state.forceDeath) Object.assign(omen.reckon, { dies: true, applied: DEATH, form: state.forceDeath, years: 0, holds: null, to: null });
  const rk = omen?.reckon ?? null;
  Object.assign(plan, { omen, reckon: rk && { ...rk, from: plan.final } });
  if (!rk) return plan;
  // death by ledger (REDESIGN.md Phase 16): the floor closes. The life ends where it stands, at the years it had; the
  // debt that came due is not met, and goes with the rest into the store
  if (rk.dies) {
    plan.died = true;
    plan.death = { by: "ledger", form: rk.form, age: years, src: rk.src, opt: rk.opt };
    plan.end = [entry("lReckon", { src: rk.src, sq: rk.src }, "reckon", idx), entry("lDiedLedger", { pos: plan.final, age: years, sq: plan.final }, "death", idx)];
    plan.again = false;
    return plan;
  }
  if (rk.to) plan.final = rk.to;
  plan.told.push(...(rk.to ? ["reckon"] : []), ...Array(rk.years).fill("stay"));
  // first among the turn's ends; a new array, since the log alone is built by unshift (tools/golden.mjs listens for it).
  // A reckoning takes the throw a 6 would have given: the turn passes (Bhaskar, 26 Oct).
  plan.end = [entry("lReckon", { src: rk.src, sq: rk.src }, "reckon", idx), ...plan.end.filter(e => e.k !== "lSix")];
  plan.again = false;
  return plan;
}

export function endTurn(state, plan) {
  const p = state.players[plan.idx];
  p.pos = plan.final;
  // the fall ends the life: nothing is landed on and nothing more is lived, and the token leaves the board, back into
  // the world below it (Phase 15 builds what that world is)
  // Śiva's snake took it from the top of the heavens, the highest a life can reach
  if (plan.fell) { p.fell = true; p.fellBy = plan.fellBy; p.fellFrom = plan.fellBy === "snake" ? TOP : plan.from; p.pos = 0; p.holding = holdingOf(p.life || [], p.held); }
  else {
    // what the witness chose on a situation and what the life did (REDESIGN.md Phase 15), where in the life, for the
    // account and for Phase 16's Mirror; on an ego test that threw, the face and the faces the ego owned
    if (plan.choice) p.witness = [...(p.witness ?? []), { sq: plan.target, chose: plan.ego?.chose ?? plan.choice, took: plan.choice, i: p.life?.length ?? 0, ...(plan.ego ? { face: plan.ego.face, faces: plan.ego.faces } : {}) }];
    // a snake or a ladder is two moments: the square that did it, and the one it led to
    // a year sat out is the same square again: on earth nothing else lands where it stands (src/engine/self.js)
    // the years a choice cost are the square again, once a year (src/engine/self.js yearsAlong reads them as stays)
    (p.life ||= []).push(plan.target, ...Array(plan.cost ?? 0).fill(plan.target), ...(plan.jump ? [plan.jump.to] : []));
    // a reckoning (REDESIGN.md Phase 12): the square the debt was made on, at the third tier, and each year it took
    const rk = plan.reckon, at = p.life.length;
    if (rk) p.life.push(...(rk.to ? [rk.to] : []), ...Array(rk.years).fill(rk.to ?? rk.from));
    // and which of a square's moments each one told, kept beside the life, one for one. A life with none for some of
    // its squares (a game saved before Phase 10, or one set by hand) told their own moments there.
    const before = p.life.length - plan.told.length, kept = (p.told ?? []).slice(0, before);
    p.told = [...kept, ...Array(before - kept.length).fill(null), ...plan.told];
    Object.assign(p, grow(p, plan));
    // the ledger: what fired is met, what was chosen is planted, and whatever the years have reached ripens
    let k = karmaOf(p);
    if (rk && !rk.dies) k = { ...k, prarabdha: k.prarabdha.filter(s => !rk.seeds.some(f => f.src === s.src && f.opt === s.opt && f.at === s.at)), agami: k.agami.filter(s => !rk.seeds.some(f => f.src === s.src && f.opt === s.opt && f.at === s.at)) };
    // a seed keeps where in the life it was planted, so the door can ask whether the life climbed out of it after
    if (plan.plant) k = { ...k, agami: [...k.agami, { ...plan.plant, i: p.life.length }] };
    // a year at the door (REDESIGN.md Phase 14): the debt asked about, met or paid, leaves the ledger
    const ex = plan.exam;
    if (ex) {
      p.exam = { ...(p.exam ?? {}), [ex.key]: ex.n };
      if (ex.cleared) k = meet(k, ex.key);
      p.sittings = [...(p.sittings ?? []), { at, src: ex.src, opt: ex.opt, planted: ex.at, n: ex.n, pass: ex.pass, answer: ex.answer, cleared: ex.cleared, ...(ex.never ? { never: true } : {}), open: plan.win, age: p.years }];
    }
    p.karma = ripen(k, p.years);
    if (rk) {
      if (rk.holds) p.held = [...(p.held ?? []), rk.holds];
      p.reckonings = [...(p.reckonings ?? []), { at, src: rk.src, opt: rk.opt, planted: rk.planted, tier: rk.tier, applied: rk.applied, wouldDie: rk.wouldDie, ...(rk.dies ? { dies: true, form: rk.form } : {}), years: rk.years, to: rk.to, age: rk.age }];
    }
    // an arrival the door refused is kept for the account, where in the life it came (a refusal again while they
    // stand there is the same one)
    if (plan.refused && !p.door) p.refusals = [...(p.refusals ?? []), { at, ...plan.refused }];
    // standing at a door that has refused them, they keep the reason, what is still owed; anywhere else there is none
    p.door = plan.refused ?? (p.pos === GOAL && !plan.win && p.door ? refusalOf(p) ?? p.door : null);
    // the curse (REDESIGN.md Phase 14): spoken at the first landing old enough for it, and kept where in the life it was
    if (!p.curse) { const c = curseOf(state, plan.idx); if (c && spokenAt(c, p.years)) p.curse = { id: c.id, i: p.life.length - 1, age: p.years }; }
    // how the life ended (Phase 16): its ledger, its years on earth, or its years at the door
    if (plan.died) { p.dead = true; p.holding = holdingOf(p.life, p.held); p.death = plan.death ?? { by: plan.sit && plan.from === GOAL ? "door" : "years", age: p.years }; }
  }
  // a life over carries what it never met into the store (sañcita), for Phase 15 to draw the next life's prārabdha from
  if (plan.died || plan.fell) { const k = karmaOf(p); p.karma = { sancita: [...k.sancita, ...carried(k)], agami: [], prarabdha: [] }; }
  delete state.forceOmen;
  delete state.forceDeath;
  if (plan.ego) delete state.forceEgo;
  if (plan.win) state.winner = plan.idx;
  // the turn passes to the next player still alive; with nobody left, the game is over
  else if (!plan.again) for (let k = 1; k <= state.players.length; k++) {
    const i = (plan.idx + k) % state.players.length;
    if (!gone(state.players[i])) { state.turn = i; break; }
  }
  // Over when someone is through, or nobody is left to be: in a game with people in it, once none of them is
  // alive, since the computers would only be playing on for nobody.
  const alive = state.players.filter(q => !gone(q)), humans = state.players.some(q => q.type === "human");
  state.over = state.winner != null || !alive.length || (humans && !alive.some(q => q.type === "human"));
  plan.end.forEach(e => addLog(state, e));
}

// One whole turn without animation. A number is one die moved by; an array is the dice rolled, and pick chooses
// the move from them.
export function playTurn(state, roll = rollDice(state.rng, diceFor(state.players[state.turn])), pick = moveFor, choose = choiceFor) {
  const dice = typeof roll === "number" ? [roll] : roll, v = dice.length > 1 ? pick(state, dice) : dice[0];
  state.last = v || dice[0];
  let plan = planTurn(state, v, dice);
  if (plan.situation) plan = resolveChoice(state, plan, choose(state, plan.situation));
  [...plan.pre, ...plan.after].forEach(e => addLog(state, e));
  endTurn(state, plan);
  return plan;
}
