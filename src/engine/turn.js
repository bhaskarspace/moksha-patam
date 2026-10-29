// The rules of a turn, with no DOM: the UI animates a plan, and tools/sim.mjs plays plans headless.
import { GOAL, TOP, LADDERS, SNAKES, HEAVEN, SQ } from "../content.js";
import { makeRng, die } from "../rng.js";
import { SPAN, turnYears, grow, freshGunas, freshAims, holdingOf, slotsFor, stageOfPlayer, SANNYASA } from "./self.js";
import { optionOf, optionsFor, egoOf, egoFacesOn, egoThrow, graceThrow, worthOf, destOf } from "./qbn.js";
import { freshKarma, karmaOf, carried, ripen, plantOf, omenFor, refusalOf, examineOf, meet, DEATH } from "./karma.js";
import { curseOf, spokenAt } from "./curse.js";
import { lawOf, isDefault } from "./laws/index.js";
import { soulOf, bornOf } from "./samskara.js";
import { castOf, nameKey } from "./cast.js";
import { drawName } from "../state.js";

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
// A year sat in practice before the throw, drawing no dice (Phase 17 step 5, Yoga): whether player i may, and whether the
// computer whose turn it is does now. The page and tools/sim.mjs ask the same.
export const canPractise = (state, i = state.turn) => lawOf(state, i).practice(state, i);
export const practisesNow = state => canPractise(state) && lawOf(state).sits(state);
// What a move of 0 is for the current player under their law, when it is the law's own act (src/engine/laws/board.js zero):
// { act, line, kind }, or null for Phase 9's year in practice or a wait at a ladder's foot.
export const zeroOf = (state, dice) => lawOf(state).zero(state, state.turn, dice);
// What the law adds at the door for player i (Phase 17, src/engine/karma.js examineOf): what it asks last, and grace.
export const doorOf = (state, i) => { const law = lawOf(state, i); return { bound: law.binds(state, i), forgive: (s, n) => law.forgive(state, i, s, n) }; };
// The moves a roll offers: each die's value once, and 0 for sitting. Since Phase 17 no die is offered that would carry
// the life past the top: the heavens end at Śiva's square, and only the exact throw reaches it. With nothing offered
// the life stays where it is in the heavens.
export function movesFor(state, dice) {
  const p = state.players[state.turn], out = [...new Set(dice)].filter(v => p.pos + v <= TOP);
  if (dice.length > 1 && canSit(p)) out.push(0);
  return lawOf(state).movesFor(state, dice, out);
}
// The computer's choice, the same in the page and in tools/sim.mjs: the exit if a die reaches it; at a door that has
// refused it, sitting there to be examined, wherever it may (Phase 14); otherwise a die
// that stops short of the exit and is not a snake, the bigger first; then the exit even if it will refuse them (Phase
// 12); then sitting, where a sannyasin may; then a die
// into the heavens, the smaller first, to stay there longest; then a snake; and Śiva's square last, since it ends the
// life (Phase 17: the life is born again). null when no die may be moved by: the life stays. Below the exit this is Phase 9's choice
// exactly; Phase 9's whole rule, the bigger die that is not a snake, is kept in tools/sim.mjs as --pick=phase9.
// It ranks by where the dice take it, before the omen: nobody sees a reckoning coming.
export function moveFor(state, dice) {
  const moves = movesFor(state, dice);
  if (!moves.length) return null;
  // a law's computer may have a move of its own first (Jain: waiting at a ladder's foot; Yoga: a bad throw let go;
  // Advaita: recognition)
  const own = lawOf(state).prefer(state, moves, dice);
  if (own != null) return own;
  const plans = moves.filter(Boolean).map(v => planTurn(state, v, dice));
  const to = pl => pl.reckon?.from ?? pl.final;
  const win = plans.find(pl => pl.win);
  if (win) return win.v;
  // ...unless the door has already said that no penance pays what it owes (Phase 16): then it throws on
  const p = state.players[state.turn], ex = p.pos === GOAL ? examineOf(p, doorOf(state, state.turn)) : null, stay = moves.includes(0) && !(ex?.never && ex.n > 1);
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
  return snake.length ? snake[0].v : plans[0]?.v ?? 0;
}
// ---- The heavens last as long as the merit (Phase 17, Bhaskar 29 Oct) ----
// A life that enters 106–109 may begin one to four turns there, by its guṇas as it enters (more sattva, longer), kept
// as p.merit; each turn begun there is counted in p.heavenTurns, a stay as well as a move. When they are spent the next
// turn throws nothing: Śiva's snake takes the soul from where it is, the merit spent (plan.spent), and it is born again.
// The exact throw onto 110 is still the snake, sooner.
export const MERIT_AT = [0.45, 0.6, 0.75];
export const meritOf = p => { const g = p.gunas ?? freshGunas(), x = g.s / (g.s + g.r + g.t || 1); return 1 + MERIT_AT.filter(b => x >= b).length; };
export const inHeaven = n => n > GOAL && n < TOP;
export const spentOf = p => inHeaven(p.pos) && p.merit != null && (p.heavenTurns ?? 0) >= p.merit;

// A player still in the game: not dead, and not fallen from the heavens (since Phase 17 a fallen life is reborn in its
// seat at once, so only a record in p.past is ever fell).
// since Phase 16 an animal interlude also ends, earned (p.earned) or short of the forest's edge (p.short)
export const gone = p => !!(p.dead || p.fell || p.earned || p.short);

// A player has a gender for Hindi agreement (docs/NARRATIVE.md §4), an alias {en, hi} when the name was
// drawn rather than typed, and a life: every square landed on, in order, for the life account. Phase 8 adds
// who they are (src/engine/self.js): years lived, gunas, aims, the bhumika in sannyasa and the highest
// reached, and once the years run out, dead and the vice they were still holding. Phase 12 adds fell: the life that
// threw past the top of the heavens, which ends it as the years running out does, and fellFrom, the realm it fell from;
// and the ledger (src/engine/karma.js): karma, its three buckets; held, the vices a reckoning added to what the life
// is holding; reckonings, each one met, where in the life it came; refusals, each arrival the exit refused, and where;
// and door, why the exit refused them while they stand at it. Phase 15 adds witness: each situation's choice, what the
// witness chose and what the life took. Phase 16 adds what a row may bring from a life before (src/engine/samskara.js
// bornOf): born is { gunas, karma, prior }, prior being the last life as the next half-remembers it; and soul, the key
// its saṃskāra is kept under. A row without them is a first life, exactly as before.
// Phase 17 adds past, the lives this seat has already lived in this game, each closed by Śiva's snake, and rebirths, how
// many: every sequence of a life's own (the omen, the ego, the curse, the joins) is salted by it, so a life born again
// draws its own, and a first life draws exactly what it did before.
export const playerOf = (r, i) => ({ name: r.name.trim(), type: r.type, gender: r.gender || "m", alias: r.alias || null, color: i, pos: 0, face: "r", life: [], told: [], fell: false,
  years: 0, gunas: r.born?.gunas ?? freshGunas(), aims: freshAims(), practised: 0, bhumika: null, peak: null, dead: false, holding: null,
  karma: r.born?.karma ?? freshKarma(), held: [], reckonings: [], refusals: [], door: null, witness: [],
  ...(r.born?.prior ? { prior: r.born.prior } : {}), ...(r.soul ? { soul: r.soul } : {}),
  // the law the life plays under (src/engine/laws/index.js), when it is its own: chosen, or kept from the life before
  ...((r.law ?? r.born?.law) ? { law: r.law ?? r.born.law } : {}) });
export function createGame({ players, rules, seed }) {
  const state = {
    players: players.map(playerOf),
    rules: { ...rules },
    // over: someone reached the exit, or nobody is left in the game to
    turn: 0, winner: null, over: false, last: null,
    log: [{ k: "lNew", kind: "" }],
    rng: makeRng(seed),
  };
  // a law that keeps no ledger (Cārvāka) carries nothing in from a life before
  state.players.forEach((p, i) => { if (!lawOf(state, i).karma) p.karma = freshKarma(); });
  // whoever lives under a law other than the board's says so in the log (Phase 17); under the board's nothing is added
  state.players.forEach((p, i) => { if (p.law && !isDefault(lawOf(state, i))) addLog(state, lawEntry(state, i)); });
  return state;
}
// The log's line that player i lives under their law, as a log entry: the law's id, which the log names in its language.
export const lawEntry = (state, i) => entry("lLawOf", { law: lawOf(state, i).id }, "", i);
// A law chosen between lives (src/render/card.js) says so; a second choice for the same seat replaces the line it left.
export function logLaw(state, i) {
  const e = lawEntry(state, i), top = state.log[0];
  if (top?.k === "lLawOf" && top.who === i) state.log[0] = { ...e, ...(top.life != null ? { life: top.life } : {}) };
  else addLog(state, e);
}

// Log entries keep a message key and values, so they re-translate when the language changes.
export const entry = (k, v = {}, kind = "", who = null) => ({ k, v, kind, who });
// An entry about a player keeps which of the seat's lives it is about (Phase 17: e.life, p.rebirths; none for the first),
// so a line from a life Śiva's snake closed still names that life, not the one born after it.
export function addLog(state, e) {
  const p = e.who == null ? null : state.players[e.who];
  if (p?.rebirths && e.life == null) e.life = p.rebirths;
  state.log.unshift(e);
  state.log = state.log.slice(0, 80);
}

// What a roll of v does for the current player. Log entries come in three groups, by when the UI
// shows them: pre (before walking), after (on landing) and end (once the turn is over).
// The exit sits partway along the divine row (REDESIGN.md Phase 7): landing exactly on it is liberation, and passing
// it carries the player into the heavens. Nothing above it turns back (REDESIGN.md Phase 12): the heavens are walked,
// and since Phase 17 no throw passes the top. The exact throw onto it is the fall, Śiva's snake: merit spent, the life
// ends there, with no landing, and the same soul is born again (endTurn).
// v is the move: a die's value, or 0 to sit. dice is everything rolled; the dice not moved by are spare, and in
// sannyasa they go to practice (src/engine/self.js). v null is the throw that offered nothing (Phase 17): in the heavens
// no die may pass the top, and then the life stays where it is. The heavens' years stand still, so none pass.
export function planTurn(state, v, dice = [v]) {
  const idx = state.turn, p = state.players[idx], from = p.pos, law = lawOf(state, idx);
  const pre = [], after = [], end = [], path = [];
  // the merit spent: no throw, and Śiva's snake takes the life from the realm it is in, by way of the top
  if (spentOf(p) && law.merit(state, idx)) {
    for (let n = from; n < TOP; ) path.push(++n);
    end.push(entry(law.text.spent, { pos: from, sq: from }, "fall", idx));
    return { idx, v: null, dice, spare: [], sit: false, fell: true, fellBy: "spent", spent: true, from, path, target: TOP, final: TOP, jump: null, win: false, died: false, again: false, told: [], cost: 0, pre, after, end };
  }
  if (v == null || from + v > TOP) {
    pre.push(entry("lHeavenStay", { a: dice[0], b: dice[1], pos: from, sq: from }, "heaven", idx));
    return { idx, v: null, dice, spare: [], sit: false, stay: true, from, path, target: from, final: from, jump: null, win: false, died: false, again: false, told: [], cost: 0, pre, after, end };
  }
  const spare = [...dice];
  if (v) spare.splice(spare.indexOf(v), 1);
  if (dice.length > 1) pre.push(entry(v ? "lDice" : "lDiceSit", { a: dice[0], b: dice[1], v }, "", idx));
  if (!v) {
    // a year sat out: no walk, no landing, and the year still passes. At a door that has refused the life it is a year
    // of the examination (REDESIGN.md Phase 14): one question, and the door opens when nothing is owed. A life whose
    // years run out there dies at the door.
    // Phase 17 step 5: a year in practice before any throw (no dice drawn), or the law's own act in place of a move: a
    // throw let go, an inference, a recognition (a win, of its kind, which no running out of years forestalls)
    const z = !dice.length ? { act: "practice", line: "lPractice" } : law.zero(state, idx, dice);
    const years = turnYears(p.years ?? 0, { sit: true }), died = years > SPAN && !z?.kind;
    // a reckoning may have met what was owed while the life sat there: then there is no question, and the door opens
    const atDoor = !z && from === GOAL && !!p.door, exam = atDoor ? examineOf(p, doorOf(state, idx)) : null;
    // mp.grace(face) forces grace's next throw, at the door as on an ego test; it is spent once asked
    if (exam) delete state.forceGrace;
    const win = !!z?.kind || (atDoor && !died && (exam ? exam.open : !refusalOf(p, law.binds(state, idx))));
    if (z) after.push(entry(z.line, { pos: from, sq: from }, "", idx));
    else if (exam) after.push(entry(exam.merit ? "lExamMerit" : exam.graced ? "lExamGrace" : exam.pass ? "lExamPass" : exam.n === 1 ? (exam.cleared ? "lExamPaid" : "lExamFail") : exam.cleared ? "lExamPaid" : exam.never ? "lExamNever" : "lExamPenance", { pos: from, src: exam.src, sq: exam.src }, "", idx));
    // a year waited at a ladder's foot (Jain) is said so; elsewhere it is a year in practice
    else if (!win) after.push(entry(LADDERS[from] ? "lFootWait" : "lSit", { pos: from, sq: from }, "", idx));
    if (died) end.push(entry(from === GOAL ? "lDiedDoor" : "lDied", { pos: from, age: years, sq: from }, "death", idx));
    else if (z?.kind) end.push(entry(law.text.win.line, { pos: from, sq: from }, "heaven", idx));
    else if (win) end.push(entry("lDoorOpen", { pos: GOAL }, "", idx), entry("lWin", { pos: GOAL }, "heaven", idx));
    // the act is told on the square again, so the life reads it as a year there (src/engine/self.js yearsAlong)
    const act = z ? { act: z.act, ...(z.kind ? { kind: z.kind } : {}), ...law.acted(state, idx, z.act) } : {};
    return resolve(state, { idx, v, dice, spare, sit: true, from, path, target: from, final: from, jump: null, win, died, again: false, told: [z?.act ?? null], exam, pre, after, end, ...act }, years);
  }
  // the fall (REDESIGN.md Phase 12): the throw past the top, or since Phase 14 a landing on it, where Śiva's snake
  // takes the life down to square 1. Either way the life ends; the snake's tail only marks where the next begins.
  // the animal interlude (Phase 16, src/engine/animal.js): the board ends at the edge of the forest, and reaching it is
  // the human birth earned back; nothing there falls, nothing chooses
  // a law under which a ladder waits at its foot (Jain): the admitting throw climbs from where the life stands, with no
  // walk; the life records only the ladder's top, as if the climb had followed the landing
  if (law.fromFoot(state, idx, v, dice)) {
    after.push(entry("lClimbOne", { pos: from, sq: from }, "", idx));
    return finish(state, { idx, v, dice, spare, sit: false, from, path, target: from, final: from, jump: null, win: false, died: false, again: false, told: [], cost: 0, pre, after, end, fromFoot: true }, null);
  }
  // a law whose board ends short of the heavens (the interlude's forest edge) is complete at its edge
  const edge = law.edge(state, idx);
  if (edge != null && from + v >= edge) {
    for (let n = from; n < edge; ) path.push(++n);
    if (path.length > 1) after.push(entry("lPassed", { passed: path.slice(0, -1) }, "passed", idx));
    end.push(entry("lAnimalHuman", { pos: edge }, "heaven", idx));
    return { idx, v, dice, spare, sit: false, from, path, target: edge, final: edge, jump: null, win: false, earned: true, died: false, again: false, told: [null], cost: 0, pre, after, end };
  }
  // Śiva's snake (Phase 17): the exact throw to the top. The life ends there and the same soul is born again at once
  // (endTurn, bornAgain); no throw passes the top (movesFor)
  const fell = from + v === TOP, fellBy = "snake";
  for (let n = from; n < Math.min(from + v, TOP); ) path.push(++n);
  if (fell) {
    // the walk goes to the top of the heavens: what was passed, then the snake
    const passed = path.filter(n => n !== from && n !== TOP);
    if (passed.length) after.push(entry("lPassed", { passed }, "passed", idx));
    end.push(entry(law.text.siva, { v, pos: TOP, sq: TOP }, "fall", idx));
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
  const sit = law.situation(state, idx, target);
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
  const sit = plan.situation;
  delete plan.situation;
  const ego = egoOf(plan.target), faces = egoFacesOn(state, plan.target);
  delete plan.egoFaces;
  // grace (Bhakti, Phase 17): the lower choice on an ego test throws grace's die, off a sequence of its own, and on one of
  // its faces the life does the higher, the option of most worth open to it. Never shown before the choice.
  const gf = ego && id === ego.lower ? lawOf(state, plan.idx).grace(state, plan.idx) : null;
  if (gf) {
    const p = state.players[plan.idx], face = state.forceGrace ? state.forceGrace : graceThrow(state, plan.idx, p.life?.length ?? 0);
    delete state.forceGrace;
    if (gf.includes(face)) {
      const best = optionsFor(p, sit).filter(x => x.open).sort((a, b) => worthOf(b) - worthOf(a))[0];
      if (best && best.id !== id) {
        plan.grace = { chose: id, took: best.id, face };
        plan.after.push(entry("lGrace", { pos: plan.target, sq: plan.target }, "", plan.idx));
        return finish(state, plan, optionOf(plan.target, best.id));
      }
    }
  }
  if (!ego || id === ego.lower) return finish(state, plan, o);
  const p = state.players[plan.idx], face = egoThrow(state, plan.idx, p.life?.length ?? 0), rebel = faces.includes(face);
  const took = rebel ? optionOf(plan.target, ego.lower) : o;
  plan.ego = { chose: id, took: took.id, face, faces };
  plan.after.push(entry(rebel ? "lEgoRebel" : "lEgoHeld", { pos: plan.target, sq: plan.target }, "", plan.idx));
  return finish(state, plan, took);
}

// What option o would plant if the life took it on this plan's square, and the age it would ripen at: what Mīmāṃsā shows
// before the choice (src/engine/laws/mimamsa.js foresight). Null when it plants nothing, or the law keeps no ledger.
export function foresee(state, plan, o) {
  const p = state.players[plan.idx], final = destOf(plan.target, o);
  const jump = o.move === "ladder" && final !== plan.target ? { kind: "ladder", to: final } : null;
  const plant = lawOf(state, plan.idx).karma ? plantOf(plan.target, o, turnYears(p.years ?? 0, { target: plan.target, final, jump, cost: o.cost ?? 0 })) : null;
  return plant && { ...plant, ripe: plant.at + plant.fuse };
}

// The rest of a turn, once it is known what the square does: the snake or ladder, the years, the win or the death.
function finish(state, plan, o) {
  const { idx, v, dice, from, target, after, end } = plan, p = state.players[idx], law = lawOf(state, idx), edge = law.edge(state, idx);
  let jump = null, final = target;
  // a situation's option decides whether the snake or the ladder is taken; elsewhere the square does
  const s = o ? (o.move === "snake" ? SNAKES[target] : null) : SNAKES[target];
  // a ladder is climbed now, or (Jain) the life waits at its foot for the admitting throw; a climb from the foot is one
  const taken = o ? (o.move === "ladder" ? LADDERS[target] : null) : LADDERS[target];
  const waits = !!taken && !plan.fromFoot && law.climb(state, idx, target, o) === "wait";
  const l = plan.fromFoot ? LADDERS[target] : waits ? null : taken;
  if (waits) after.push(entry("lAtFoot", { pos: target, sq: target }, "", idx));
  const cost = o?.cost ?? 0;
  // the years an option costs pass on its square, before any snake or ladder
  if (cost) after.push(entry(cost === 1 ? "lStayOne" : "lStay", { n: cost, pos: target, sq: target }, "", idx));
  if (s || l) {
    jump = { kind: s ? "snake" : "ladder", to: s ? s.to : law.ladderTo(state, idx, target) };
    if (l && jump.to !== l.to) after.push(entry("lDevotion", { pos: target, to: jump.to, sq: target }, "", idx));
    final = jump.to;
    after.push(entry(s ? "lSnake" : "lLadder", { v, pos: target, to: jump.to, sq: target }, s ? "snake" : "ladder", idx));
  } else if (HEAVEN[target]) {
    after.push(entry("lHeaven", { v, pos: target, sq: target }, "heaven", idx));
  } else if (target !== GOAL && !plan.fromFoot) {
    after.push(entry(from === 0 ? "lBorn" : "lMove", { v, pos: target, sq: target }, "", idx));
  }
  // the door (REDESIGN.md §2.3, Phase 12): the exit is reached, and refuses a life still carrying a debt it has not met
  // an animal climbing out of the forest by a ladder earns the human birth as one walking out of it does
  if (edge != null && final >= edge) {
    plan.end.push(entry("lAnimalHuman", { pos: edge }, "heaven", idx));
    Object.assign(plan, { final, jump, earned: true, told: [toldOn(target, v, dice), ...(jump ? [null] : [])], cost: 0 });
    return plan;
  }
  // the law's exit (src/engine/laws/): the board's is the door at 105. One with no door is won on the exact landing with
  // nothing carried, and a life that lands there owing is told so and goes on
  const ex = law.exit(state, idx), atExit = !!ex && final === ex.at;
  const refused = atExit && ex.door ? refusalOf(p, law.binds(state, idx)) : null;
  if (refused) after.push(entry("lRefused", { pos: GOAL, sq: GOAL }, "", idx));
  // a door that opens on no win while the life lasts (Nyāya): the life goes on, into the heavens
  const through = atExit && ex.door && !refused && ex.alive === false;
  if (through) after.push(entry(ex.through, { pos: GOAL, sq: GOAL }, "", idx));
  const owed = atExit && !ex.door && carried(karmaOf(p)).length > 0;
  if (owed) after.push(entry(ex.owed, { pos: final, sq: final }, "", idx));
  const win = atExit && !refused && !owed && !through;
  // A life ends when its years run out on earth (REDESIGN.md Phase 8). Only a life that walks ground it has
  // already lived can outrun the span, so only the snakes bring this about.
  const years = turnYears(p.years ?? 0, { target, final, jump, cost }), died = !win && final <= 100 && years > SPAN;
  const again = !win && !died && v === 6 && state.rules.six;
  if (win) end.push(entry(law.text.win.line, ex.door ? { pos: ex.at } : { pos: ex.at, sq: ex.at }, "heaven", idx));
  else if (died) end.push(entry("lDied", { pos: final, age: years, sq: final }, "death", idx));
  else if (again) end.push(entry("lSix", {}, "", idx));
  // which moment each square of this turn tells, in the order they join the life: one face for the whole turn. A
  // chosen option is what its square told; each year it cost is the square again, told as a stay.
  // A climb whose top is not the board's is told "climb", so the life reads it as a ladder (src/engine/self.js
  // yearsAlong); a climb from the foot in suppression (Jain upaśama) is told "upasama", which the book at the door does
  // not take as an answer. A climb from the foot records only its top.
  const top = jump?.kind === "ladder" ? (plan.fromFoot && law.suppressed(state, idx, target) ? "upasama" : jump.to !== LADDERS[target]?.to ? "climb" : toldOn(final, v, dice)) : null;
  const told = [...(plan.fromFoot ? [] : [o ? o.id : toldOn(target, v, dice)]), ...Array(cost).fill("stay"), ...(jump ? [jump.kind === "ladder" ? top : toldOn(final, v, dice)] : [])];
  // the hidden guna and aims of the choice, applied as a vice's or a virtue's are (src/engine/self.js grow)
  const mark = o ? { guna: o.guna, aims: o.aims } : null;
  // and what the choice plants: āgāmi, since the player could have chosen otherwise (src/engine/karma.js)
  const plant = law.karma ? plantOf(target, o, years) : null;
  Object.assign(plan, { final, jump, win, died, again, told, cost, mark, choice: o?.id ?? null, plant, refused });
  return resolve(state, plan, years);
}

// RESOLVE (§2.1): once the move is made, the omen. Under a law that veils karma (Nyāya) its line names no square. A 6 among the dice, a ripe debt, on earth or at the door, and the
// chance that rises toward the exit: then a reckoning, prārabdha in fruit, which nobody could steer away from. What it
// costs is the ledger's (src/engine/karma.js reckonOf): years, which are the square again told as stays; a holding; at
// the third tier the square the debt was made on, reached as a snake reaches its tail, taking no time.
function resolve(state, plan, years) {
  const { idx } = plan, p = state.players[idx], law = lawOf(state, idx);
  const omen = plan.win || plan.died || !law.omen(state, idx) ? null : omenFor(state, idx, { dice: plan.dice, pos: plan.final, years, lived: p.life?.length ?? 0, force: !!(state.forceOmen || state.forceDeath) });
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
    plan.end = [entry(law.text.reckon, law.veiled ? {} : { src: rk.src, sq: rk.src }, "reckon", idx), entry("lDiedLedger", { pos: plan.final, age: years, sq: plan.final }, "death", idx)];
    plan.again = false;
    return plan;
  }
  if (rk.to) plan.final = rk.to;
  plan.told.push(...(rk.to ? ["reckon"] : []), ...Array(rk.years).fill("stay"));
  // first among the turn's ends; a new array, since the log alone is built by unshift (tools/golden.mjs listens for it).
  // A reckoning takes the throw a 6 would have given: the turn passes (Bhaskar, 26 Oct).
  plan.end = [entry(law.text.reckon, law.veiled ? {} : { src: rk.src, sq: rk.src }, "reckon", idx), ...plan.end.filter(e => e.k !== "lSix")];
  plan.again = false;
  return plan;
}

export function endTurn(state, plan) {
  const p = state.players[plan.idx];
  p.pos = plan.final;
  // a turn begun in the heavens spends merit (Phase 17); the turn the snake takes the spent life is not one of them
  if (inHeaven(plan.from) && !plan.spent) p.heavenTurns = (p.heavenTurns ?? 0) + 1;
  // a stay in the heavens (Phase 17): nothing is lived, and the turn passes
  if (plan.stay) return passTurn(state, plan);
  // the fall ends the life: nothing is landed on and nothing more is lived, and the token leaves the board, back into
  // the world below it (Phase 15 builds what that world is)
  // Śiva's snake took it from the top of the heavens, the highest a life can reach
  // or, the merit spent (Phase 17), from the realm it was in
  if (plan.fell) { p.fell = true; p.fellBy = plan.fellBy; p.fellFrom = plan.fellBy === "snake" ? TOP : plan.from; p.pos = 0; p.holding = holdingOf(p.life || [], p.held); }
  else {
    // what the witness chose on a situation and what the life did (REDESIGN.md Phase 15), where in the life, for the
    // account and for Phase 16's Mirror; on an ego test that threw, the face and the faces the ego owned
    // grace (Bhakti) is kept apart from the ego's throw: the witness chose the lower and the life did the higher
    if (plan.choice) p.witness = [...(p.witness ?? []), { sq: plan.target, chose: plan.ego?.chose ?? plan.grace?.chose ?? plan.choice, took: plan.choice, i: p.life?.length ?? 0, ...(plan.ego ? { face: plan.ego.face, faces: plan.ego.faces } : {}), ...(plan.grace ? { grace: true } : {}) }];
    // a snake or a ladder is two moments: the square that did it, and the one it led to
    // a year sat out is the same square again: on earth nothing else lands where it stands (src/engine/self.js)
    // the years a choice cost are the square again, once a year (src/engine/self.js yearsAlong reads them as stays)
    // a climb from the foot the life already stood at (Jain) adds only the ladder's top
    (p.life ||= []).push(...(plan.fromFoot ? [] : [plan.target]), ...Array(plan.cost ?? 0).fill(plan.target), ...(plan.jump ? [plan.jump.to] : []));
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
      p.sittings = [...(p.sittings ?? []), { at, src: ex.src, opt: ex.opt, planted: ex.at, ...(ex.prior ? { prior: true } : {}), n: ex.n, pass: ex.pass, answer: ex.answer, cleared: ex.cleared, ...(ex.never ? { never: true } : {}), ...(ex.graced ? { graced: true } : {}), ...(ex.merit ? { merit: ex.merit } : {}), open: plan.win, age: p.years }];
    }
    p.karma = ripen(k, p.years);
    if (rk) {
      if (rk.holds) p.held = [...(p.held ?? []), rk.holds];
      p.reckonings = [...(p.reckonings ?? []), { at, src: rk.src, opt: rk.opt, planted: rk.planted, ...(rk.prior ? { prior: true } : {}), tier: rk.tier, applied: rk.applied, wouldDie: rk.wouldDie, ...(rk.dies ? { dies: true, form: rk.form } : {}), years: rk.years, to: rk.to, age: rk.age }];
    }
    // an arrival the door refused is kept for the account, where in the life it came (a refusal again while they
    // stand there is the same one)
    if (plan.refused && !p.door) p.refusals = [...(p.refusals ?? []), { at, ...plan.refused }];
    // standing at a door that has refused them, they keep the reason, what is still owed; anywhere else there is none
    p.door = plan.refused ?? (p.pos === GOAL && !plan.win && p.door ? refusalOf(p, lawOf(state, plan.idx).binds(state, plan.idx)) ?? p.door : null);
    // the curse (REDESIGN.md Phase 14): spoken at the first landing old enough for it, and kept where in the life it was
    if (!p.curse && lawOf(state, plan.idx).curse(state, plan.idx)) { const c = curseOf(state, plan.idx); if (c && spokenAt(c, p.years)) p.curse = { id: c.id, i: p.life.length - 1, age: p.years }; }
    // how the life ended (Phase 16): its ledger, its years on earth, or its years at the door
    if (plan.died) { p.dead = true; p.holding = holdingOf(p.life, p.held); p.death = plan.death ?? { by: plan.sit && plan.from === GOAL ? "door" : "years", age: p.years }; }
    // the exit the life went through, of its law's kind (mokṣa, svarga)
    if (plan.win) p.won = plan.kind ?? lawOf(state, plan.idx).exit(state, plan.idx)?.kind ?? null;
    // the merit a life brings into the heavens, read as it enters them
    if (inHeaven(p.pos) && p.merit == null && lawOf(state, plan.idx).merit(state, plan.idx)) p.merit = meritOf(p);
  }
  // a life over carries what it never met into the store (sañcita), for Phase 15 to draw the next life's prārabdha from
  // the interlude (Phase 16): earned at the forest's edge, or the throws run out short of it
  lawOf(state, plan.idx).afterTurn(state, plan, p);
  // a life let go as it ends (Nyāya's apavarga: its years or Śiva's snake, with nothing owed): won, and not born again
  const freed = (plan.died || plan.fell) && lawOf(state, plan.idx).freed(state, plan.idx, plan);
  if (freed) { p.won = freed; plan.freed = true; plan.end.push(entry(lawOf(state, plan.idx).text.win.line, {}, "heaven", plan.idx)); }
  if (plan.died || plan.fell) { const k = karmaOf(p); p.karma = { sancita: [...k.sancita, ...carried(k)], agami: [], prarabdha: [] }; }
  // Śiva's snake is rebirth (Phase 17): the same soul, born of the life it closed, at the snake's tail
  if (plan.fell && !plan.freed && lawOf(state, plan.idx).siva(state, plan.idx) === "reborn") {
    // the turn's last lines are logged after the birth, and still belong to the life that ended
    plan.end.forEach(e => { if (e.who != null) e.life = p.rebirths ?? 0; });
    bornAgain(state, plan.idx);
    if (p.rebirths) plan.end.push(entry("lReborn", { pos: 1, sq: 1 }, "", plan.idx));
  }
  delete state.forceOmen;
  delete state.forceDeath;
  if (plan.ego) delete state.forceEgo;
  passTurn(state, plan);
}

function passTurn(state, plan) {
  if (plan.win || plan.freed) state.winner = plan.idx;
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

// Śiva's snake closes player i's life and the same soul is born again in its seat (Phase 17), as Be born again would
// begin it (src/engine/samskara.js soulOf, bornOf): the guṇas half carried, the heaviest unmet debt as prārabdha, the
// dream, the cast in new roles. The closed life is kept in p.past, whole, with the cast it had, for its book. The
// newborn has a new name and gender, drawn off a sequence of its own (never the dice), and not the last life's name, nor
// anyone's at the table, nor any its cast carries. It keeps its colour and its seat, and its saṃskāra key; it begins at
// the snake's tail, square 1, born. The object is changed in place, so whatever holds the player still holds it.
function bornAgain(state, i) {
  const p = state.players[i], soul = soulOf(state, i), born = soul && bornOf(soul);
  if (!born) return;
  const was = { ...p, castKept: castOf(state, i, p.prior?.lives ?? 0) };
  delete was.past;
  const rebirths = (p.rebirths ?? 0) + 1;
  const rng = makeRng((state.rng.seed ^ 0x3c6ef372 ^ Math.imul(i + 1, 0x85ebca6b) ^ Math.imul(rebirths, 0xc2b2ae35)) >>> 0);
  const taken = new Set([...state.players.flatMap(q => [q.name.trim(), q.alias?.en]), ...soul.cast.map(c => c.en)].filter(Boolean));
  const nm = drawName(rng, "", taken) ?? drawName(rng, "", new Set());
  const key = p.soul ?? (p.name ? nameKey(p.name) : null);
  const next = playerOf({ name: "", type: p.type, gender: nm.gender, alias: { en: nm.en, hi: nm.hi }, born, soul: key, law: p.law }, p.color);
  Object.assign(next, { pos: 1, life: [1], told: [null], past: [...(p.past ?? []), was], rebirths });
  for (const k of Object.keys(p)) delete p[k];
  Object.assign(p, next);
}

// One whole turn without animation. A number is one die moved by; an array is the dice rolled, and pick chooses
// the move from them.
// With the merit spent nothing is thrown, so nothing is drawn.
// A year in practice before the throw (Yoga) draws nothing either: its computer decides before any die (practisesNow).
export function playTurn(state, roll = spentOf(state.players[state.turn]) || practisesNow(state) ? [] : rollDice(state.rng, diceFor(state.players[state.turn])), pick = moveFor, choose = (s, sit) => lawOf(s).choose(s, sit)) {
  // one die is no choice, unless the law offers one (Jain: waiting at a ladder's foot, or moved only by the 1 there)
  const dice = typeof roll === "number" ? [roll] : roll, one = dice.length > 1 ? null : movesFor(state, dice);
  // no dice and the merit not spent: the year sat in practice
  const v = !dice.length && !spentOf(state.players[state.turn]) ? 0 : !one ? pick(state, dice) : one.length > 1 ? pick(state, dice) : one[0] ?? dice[0];
  if (dice.length || v == null) state.last = v || dice[0];
  let plan = planTurn(state, v, dice);
  if (plan.situation) plan = resolveChoice(state, plan, choose(state, plan.situation));
  [...plan.pre, ...plan.after].forEach(e => addLog(state, e));
  endTurn(state, plan);
  return plan;
}
