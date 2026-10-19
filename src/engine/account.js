// ---- The life account (docs/NARRATIVE.md §9) ----
// Every moment a player landed on, in order, as prose: a paragraph per stage of life, stitched with the
// joining phrases in strings.JOINS. Pure, so it is tested in node; src/render/life.js only shows it.
//
// Ages are the years lived (src/engine/self.js), never the square's: a snake takes years without giving any
// back, so a life's ages only go forward. Each join is chosen by how a moment relates to the one before it,
// first match winning: the years a snake undid, a square's own echo of an earlier one, a ladder, the same
// snake or ladder again, a long quiet stretch, the same year, and only then one of the plain joins, drawn
// from a sequence of its own so the dice are never touched. Squares lived a second time are folded into one
// line instead of being told twice, and the fall from Brahma begins a second life.
import { ASHRAMAS, LADDERS, SNAKES, JOINS, squareOf, snakeOn } from "../content.js";
import { tIn, fill, wordsIn, ageWordsIn } from "../i18n.js";
import { makeRng, next } from "../rng.js";
import { pnameIn } from "../state.js";
import { ageOf, yearsAlong, stageOfYears, titleOf } from "./self.js";

const EARTH = 100, GAP = 8;
// An English moment that does not open with the name reads on after a joining phrase in lower case:
// "Then for a week…". A capital followed by another capital ("I", an acronym) is left alone.
const after = (raw, text, l) => (l === "en" && !raw.startsWith("{name}") && /^\p{Lu}\p{Ll}/u.test(text) ? text[0].toLowerCase() + text.slice(1) : text);
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

  const along = yearsAlong(p.life || []), paras = [];
  let para = null, seen = new Set(), lived = new Set(), lastYears = null, fold = [], reborn = false;
  const open = (s, again) => { para = { s, ages: [], parts: [], reborn: again }; paras.push(para); };
  // squares lived a second time, told as one line
  const flush = () => {
    if (!fold.length) return;
    const earth = fold.filter(e => e.n <= EARTH);
    if (earth.length) {
      const a = Math.min(...earth.map(e => ageOf(e.n))), b = Math.max(...earth.map(e => ageOf(e.n)));
      para.parts.push(a === b ? J(JOINS.foldOne, { a: words(a) }) : J(JOINS.foldRun, { a: words(a), b: words(b) }));
    } else para.parts.push(J(JOINS.foldHeights));
    lastYears = fold.at(-1).years;
    fold = [];
  };

  for (const [k, e] of along.entries()) {
    const q = squareOf(e.n), m = q?.moment, nextE = along[k + 1];
    if (e.via === "rebirth") { flush(); seen = new Set(); lived = new Set(); lastYears = null; para = null; reborn = true; }
    if (!m) { lived.add(e.n); continue; }
    const s = stageAt(e);
    if (!para || para.s !== s) { flush(); open(s, reborn && !paras.some(x => x.reborn)); }
    // a snake or ladder taken from here, and whether this square has been told already in this life
    const event = nextE && (nextE.via === "snake" || nextE.via === "ladder" || nextE.via === "rebirth");
    const repeat = seen.has(e.n);
    if (repeat && !e.via && !event) { fold.push(e); para.ages.push(Math.floor(e.years)); lived.add(e.n); continue; }
    flush();
    para.ages.push(Math.floor(e.years));

    let join = null;
    // above the world there is no more time to measure
    const gap = lastYears == null || e.n > EARTH ? null : e.years - lastYears;
    if (e.via === "snake") join = J(JOINS.snake, { cost: words(ageOf(e.from) - ageOf(e.n)) });
    else if (q.echo && lived.has(q.callsBack)) join = q.echo[l] || q.echo.en;
    else if (e.via === "ladder") join = J(JOINS.ladder);
    else if (repeat) join = J(JOINS.again);
    else if (para.parts.length && gap != null && gap >= GAP) join = J(JOINS.gap, { gap: words(gap) });
    else if (para.parts.length && gap != null && gap < 1) join = J(lastYears < 1 && e.years < 1 ? JOINS.months : JOINS.sameYear);
    else if (para.parts.length) join = J(then());
    // a moment says the years lived, "still" when a snake took no time at all
    const raw = m[l] || m.en, text = fill(raw, { ...who, age: Number.isInteger(e.years) ? ageWordsIn(l, e.years, e.via === "snake") : "" });
    para.parts.push(join ? join + after(raw, text, l) : text);
    seen.add(e.n); lived.add(e.n);
    lastYears = e.years;
    // a snake that starts on a god's square was taken: its own moment follows the god's
    const sn = snakeOn(e.n);
    if (sn?.moment && nextE?.n === sn.to) para.parts.push(fill(sn.moment[l] || sn.moment.en, who));
  }
  if (para) flush();

  const stage = s => (l === "hi" ? ASHRAMAS[s][2] : ASHRAMAS[s][1]);
  return {
    title: T("lifeTitle"),
    sub: p.peak != null ? tIn(l, "title" + titleOf(p.peak)) : "",
    open: opening(p, along, T, words),
    paras: paras.map(({ s, ages, parts, reborn }) => {
      const a = Math.min(...ages), b = Math.max(...ages);
      const head = s === 5 || !ages.length ? stage(s) : a === b ? T("lifeAt", { stage: stage(s), a }) : T("lifeSpan", { stage: stage(s), a, b });
      return { head: reborn ? `${T("lifeReborn")} · ${head}` : head, text: parts.join(" ") };
    }),
    end: state.winner === i ? T("lifeEndWin")
      : !p.life?.length ? T("lifeUnborn")
      : p.dead ? T("lifeEndDied", { age: words(p.years), holding: fill(SNAKES[p.holding]?.holding?.[l] || SNAKES[p.holding]?.holding?.en || "", who) }).replace(/, ([.।])$/, "$1")
      : T("lifeEndOpen", { n: p.pos }),
  };
}

// The first line knows the shape of the whole life, and says only what happened, never what it was worth.
function opening(p, along, T, words) {
  if (!along.length) return "";
  if (along.some(e => e.via === "rebirth")) return T("lifeOpenReborn");
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
  const { title, sub, open, paras, end } = lifeOf(state, i, l);
  return [[title, sub].filter(Boolean).join("\n"), open, ...paras.map(p => `${p.head}\n${p.text}`), end].filter(Boolean).join("\n\n") + "\n";
}
