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
//
// The door's examination (REDESIGN.md Phase 14) is told where it came too: each debt once, by its question and what the
// book had, and the year a penance was paid. The years sat there are those lines, not years sat out. A life whose
// years ran out at the door ends on what it still owed, in the door's words. The curse is told where it was said, and
// closed right after the square that bore it out, or at the end, the other way.
//
// The witness (REDESIGN.md Phase 15): a choice the ego overruled is told where it came, by the situation's own line
// ("{name} meant to stop the hand, and the hand was quicker."), said before the moment the life took, as a snake's join
// is. And a member of the cast who saw a situation, and returns after it, is joined by what they saw the life do
// (content/situations.json `witness`): the deed, never what was meant. Each such line is said once.
import { ASHRAMAS, LADDERS, SNAKES, GOAL, JOINS, CAST_WORDS, DOOR, SITUATIONS, squareOf } from "../content.js";
import { tIn, fill, castFill, wordsIn, ageWordsIn, CAST_ROLES } from "../i18n.js";
import { makeRng, next } from "../rng.js";
import { pnameIn } from "../state.js";
import { ageOf, yearsAlong, stageOfYears, titleOf, holdingOf } from "./self.js";
import { momentOf, optionOf } from "./qbn.js";
import { castAlong, peopleOf, introIn, beforeIn, calledIn, fatesIn } from "./cast.js";
import { reckoningIn, seedOf, refusalIn, carryIn, karmaOf, carried, debtIn, formIn } from "./karma.js";
import { curseIn } from "./curse.js";
import { isAnimal, animalLifeOf } from "./animal.js";
import { lawOf } from "./laws/index.js";

const EARTH = 100, GAP = 8;
// An English moment that does not open with the name reads on after a joining phrase in lower case:
// "Then for a week…", "Later, a habit…". "I" and a capital followed by another capital (an acronym) are left alone,
// and so is a moment that opens on a member of the cast, who may be called by name (Phase 10C).
const NAMED = new RegExp(`^\\{(?:name|${CAST_ROLES.join("|")})[}=]`);
const after = (raw, text, l) => (l === "en" && !NAMED.test(raw) && /^(?:\p{Lu}\p{Ll}|(?!I\s)\p{Lu}\s)/u.test(text) ? text[0].toLowerCase() + text.slice(1) : text);
const stageAt = e => (e.n > EARTH ? 5 : stageOfYears(e.years));

// Player i's life in language l: { title, sub, open, paras: [{ head, text }], end }.
export function lifeOf(state, i, l) {
  // an animal interlude has an account of its own (Phase 16, src/engine/animal.js)
  if (isAnimal(state)) return animalLifeOf(state, i, l);
  const p = state.players[i], name = pnameIn(p, l), who = { name, gender: p.gender };
  const T = (key, v = {}) => fill(tIn(l, key, { name, ...v }), who);
  // a join begins a sentence, even when it begins with a number: "Nine quiet years later, "
  const J = (j, v = {}) => { const x = fill((j[l] || j.en).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? `{${k}}`), who); return x[0].toUpperCase() + x.slice(1); };
  const words = n => wordsIn(l, Math.floor(n));
  // the plain joins come from this life's own sequence, never the game's dice
  const rng = makeRng((state.rng.seed ^ 0x5bd1e995 ^ Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(p.rebirths ?? 0, 0x632be5ab)) >>> 0);
  let lastThen = -1;
  const then = () => { let k = Math.floor(next(rng) * JOINS.then.length); if (k === lastThen) k = (k + 1) % JOINS.then.length; lastThen = k; return JOINS.then[k]; };

  const along = yearsAlong(p.life || [], p.told || []).filter(e => e.via !== "stay"), paras = [];
  // the cast (Phase 10C): who each moment is about and who this life has met by then. toldN counts the moments told
  // in full in this life; lastTold is where each member was last told, metAt the moment where the life met them
  const cc = castAlong(state, i, along);
  let toldN = 0, lastTold = {}, metAt = {};
  // the witness (Phase 15): each choice the ego overruled, by where in the life it was made; where in the life each member
  // was met; the witness lines already said; and how many were said, which tools/accounts.mjs tags
  // grace (Bhakti, Phase 17) is no rebellion: the witness chose the lower and the life did the higher, told as grace
  const choices = p.witness ?? [], rebelAt = new Map(choices.filter(w => w.chose !== w.took).map(w => [w.i, w]));
  const metI = {}, usedWit = new Set();
  let witnessed = 0;
  const rebelLine = e => { const w = rebelAt.get(e.i); if (w?.grace) return T("accGrace"); const t = w && SITUATIONS[w.sq]?.ego?.account; return t ? J(t) : ""; };
  // the line for member who returning at entry e, from the latest situation they saw after the life met them, or null
  const witnessOf = (who, e) => {
    for (let k = choices.length - 1; k >= 0; k--) {
      const w = choices[k], lines = SITUATIONS[w.sq]?.witness?.[who];
      if (!lines || w.i >= e.i || !(metI[who] < w.i) || usedWit.has(k)) continue;
      const t = (w.chose !== w.took && !w.grace && lines.rebel) || lines[w.took];
      if (t) return { k, t };
    }
    return null;
  };
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
  // and the years at the door, the curse said and the curse borne out, told likewise before the entry after them
  const curse = curseIn(p);
  const sayings = curse ? [{ at: curse.said + 1, curse: "said" }, ...(curse.closedAt != null ? [{ at: curse.closedAt + 1, curse: "landed" }] : [])] : [];
  const recks = [...(p.refusals || []).map(r => ({ ...r, door: true })), ...(p.reckonings || []), ...(p.sittings || []).map(x => ({ ...x, exam: true })), ...sayings]
    .sort((a, b) => a.at - b.at || !!b.door - !!a.door);
  let rq = 0;
  const reckon = upto => {
    for (; rq < recks.length && recks[rq].at <= upto; rq++) {
      const r = recks[rq];
      if (r.curse) {
        if (!para) continue;
        flush();
        const t = r.curse === "said" ? curse.c.line : curse.c.landed, raw = t[l] || t.en;
        const text = fill(raw, { ...who, age: words(curse.age) });
        para.parts.push(r.curse === "said" ? J(JOINS.curse) + after(raw, text, l) : text);
        continue;
      }
      if (r.exam) {
        const q = DOOR[seedOf(r.src, r.opt)?.holds];
        if (!para || !q || (r.n > 1 && !r.cleared)) continue;
        flush();
        const v = { age: words(r.age), q: q.q[l] || q.q.en, debt: debtIn(l, { src: r.src, opt: r.opt, at: r.planted, prior: r.prior }, who) };
        if (r.pass) para.parts.push(J(JOINS.examPass, { ...v, answer: words(r.answer), answered: q.answered[l] || q.answered.en }));
        else para.parts.push(J(r.n > 1 ? JOINS.examPaid : r.cleared ? JOINS.examFailPaid : r.never ? JOINS.examNever : JOINS.examFail, v));
        lastYears = r.age;
        continue;
      }
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
      para.parts.push(J(r.dies ? JOINS.reckonDeath : JOINS.reckon, { age: words(r.age) }) + after(t[l] || t.en, reckoningIn(l, r, who), l));
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
    // a year at the door is a question of the examination, told as one above (Phase 14)
    if (e.via === "sit" && e.n === GOAL && p.sittings?.length) { para.ages.push(Math.floor(e.years)); note(e); lastYears = e.years; continue; }
    if (e.via === "sit") { flushFold(); sat.push(e); para.ages.push(Math.floor(e.years)); continue; }
    // a snake or ladder taken from here, and whether this square has been told already in this life
    const event = nextE && (nextE.via === "snake" || nextE.via === "ladder");
    const repeat = seen.has(told(e)), rebel = rebelLine(e);
    if (repeat && !e.via && !event && !rebel) { flushSat(); fold.push(e); para.ages.push(Math.floor(e.years)); note(e); continue; }
    flush();
    para.ages.push(Math.floor(e.years));
    // the same snake or ladder again: the second time in one line, and after that only counted
    const times = event ? (taken.get(e.n) || 0) + 1 : 0;
    if (times) taken.set(e.n, times);
    if (times >= 2) {
      const age = words(e.years);
      // a choice the ego overruled is told even when what it led to is only counted
      if (rebel) para.parts.push(rebel);
      if (times > 2) para.tally.set(e.n, { times, years: e.years });
      else if (SNAKES[e.n]) para.parts.push(J(JOINS.snakeAgain, { age, vice: sq(e.n), cost: words(ageOf(e.n) - ageOf(nextE.n)) }));
      else para.parts.push(J(JOINS.ladderAgain, { age, virtue: sq(e.n) }));
      note(e); lastYears = e.years; skip = true;
      continue;
    }

    // the same person returns (Phase 10C): a member met earlier in this life, not told in the moment just before
    const c = cc[k], returning = c.cast && c.about && !repeat && calledIn(c.cast, c.about, l) && lastTold[c.about] != null && lastTold[c.about] < toldN - 1;
    // one who saw a situation is joined by what they saw (Phase 15), with or without a recall of their own
    const wit = returning ? witnessOf(c.about, e) : null;
    const back = returning && (wit || metAt[c.about]?.recall) ? c.about : null;
    let join = null;
    // above the world there is no more time to measure
    const gap = lastYears == null || e.n > EARTH ? null : e.years - lastYears;
    if (e.via === "snake") join = J(JOINS.snake, { cost: words(ageOf(e.from) - ageOf(e.n)) });
    else if (echo && own.has(q.callsBack) && !repeat) join = echo[l] || echo.en;
    else if (back) {
      const member = { who: { name: calledIn(c.cast, back, l), gender: c.cast[back].gender } };
      if (wit) { usedWit.add(wit.k); witnessed++; join = fill(castFill(wit.t[l] || wit.t.en, member), who); }
      else {
        const t = CAST_WORDS.returns[back] || CAST_WORDS.returns.friend, rec = metAt[back].recall;
        join = fill(castFill((t[l] || t.en).replace("{recall}", rec[l] || rec.en), member), who);
      }
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
    const intro = c.meets && !repeat ? [introIn(c.cast, c.about, l), beforeIn(c.cast, c.about, l)].filter(Boolean).join(" ") : "";
    const text = fill(castFill(raw, peopleOf(c.cast, c.before, l, c.about)), { ...who, age }) + (intro ? " " + intro : "");
    // a choice the ego overruled is said first, a sentence of its own, and takes the place of any other join
    para.parts.push(rebel ? rebel + " " + text : join ? join + after(raw, text, l) : text);
    if (!(repeat && e.via)) {
      toldN++;
      if (c.about) { lastTold[c.about] = toldN - 1; if (c.meets) { metAt[c.about] = m; metI[c.about] = e.i; } }
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
    open: [...dreamOf(p, l, name), opening(p, along, T, words)].filter(Boolean).join(" "),
    paras: paras.map(({ s, ages, parts }) => {
      const a = Math.min(...ages), b = Math.max(...ages);
      const head = s === 5 || !ages.length ? stage(s) : a === b ? T("lifeAt", { stage: stage(s), a }) : T("lifeSpan", { stage: stage(s), a, b });
      return { head, text: parts.join(" ") };
    }),
    end: lawEnd(state, i, T, words, state.winner === i ? winEnd(p, T, words, held, lawOf(state, i))
      : p.fell ? fellEnd(p, along, T, sq, held, l, who, lawOf(state, i))
      : !p.life?.length ? T("lifeUnborn")
      : p.death?.by === "ledger" ? ledgerEnd(p, T, words, l, who, held)
      : p.dead && p.pos === GOAL ? doorEnd(p, T, words, l, who)
      : p.dead ? T("lifeEndDied", { age: words(p.years), holding: held(SNAKES[p.holding]?.holding) }).replace(/, ([.।])$/, "$1")
      : T("lifeEndOpen", { n: p.pos })),
    // a curse the life never bore out is closed after the end, the other way (Phase 14): empty with none
    curse: curse && curse.closedAt == null && (state.winner === i || p.fell || p.dead) ? fill(curse.c.not[l] || curse.c.not.en, who) : "",
    // what the life never found out about the people in it (Phase 10C): empty with no cast
    fates: fatesIn(state, i, l, along, cc, who),
    // how many cast returns were joined by what they witnessed (Phase 15), for tools/accounts.mjs
    witnessed,
  };
}

// A life let go names what it put down: the vice it took most, the one a death would have named as still held. A law
// whose exit is not mokṣa has its own line (Mīmāṃsā's svarga).
function winEnd(p, T, words, held, law) {
  if (law.text.win.end) return T(law.text.win.end, { age: words(p.years ?? 0) });
  const letgo = SNAKES[holdingOf(p.life || [], p.held)]?.letgo, age = words(p.years ?? 0);
  return letgo ? T("lifeEndWin", { age, letgo: held(letgo) }) : T("lifeEndFree", { age });
}

// A law with its own last word closes the account with it once the life is over (Cārvāka: this life was all there was).
function lawEnd(state, i, T, words, end) {
  const p = state.players[i], k = lawOf(state, i).text.end;
  return k && (p.dead || p.fell) ? `${end} ${T(k)}` : end;
}

// The fall from the heavens (REDESIGN.md Phase 12): the realm the life reached, the merit spent, and what it was still
// holding, the vice a death would have named. Gita 9.21 in the board's own words.
// What the door named is still carried down: the debts the life never met, or the holding on it was refused for.
function fellEnd(p, along, T, sq, held, l, who, law) {
  // nothing above the exit turns back, so the square it fell from is the highest it reached: since Phase 17 always the
  // top of the heavens, where Śiva's snake is
  const top = p.fellFrom ?? Math.max(...along.map(e => e.n)), vice = SNAKES[p.holding]?.holding;
  // a law with no next life ends it there, with nothing carried down (Cārvāka)
  if (law.text.fell) return T(law.text.fell, { realm: sq(top) });
  // the fall has already put what was unmet into the store (sañcita), which in one life is only this life's
  const k = karmaOf(p), unmet = [...carried(k), ...k.sancita], aim = (p.refusals || []).findLast(r => r.aim)?.aim;
  const carry = carryIn(l, unmet, aim, who), and = tIn(l, "listAnd");
  const holding = vice || carry ? [vice && held(vice), carry].filter(Boolean).join(and) : null;
  return holding ? T("lifeEndFell", { realm: sq(top), holding }) : T("lifeEndFellFree", { realm: sq(top) });
}

// A life whose years ran out at the door (REDESIGN.md Phase 14) ends on what it still owed, in the door's words.
function doorEnd(p, T, words, l, who) {
  const k = karmaOf(p), carry = carryIn(l, [...carried(k), ...k.sancita], null, who);
  return T("lifeEndDoor", { age: words(p.years), carry }).replace(/, ([.।])$/, "$1");
}

// A death by ledger (REDESIGN.md Phase 16) ends on how, by the life's age, and then on what it was still carrying, in the
// door's words: the debt that came due is among them, since dying of it did not pay it. With nothing carried, the vice
// it was still holding, as a death by years says it.
function ledgerEnd(p, T, words, l, who, held) {
  const k = karmaOf(p), carry = carryIn(l, [...carried(k), ...k.sancita], null, who) || held(SNAKES[p.holding]?.holding);
  return T("lifeEndLedger", { age: words(p.death.age ?? p.years), form: formIn(l, p.death.form, who), carry }).replace(/, ([.।])$/, "$1");
}

// A life after the first opens on a dream of the last (REDESIGN.md Phase 16; the Yogavāsiṣṭha's Lavaṇa and Gādhi): the
// one who was written down, by name, and the deed of most worth that life took, said of them in their own gender; and
// the forgotten holding (docs/NARRATIVE.md §13.6), the vice it was still holding, which this one is uneasy about without
// knowing why. Nothing for a first life.
function dreamOf(p, l, name) {
  const prev = p.prior?.last;
  if (!prev) return [];
  const them = { name, gender: prev.gender }, deed = p.prior.dream && optionOf(p.prior.dream.sq, p.prior.dream.opt)?.dream;
  const v = { prev: prev.name?.[l] || prev.name?.en || "", dream: deed ? fill(deed[l] || deed.en, them) : "" };
  const say = key => fill(tIn(l, key, { name, ...v }), them);
  // the forgotten holding opens its sentence: "Mirrors make Ravi uneasy, for no reason anyone can name."
  const forgot = SNAKES[prev.holding]?.forgot, uneasy = forgot && fill(forgot[l] || forgot.en, { name, gender: p.gender });
  const was = p.prior.was ? fill(tIn(l, "animalDream", { name, animal: tIn(l, "a_" + p.prior.was) }), { name, gender: p.gender }) : "";
  return [say(deed ? "lifeDream" : "lifeDreamNone"), was, uneasy ? tIn(l, "lifeForgot", { forgot: uneasy[0].toUpperCase() + uneasy.slice(1) }) : ""];
}

// The first line knows the shape of the whole life, and says only what happened, never what it was worth.
function opening(p, along, T, words) {
  if (!along.length) return "";
  if (p.death?.by === "ledger") return T("lifeOpenLedger", { age: words(p.death.age ?? p.years) });
  if (p.dead) return T("lifeOpenDied", { age: words(p.years) });
  const earthly = along.filter(e => e.n <= EARTH), to = Math.max(...earthly.map(e => e.years));
  const snakes = along.filter(e => e.via === "snake");
  const worst = snakes.reduce((w, e) => (ageOf(e.from) - ageOf(e.n) > (w ? ageOf(w.from) - ageOf(w.n) : -1) ? e : w), null);
  if (worst && ageOf(worst.from) - ageOf(worst.n) >= 20) return T("lifeOpenFall", { age: words(to), at: words(worst.years) });
  if (!snakes.length) return T("lifeOpenSteady");
  return T("lifeOpenLived", { age: words(to) });
}

// The path (REDESIGN.md Phase 16): the same life as its moves, one row per square landed on, in words: the age, the
// square's name and how it was reached. Years sat out or stayed on one square are one row. It ends on how the life ended.
// Player i's path in language l: { rows: [{ age, sq, via }], end }.
export function pathOf(state, i, l) {
  const p = state.players[i], T = (k, v = {}) => fill(tIn(l, k, { name: pnameIn(p, l), ...v }), { name: pnameIn(p, l), gender: p.gender });
  // the exit has no name of its own in the board's data, only on the board
  const words = n => wordsIn(l, Math.floor(n)), nameOf = n => (n === GOAL ? tIn(l, "moksha") : squareOf(n)?.[l] || squareOf(n)?.en || "");
  const rows = [];
  for (const e of yearsAlong(p.life || [], p.told || [])) {
    const last = rows.at(-1);
    if ((e.via === "sit" || e.via === "stay") && last && last.n === e.n && last.kind === e.via) { last.count++; continue; }
    if (e.via === "sit" || e.via === "stay") { rows.push({ n: e.n, years: e.years, kind: e.via, count: 1 }); continue; }
    rows.push({ n: e.n, years: e.years, kind: e.via, from: e.from });
  }
  const viaOf = r => r.kind === "snake" ? T("pathSnake", { sq: nameOf(r.from) }) : r.kind === "ladder" ? T("pathLadder", { sq: nameOf(r.from) })
    : r.kind === "reckon" ? T("pathReckon") : r.kind === "sit" ? (r.count === 1 ? T("pathSat") : T("pathSatN", { n: words(r.count) }))
    : r.kind === "stay" ? (r.count === 1 ? T("pathStay") : T("pathStayN", { n: words(r.count) })) : "";
  const end = state.winner === i ? T(lawOf(state, i).text.win.path) : p.fell ? T("pathFell") : p.dead ? T("pathDied") : p.earned ? T("animalEarned") : p.short ? T(state.rules.animal?.round >= 2 ? "animalLastText" : "animalShortText") : "";
  // an animal does not count years, so its path has none
  return { rows: rows.map(r => ({ age: isAnimal(state) ? "" : words(r.years), sq: nameOf(r.n), via: viaOf(r) })), end };
}

// The same life as plain text, to copy or save.
export function lifeText(state, i, l) {
  const { title, sub, open, paras, end, curse, fates } = lifeOf(state, i, l);
  return [[title, sub].filter(Boolean).join("\n"), open, ...paras.map(p => `${p.head}\n${p.text}`), [end, curse].filter(Boolean).join(" "), fates.join(" ")].filter(Boolean).join("\n\n") + "\n";
}
