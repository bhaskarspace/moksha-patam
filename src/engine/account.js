// ---- The life account (docs/NARRATIVE.md §9) ----
// Every moment a player landed on, in order, as prose: a paragraph per stage of life, stitched with the
// joining phrases in strings.JOINS. Pure, so it is tested in node; src/render/life.js only shows it.
//
// Ages are the years lived (src/engine/self.js), never the square's: a snake takes years without giving any
// back, so a life's ages only go forward. Each join is chosen by how a moment relates to the one before it,
// first match winning: the years a snake undid, a square's own echo of an earlier one, a ladder, the same
// snake or ladder again, a long quiet stretch, the same year, and only then one of the plain joins, drawn
// from a sequence of its own so the dice are never touched. Squares lived a second time are folded into one
// line instead of being told twice. A life that fell from the heavens ends on a line of its own (REDESIGN.md Phase 12).
//
// A snake or ladder taken again is not told again either (REDESIGN.md Phase 9): the second time is one line,
// and from the third it is only counted, in a tally that ends the paragraph. A life stuck in a loop reads as
// stuck in one line. Years sat out in practice are told as one line too.
//
// A square that can tell two moments (REDESIGN.md Phase 10, src/engine/turn.js toldOn) is told again when it tells
// the other one: what repeats is a moment, not a square. Where it was first lived is still the square's. A callback
// is said only when the square it calls back to told its own moment, since the echo names that moment; the other
// moment has an echo of its own only when one is written. A situation's choice is told the same way: by its
// outcome, or by the square's own moment when the option has none (src/engine/qbn.js momentOf). The years a choice
// cost pass silently; the outcome says what they were.
//
// A reckoning (REDESIGN.md Phase 12) is told where it came, as what came due, after a join that says the six. The years
// it took pass silently like a choice's, and the square it sent the life back to is lived, not told.
import { ASHRAMAS, LADDERS, SNAKES, GOAL, JOINS, CAST_WORDS, squareOf } from "../content.js";
import { tIn, fill, castFill, wordsIn, ageWordsIn, CAST_ROLES } from "../i18n.js";
import { makeRng, next } from "../rng.js";
import { pnameIn } from "../state.js";
import { ageOf, yearsAlong, stageOfYears, titleOf, holdingOf } from "./self.js";
import { momentOf } from "./qbn.js";
import { castAlong, peopleOf, introIn, calledIn, fatesIn } from "./cast.js";
import { reckoningIn, seedOf, refusalIn, carryIn, karmaOf, carried } from "./karma.js";

const EARTH = 100, GAP = 8;
// An English moment that does not open with the name reads on after a joining phrase in lower case:
// "Then for a week…", "Later, a habit…". "I" and a capital followed by another capital (an acronym) are left alone,
// and so is a moment that opens on a member of the cast, who may be called by name (Phase 10C).
const NAMED = new RegExp(`^\\{(?:name|${CAST_ROLES.join("|")})[}=]`);
const after = (raw, text, l) => (l === "en" && !NAMED.test(raw) && /^(?:\p{Lu}\p{Ll}|(?!I\s)\p{Lu}\s)/u.test(text) ? text[0].toLowerCase() + text.slice(1) : text);
const stageAt = e => (e.n > EARTH ? 5 : stageOfYears(e.years));

// Player i's life in language l: { title, sub, open, paras: [{ head, text }], end }.
export function lifeOf(state, i, l) {
  const p = state.players[i], name = pnameIn(p, l), who = { name, gender: p.gender };
  const T = (key, v = {}) => fill(tIn(l, key, { name, ...v }), who);
  // a join begins a sentence, even when it begins with a number: "Nine quiet years later, "
  const J = (j, v = {}) => { const x = fill((j[l] || j.en).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? `{${k}}`), who); return x[0].toUpperCase() + x.slice(1); };
  const words = n => wordsIn(l, Math.floor(n));
  // the plain joins come from this life's own sequence, never the game's dice
  const rng = makeRng((state.rng.seed ^ 0x5bd1e995 ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0);
  let lastThen = -1;
  const then = () => { let k = Math.floor(next(rng) * JOINS.then.length); if (k === lastThen) k = (k + 1) % JOINS.then.length; lastThen = k; return JOINS.then[k]; };

  const along = yearsAlong(p.life || [], p.told || []).filter(e => e.via !== "stay"), paras = [];
  // the cast (Phase 10C): who each moment is about and who this life has met by then. toldN counts the moments told
  // in full in this life; lastTold is where each member was last told, metAt the moment where the life met them
  const cc = castAlong(state, i, along);
  let toldN = 0, lastTold = {}, metAt = {};
  // lived: each square of this life, with the years it was first lived at; own: the squares that told their own
  // moment; seen: the moments told, by square and which moment; taken: how often each snake or ladder has been
  // taken in this life
  let para = null, seen = new Set(), lived = new Map(), own = new Set(), taken = new Map(), lastYears = null, fold = [], sat = [], skip = false;
  const told = e => momentOf(e.n, e.told).key;
  const note = e => { seen.add(told(e)); if (momentOf(e.n, e.told).own) own.add(e.n); if (!lived.has(e.n)) lived.set(e.n, e.years); };
  const sq = n => { const q = squareOf(n); return q[l] || q.en; };
  // squares lived a second time, told as one line. The ages are the ones that ground was first walked at,
  // which is said so, since the years lived have moved on since.
  const flushFold = () => {
    if (!fold.length) return;
    const earth = fold.filter(e => e.n <= EARTH).map(e => Math.floor(lived.get(e.n)));
    if (earth.length) {
      const a = Math.min(...earth), b = Math.max(...earth);
      para.parts.push(a === b ? J(JOINS.foldOne, { a: words(a) }) : J(JOINS.foldRun, { a: words(a), b: words(b) }));
    } else para.parts.push(J(JOINS.foldHeights));
    lastYears = fold.at(-1).years;
    fold = [];
  };
  // years sat out in practice, as one line
  const flushSat = () => {
    if (!sat.length) return;
    const a = Math.floor(sat[0].years), b = Math.floor(sat.at(-1).years);
    para.parts.push(sat.length === 1 ? J(JOINS.sitOne, { a: words(a) }) : J(JOINS.sitRun, { n: words(sat.length), a: words(a), b: words(b) }));
    lastYears = sat.at(-1).years;
    sat = [];
  };
  const flush = () => { flushFold(); flushSat(); };
  // the reckonings and the door's refusals, each told before the first entry of the life that comes after it
  // (p.reckonings[].at, p.refusals[].at); at the door the refusal comes first, since it is said on arriving
  const all = yearsAlong(p.life || [], p.told || []);
  const recks = [...(p.refusals || []).map(r => ({ ...r, door: true })), ...(p.reckonings || [])].sort((a, b) => a.at - b.at || !!b.door - !!a.door);
  let rq = 0;
  const reckon = upto => {
    for (; rq < recks.length && recks[rq].at <= upto; rq++) {
      const r = recks[rq];
      if (r.door) {
        if (!para) continue;
        flush();
        const said = refusalIn(l, r, who)[0], age = all[r.at - 1]?.years ?? p.years;
        para.parts.push(J(JOINS.door, { age: words(age) }) + after(said, said, l));
        lastYears = age;
        continue;
      }
      const t = seedOf(r.src, r.opt)?.reckoning;
      if (!para || !t) continue;
      flush();
      para.parts.push(J(JOINS.reckon, { age: words(r.age) }) + after(t[l] || t.en, reckoningIn(l, r, who), l));
      lastYears = r.age + r.years;
    }
  };
  // a paragraph ends on the count of anything taken three times or more in it
  const close = () => {
    if (!para) return;
    flush();
    for (const [n, { times, years }] of para.tally) {
      const v = { times: J(JOINS.times, { n: words(times) }).toLowerCase(), age: words(years) };
      para.parts.push(SNAKES[n] ? J(JOINS.tallySnake, { ...v, vice: sq(n) }) : J(JOINS.tallyLadder, { ...v, virtue: sq(n) }));
    }
  };
  const open = s => { close(); para = { s, ages: [], parts: [], tally: new Map() }; paras.push(para); };

  for (const [k, e] of along.entries()) {
    // the moment this landing told: the square's own, or the other one a roll-dependent square has
    const q = squareOf(e.n), said = momentOf(e.n, e.told), m = said.moment, nextE = along[k + 1];
    // a roll-dependent square's other moment may have an echo of its own; a chosen outcome has none
    const echo = said.own ? q?.echo : e.told === "else" ? q?.roll?.echo : null;
    reckon(e.i);
    // where a reckoning sent the life back to: lived, and not told
    if (e.via === "reckon") { note(e); lastYears = e.years; continue; }
    // where a snake or ladder told short led: lived, and not told
    if (skip) { skip = false; note(e); lastYears = e.years; continue; }
    if (!m && e.via !== "sit") { note(e); continue; }
    const s = stageAt(e);
    if (!para || para.s !== s) open(s);
    if (e.via === "sit") { flushFold(); sat.push(e); para.ages.push(Math.floor(e.years)); continue; }
    // a snake or ladder taken from here, and whether this square has been told already in this life
    const event = nextE && (nextE.via === "snake" || nextE.via === "ladder");
    const repeat = seen.has(told(e));
    if (repeat && !e.via && !event) { flushSat(); fold.push(e); para.ages.push(Math.floor(e.years)); note(e); continue; }
    flush();
    para.ages.push(Math.floor(e.years));
    // the same snake or ladder again: the second time in one line, and after that only counted
    const times = event ? (taken.get(e.n) || 0) + 1 : 0;
    if (times) taken.set(e.n, times);
    if (times >= 2) {
      const age = words(e.years);
      if (times > 2) para.tally.set(e.n, { times, years: e.years });
      else if (SNAKES[e.n]) para.parts.push(J(JOINS.snakeAgain, { age, vice: sq(e.n), cost: words(ageOf(e.n) - ageOf(nextE.n)) }));
      else para.parts.push(J(JOINS.ladderAgain, { age, virtue: sq(e.n) }));
      note(e); lastYears = e.years; skip = true;
      continue;
    }

    // the same person returns (Phase 10C): a member met earlier in this life, not told in the moment just before
    const c = cc[k], back = c.cast && c.about && !repeat && calledIn(c.cast, c.about, l) && metAt[c.about]?.recall && lastTold[c.about] != null && lastTold[c.about] < toldN - 1 ? c.about : null;
    let join = null;
    // above the world there is no more time to measure
    const gap = lastYears == null || e.n > EARTH ? null : e.years - lastYears;
    if (e.via === "snake") join = J(JOINS.snake, { cost: words(ageOf(e.from) - ageOf(e.n)) });
    else if (echo && own.has(q.callsBack) && !repeat) join = echo[l] || echo.en;
    else if (back) {
      const t = CAST_WORDS.returns[back] || CAST_WORDS.returns.friend, rec = metAt[back].recall;
      join = fill(castFill((t[l] || t.en).replace("{recall}", rec[l] || rec.en), { who: { name: calledIn(c.cast, back, l), gender: c.cast[back].gender } }), who);
    }
    else if (e.via === "ladder") join = J(JOINS.ladder);
    else if (repeat) join = J(JOINS.again);
    else if (para.parts.length && gap != null && gap >= GAP) join = J(JOINS.gap, { gap: words(gap) });
    else if (para.parts.length && gap != null && gap < 1) join = J(lastYears < 1 && e.years < 1 ? JOINS.months : JOINS.sameYear);
    else if (para.parts.length) join = J(then());
    // a moment says the years lived, "still" when a snake took no time at all
    // a square already told, reached again by a snake or ladder, is not told again: only where it was first lived
    const age = Number.isInteger(e.years) ? ageWordsIn(l, e.years, e.via === "snake") : "";
    const raw = repeat && e.via ? (JOINS.backTo[l] || JOINS.backTo.en).replace("{first}", words(lived.get(e.n))) : m[l] || m.en;
    // the moment that meets a member of the cast says their name at its end
    const intro = c.meets && !repeat ? introIn(c.cast, c.about, l) : "";
    const text = fill(castFill(raw, peopleOf(c.cast, c.before, l, c.about)), { ...who, age }) + (intro ? " " + intro : "");
    para.parts.push(join ? join + after(raw, text, l) : text);
    if (!(repeat && e.via)) {
      toldN++;
      if (c.about) { lastTold[c.about] = toldN - 1; if (c.meets) metAt[c.about] = m; }
    }
    note(e);
    lastYears = e.years;
  }
  reckon(Infinity);
  close();

  const stage = s => (l === "hi" ? ASHRAMAS[s][2] : ASHRAMAS[s][1]);
  // what the closing holds or puts down may name someone this life met: the son, the rival
  const last = cc.at(-1), people = last ? peopleOf(last.cast, new Set([...last.before, ...(last.meets ? [last.about] : [])]), l) : {};
  const held = t => fill(castFill(t ? t[l] || t.en : "", people), who);
  return {
    title: T("lifeTitle"),
    sub: p.peak != null ? tIn(l, "title" + titleOf(p.peak)) : "",
    open: opening(p, along, T, words),
    paras: paras.map(({ s, ages, parts }) => {
      const a = Math.min(...ages), b = Math.max(...ages);
      const head = s === 5 || !ages.length ? stage(s) : a === b ? T("lifeAt", { stage: stage(s), a }) : T("lifeSpan", { stage: stage(s), a, b });
      return { head, text: parts.join(" ") };
    }),
    end: state.winner === i ? winEnd(p, T, words, held)
      : p.fell ? fellEnd(p, along, T, sq, held, l, who)
      : !p.life?.length ? T("lifeUnborn")
      : p.dead ? T("lifeEndDied", { age: words(p.years), holding: held(SNAKES[p.holding]?.holding) }).replace(/, ([.।])$/, "$1")
      : T("lifeEndOpen", { n: p.pos }),
    // what the life never found out about the people in it (Phase 10C): empty with no cast
    fates: fatesIn(state, i, l, along, cc, who),
  };
}

// A life let go names what it put down: the vice it took most, the one a death would have named as still held.
function winEnd(p, T, words, held) {
  const letgo = SNAKES[holdingOf(p.life || [], p.held)]?.letgo, age = words(p.years ?? 0);
  return letgo ? T("lifeEndWin", { age, letgo: held(letgo) }) : T("lifeEndFree", { age });
}

// The fall from the heavens (REDESIGN.md Phase 12): the realm the life reached, the merit spent, and what it was still
// holding, the vice a death would have named. Gita 9.21 in the board's own words.
// What the door named is still carried down: the debts the life never met, or the holding on it was refused for.
function fellEnd(p, along, T, sq, held, l, who) {
  // nothing above the exit turns back, so the square it fell from is the highest it reached; from the door itself, the
  // throw went past it and every heaven at once
  const top = p.fellFrom ?? Math.max(...along.map(e => e.n)), vice = SNAKES[p.holding]?.holding;
  // the fall has already put what was unmet into the store (sañcita), which in one life is only this life's
  const k = karmaOf(p), unmet = [...carried(k), ...k.sancita], aim = (p.refusals || []).findLast(r => r.aim)?.aim;
  const carry = carryIn(l, unmet, aim, who), and = tIn(l, "listAnd");
  const holding = vice || carry ? [vice && held(vice), carry].filter(Boolean).join(and) : null;
  if (top === GOAL) return holding ? T("lifeEndFellDoor", { holding }) : T("lifeEndFellDoorFree");
  return holding ? T("lifeEndFell", { realm: sq(top), holding }) : T("lifeEndFellFree", { realm: sq(top) });
}

// The first line knows the shape of the whole life, and says only what happened, never what it was worth.
function opening(p, along, T, words) {
  if (!along.length) return "";
  if (p.dead) return T("lifeOpenDied", { age: words(p.years) });
  const earthly = along.filter(e => e.n <= EARTH), to = Math.max(...earthly.map(e => e.years));
  const snakes = along.filter(e => e.via === "snake");
  const worst = snakes.reduce((w, e) => (ageOf(e.from) - ageOf(e.n) > (w ? ageOf(w.from) - ageOf(w.n) : -1) ? e : w), null);
  if (worst && ageOf(worst.from) - ageOf(worst.n) >= 20) return T("lifeOpenFall", { age: words(to), at: words(worst.years) });
  if (!snakes.length) return T("lifeOpenSteady");
  return T("lifeOpenLived", { age: words(to) });
}

// The same life as plain text, to copy or save.
export function lifeText(state, i, l) {
  const { title, sub, open, paras, end, fates } = lifeOf(state, i, l);
  return [[title, sub].filter(Boolean).join("\n"), open, ...paras.map(p => `${p.head}\n${p.text}`), end, fates.join(" ")].filter(Boolean).join("\n\n") + "\n";
}
