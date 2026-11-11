// ---- Parallel lives, compared (REDESIGN.md Phase 19) ----
// A game is played again from what it was made of: its seed, its rules, the table as it sat down (state.table), each
// person's choices in the order made (p.choices, src/main.js noteChoice) and the turns played (state.turns). The computers
// choose as they always do, so nothing else is needed. The replay keeps a trace of every turn, by seat and life: where it
// began and ended, the dice, what was chosen and what the life took, and who the life was becoming (its guṇas) and its
// years after it. compareOf reads a game and its traces into what the comparison screen draws (src/render/compare.js):
// each soul's lives, how each ended, the situations two lives met and what each did there, and the lives that crossed. The
// guṇas are kept as numbers here and are only ever drawn as shapes. Pure.
import { createGame, playTurn, throwDice, diceFor, movesFor, moveFor, spentOf, canPractise, practisesNow } from "./turn.js";
import { lawOf, setLaw, canChoose } from "./laws/index.js";
import { pastOf, endOf } from "./samskara.js";
import { liberated } from "./mode.js";
import { optionOf, optionsFor } from "./qbn.js";
import { pnameIn } from "../state.js";

// What game state was made of, for replay (and, in step 3, for a link)
export const inputsOf = state => ({
  seed: state.rng.seed, rules: { ...state.rules }, table: state.table, turns: state.turns ?? 0,
  choices: state.players.map(p => (p.type === "human" ? [...(p.choices ?? [])] : null)),
  // a game resumed from before Phase 19 step 3 threw off the shared sequence, and is played again so
  ...(state.throws === "own" ? {} : { stream: true }),
});
// whether a game can be played again: it kept its table (every game since Phase 19 does), and is on the 110
export const replayable = state => !!state?.table && !state.rules?.board;

// The game played again from its inputs. onTurn, if given, is told each turn as it ends (state, plan, seat, life).
// Returns { state, traces, ok }: traces[seat][life] is that life's turns, in order; ok is false when a person's choices ran
// out or did not fit where they were asked for (a game set by hand under ?debug, or from another version of the game).
export function replay(inputs, onTurn = null) {
  const s = createGame({ players: JSON.parse(JSON.stringify(inputs.table)), rules: { ...inputs.rules }, seed: inputs.seed });
  if (inputs.stream) delete s.throws;
  const at = s.players.map(() => 0), noted = s.players.map(() => 0), traces = s.players.map(() => [[]]);
  let ok = true;
  // the next choice of seat i, if it is of the kind asked for
  const take = (i, fits) => {
    const x = inputs.choices[i]?.[at[i]];
    if (x == null || !fits(x)) { ok = false; return null; }
    at[i]++;
    return x;
  };
  for (let t = 0; t < inputs.turns && !s.over; t++) {
    const i = s.turn, p = s.players[i], human = p.type === "human", auto = lawOf(s, i).auto, life = p.rebirths ?? 0, k = p.thrown ?? 0;
    let prac = false;
    if (human) {
      // the law a life born again lives under, as the person left it at its first throw
      if (life !== noted[i]) {
        noted[i] = life;
        const x = take(i, c => c[0] === "l"), id = x?.slice(1);
        if (id && id !== (p.law ?? "")) { if (canChoose(id)) setLaw(s, i, id); else ok = false; }
      }
      if (!spentOf(p) && canPractise(s, i)) prac = take(i, c => c === "p" || c === "r") === "p";
    }
    // the throw the page would make: none with the merit spent, or for a year sat in practice
    const roll = spentOf(p) || (human ? prac : practisesNow(s)) ? [] : throwDice(s, diceFor(p));
    const pick = (st, dice) => {
      if (!human || auto) return moveFor(st, dice);
      const m = movesFor(st, dice);
      if (m.length < 2) return m[0] ?? null;
      const x = take(i, c => /^\d$/.test(c));
      return x == null || !m.includes(+x) ? m[0] : +x;
    };
    // an option is taken only where it is open; one that is not was made in another game (another version, or by hand)
    const choose = (st, sit) => {
      if (!human || auto) return lawOf(st).choose(st, sit);
      const id = take(i, c => c[0] === "o")?.slice(1);
      if (id != null && optionsFor(p, sit).some(o => o.open && o.id === id)) return id;
      ok = false;
      return lawOf(st).choose(st, sit);
    };
    let plan;
    try { plan = playTurn(s, roll, pick, choose); } catch { ok = false; break; }
    // the life the turn was about: the one closed by it, if it closed one
    const q = (p.rebirths ?? 0) > life ? p.past.at(-1) : p, tr = traces[i];
    while (tr.length <= life) tr.push([]);
    const g = q.gunas ?? { s: 1, r: 1, t: 1 };
    tr[life].push({
      at: plan.from, to: plan.final, dice: [...(plan.dice ?? [])], v: plan.v ?? null, k: plan.dice?.length ? k : null,
      chose: plan.ego?.chose ?? plan.grace?.chose ?? plan.choice ?? null, took: plan.choice ?? null, sq: plan.choice ? plan.target : null,
      g: [g.s, g.r, g.t], years: Math.floor(q.years ?? 0),
    });
    while (tr.length <= (p.rebirths ?? 0)) tr.push([]);
    onTurn?.(s, plan, i, life);
  }
  return { state: s, traces, ok: ok && inputs.choices.every((c, i) => !c || at[i] === c.length) };
}

// Every life seat i lived in game state, in order: the closed ones (p.past), then the one in it
export const livesIn = (state, i) => [...(state.players[i].past ?? []).map((_, k) => pastOf(state, i, k)), state];

// Whether two games are the same game: every seat's lives walked the same squares, to the same years
const shape = state => state.players.map(p => [...(p.past ?? []), p].map(q => [q.life ?? [], Math.floor(q.years ?? 0), q.pos]));
export const sameGame = (a, b) => JSON.stringify(shape(a)) === JSON.stringify(shape(b));

// How life k of seat i ended, as one word the screen says in its language: liberated (or svarga), the death's cause, Śiva's
// snake, the merit spent, an animal's life, or living when the game stopped with it still going.
export function endKindOf(state, i, k = null) {
  const st = pastOf(state, i, k), p = st.players[i];
  if (p.law === "animal" || p.animal) return "animal";
  if (k == null && liberated(state, i)) return p.won === "svarga" ? "svarga" : "liberated";
  const e = endOf(st, i);
  return e ?? "living";
}

// The comparison of a game: { souls, same, met }.
// souls[i] = { at, seat, color, type, seed, lives: [{ k, name: {en, hi}, gender, animal, path, end, trace, st }] }, st being
// the game as it stood for that life, for its book (src/engine/account.js lifeText); at is the soul's place in souls.
// same: the situations two or more lives chose on, each { sq, by: [{ at, life, name, chose, took }] }, by square. met: the
// lives that crossed, each pair once a square.
const soulsOf = (state, traces, seats = state.players.map((_, i) => i)) => seats.map(i => {
  const p = state.players[i];
  return {
    seat: i, color: p.color, type: p.type, seed: state.rng.seed,
    lives: livesIn(state, i).map((st, k, all) => {
      const q = st.players[i], kk = k === all.length - 1 ? null : k;
      return { k, name: { en: pnameIn(q, "en"), hi: pnameIn(q, "hi") }, gender: q.gender, animal: q.animal?.kind ?? null,
        path: [...(q.life ?? [])], end: endKindOf(state, i, kk), trace: traces?.[i]?.[k] ?? null, st, met: q.met ?? [], witness: q.witness ?? [] };
    }),
  };
});
function sameOf(souls) {
  const bySq = new Map();
  for (const s of souls) for (const l of s.lives) for (const w of l.witness) {
    if (!optionOf(w.sq, w.took)) continue;
    const row = bySq.get(w.sq) ?? [];
    // a life that chose there more than once is told by its first choice
    if (!row.some(x => x.at === s.at && x.life === l.k)) row.push({ at: s.at, seat: s.seat, life: l.k, name: l.name, chose: w.chose, took: w.took });
    bySq.set(w.sq, row);
  }
  return [...bySq].filter(([, by]) => new Set(by.map(x => `${x.at}.${x.life}`)).size > 1).sort((a, b) => a[0] - b[0]).map(([sq, by]) => ({ sq, by }));
}
export function compareOf(state, traces = null) {
  const souls = soulsOf(state, traces).map((s, at) => ({ ...s, at }));
  const met = [], seen = new Set();
  for (const s of souls) for (const l of s.lives) for (const m of l.met) {
    const key = [`${s.seat}.${l.k}`, `${m.seat}.${m.life}`].sort().join("|") + "|" + m.sq;
    if (seen.has(key)) continue;
    seen.add(key);
    met.push({ a: { at: s.at, seat: s.seat, life: l.k, name: l.name }, b: { at: m.seat, seat: m.seat, life: m.life, name: m.with }, sq: m.sq });
  }
  return { souls, same: sameOf(souls), met, parted: [] };
}

// Lives from several games side by side (Phase 19 step 3): each game { state, traces, seat }, its person's soul taken
// (the one who sent it, or the viewer's own). Lives in different games never meet; two on the same seed and board threw
// the same dice, and where they parted is found (partingOf).
export function compareLives(games) {
  const souls = games.map((g, at) => ({ ...soulsOf(g.state, g.traces, [g.seat])[0], at, color: at % 4, board: g.state.rules?.board ?? "110", mine: !!g.mine }));
  const parted = [];
  for (let a = 0; a < souls.length; a++) for (let b = a + 1; b < souls.length; b++) {
    if (souls[a].seed !== souls[b].seed || souls[a].board !== souls[b].board) continue;
    const p = partingOf(souls[a], souls[b]);
    if (p) parted.push(p);
  }
  return { souls, same: sameOf(souls), met: [], parted };
}

// Where two first lives on the same dice parted: the first throw at which they stood on the same square, threw the same
// dice and did otherwise, by the move or by the choice made where they landed; or, when they no longer stood together at
// a throw, the throw before which they parted (a year sat out, a law's act). { a, b, k, sq, dice, how, va, vb } or, when
// the two never parted, { a, b, k: null }. k counts from 1, as a person counts throws.
export function partingOf(A, B) {
  const ta = (A.lives[0]?.trace ?? []).filter(x => x.k != null), tb = (B.lives[0]?.trace ?? []).filter(x => x.k != null);
  if (!ta.length || !tb.length) return null;
  const byK = new Map(tb.map(x => [x.k, x]));
  for (const x of ta) {
    const y = byK.get(x.k);
    if (!y) break;
    const base = { a: A.at, b: B.at, k: x.k + 1, sq: x.at, dice: x.dice };
    if (x.at !== y.at) return { ...base, how: "before" };
    if (x.dice.join() !== y.dice.join()) return null;
    if (x.v !== y.v) return { ...base, how: "move", va: x.v, vb: y.v };
    if ((x.chose ?? x.took) !== (y.chose ?? y.took)) return { ...base, how: "choice", sq: x.sq ?? x.to, va: x.chose ?? x.took, vb: y.chose ?? y.took };
  }
  // one life ended where the other went on, or they never did otherwise
  const end = Math.min(ta.length, tb.length);
  return ta.length === tb.length && ta.every((x, j) => x.to === tb[j].to) ? { a: A.at, b: B.at, k: null } : { a: A.at, b: B.at, k: end + 1, sq: ta[end - 1].to, how: "end" };
}
