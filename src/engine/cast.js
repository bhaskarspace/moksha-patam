// ---- The cast (docs/NARRATIVE.md §13.3–13.4, REDESIGN.md Phase 10C) ----
// The people a life is lived among: a mother and a father, a teacher, a friend, the one the player married, a son and
// a daughter, a rival. A moment says which of them it is about in its `cast` field, and names them with
// {friend=the friend} (src/i18n.js castFill). Each life draws its own: a name from content/names.json `cast` for
// everyone but the parents, a gender, and how much older than the player they are, from a sequence of its own seeded
// by the game, so the dice are never touched. Nothing is kept in state; the cast is the same every time it is drawn.
//
// A life meets a member of the cast on the first moment it tells that names them, and that moment says their name
// once, at its end ("Her name is Tārā."); every later moment uses it. Their fate is drawn across every square on the
// board that names them, landed on or not, and kept to everything this life saw: nobody dies before the last time
// the life was with them, and the parents, the teacher and the friend are gone before square 100 says they are.
import { CAST, CAST_WORDS, SQ, SITUATIONS, TOP, squareOf } from "../content.js";
import { castFill, fill, wordsIn } from "../i18n.js";
import { makeRng, next } from "../rng.js";
import { momentOf } from "./qbn.js";
import { ageOf, yearsAlong } from "./self.js";

// Who a moment can be about. A son and a daughter are both {child} in the text: the moment's `cast` says which.
export const MEMBERS = ["mother", "father", "teacher", "friend", "spouse", "son", "daughter", "rival"];
export const tokenOf = who => (who === "son" || who === "daughter" ? "child" : who);
const PARENTS = new Set(["mother", "father"]), CHILDREN = new Set(["son", "daughter"]);

// Every moment on the board that can be told, with its square: the square's own, its roll moment, a choice's outcome.
const MOMENTS = [];
for (let n = 1; n <= TOP; n++) {
  const q = squareOf(n);
  if (!q) continue;
  for (const m of [q.moment, SQ[n]?.roll?.moment, ...(SITUATIONS[n]?.options || []).map(o => o.outcome)]) if (m) MOMENTS.push({ n, m });
}
// The squares that name each member, and the oldest the board says the player is when it does: the arc a fate must
// come after, whether or not this life landed there. A board-fixed death (53, the father) is that square's age.
const SQUARES = {}, FLOOR = {}, DIES = {};
for (const { n, m } of MOMENTS) {
  if (!m.cast) continue;
  (SQUARES[m.cast] ||= new Set()).add(n);
  FLOOR[m.cast] = Math.max(FLOOR[m.cast] ?? 0, ageOf(n) ?? 0);
  if (m.dies) DIES[m.cast] = ageOf(n);
}

// A name as it is compared: Devanagari as written, Latin without its marks, so "Meera" is Mīrā and "Asha" is Āśā.
const latin = s => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/sh/g, "s").replace(/ee/g, "i").replace(/aa/g, "a").replace(/oo/g, "u");
export const nameKey = s => (/\p{Script=Latin}/u.test(s) ? latin(s.trim()) : s.trim().normalize("NFC"));

// Player i's cast for a life (the first, or the one after a fall from Brahma), or null when there are no names to give.
// Each named member is { gender, en, hi }, en null when the names ran out; everyone has `older`, how many years older
// than the player they are (a child's is its gap after the marriage), and two draws for its fate.
export function castOf(state, i, life = 0) {
  const list = CAST.names;
  if (!list) return null;
  const p = state.players[i];
  const rng = makeRng((state.rng.seed ^ 0x2c1b3c6d ^ Math.imul(i + 1, 0x85ebca6b) ^ Math.imul(life + 1, 0xc2b2ae35)) >>> 0);
  // nobody at the table lends a name to anyone's cast
  const taken = new Set(state.players.flatMap(q => [q.name, q.alias?.en, q.alias?.hi]).filter(Boolean).map(nameKey));
  const pool = gd => [...list[gd], ...(list.either || [])].filter(([en, hi]) => !taken.has(nameKey(en)) && !taken.has(nameKey(hi)));
  const coin = () => (next(rng) < 0.5 ? "m" : "f"), span = (a, b) => a + Math.floor(next(rng) * (b - a + 1));
  const cast = { mother: { gender: "f", en: null, hi: null }, father: { gender: "m", en: null, hi: null } };
  // a member whose gender is seeded takes the other one when its own has no names left; a son or a spouse stays unnamed
  const draw = (who, gender, either = false) => {
    const u = next(rng);
    let gd = gender, names = pool(gd);
    if (!names.length && either) names = pool((gd = gd === "m" ? "f" : "m"));
    const nm = names.length ? names[Math.floor(u * names.length)] : null;
    if (nm) nm.forEach(x => taken.add(nameKey(x)));
    cast[who] = { gender: nm ? gd : gender, en: nm?.[0] ?? null, hi: nm?.[1] ?? null };
  };
  draw("son", "m");
  draw("daughter", "f");
  draw("spouse", p.gender === "m" ? "f" : p.gender === "f" ? "m" : coin());
  for (const who of ["teacher", "friend", "rival"]) draw(who, coin(), true);
  cast.mother.older = span(20, 38);
  cast.father.older = span(20, 38);
  cast.teacher.older = span(20, 35);
  cast.friend.older = 0;
  cast.rival.older = span(-2, 2);
  cast.spouse.older = span(-4, 4);
  cast.son.gap = span(1, 4);
  cast.daughter.gap = span(1, 4);
  for (const who of MEMBERS) cast[who].fate = [next(rng), next(rng)];
  return cast;
}

// How a moment calls a member by name in language l (the teacher is आनंदजी), or null for someone with no name.
export function calledIn(cast, who, l) {
  const c = cast?.[who];
  if (!c?.en) return null;
  const call = CAST_WORDS.call[who];
  return (call ? call[l] || call.en : "{n}").replace("{n}", c[l] || c.en);
}

// The people a moment can name, for castFill: each member by name once this life has met them, and by gender always.
// {child} is the son or the daughter, whichever the moment is about, and the son when it does not say.
export function peopleOf(cast, met, l, about = null) {
  if (!cast) return {};
  const out = {}, child = about === "daughter" ? "daughter" : "son";
  for (const who of MEMBERS) {
    if (CHILDREN.has(who) && who !== child) continue;
    out[tokenOf(who)] = { gender: cast[who].gender, name: met.has(who) ? calledIn(cast, who, l) : null };
  }
  return out;
}

// What the moment where a life meets a member says at its end: "Her name is Tārā." Nothing for the parents.
export function introIn(cast, who, l) {
  const c = cast?.[who], t = CAST_WORDS.intro[who];
  if (!c?.en || !t) return "";
  return castFill((t[l] || t.en).replace("{n}", c[l] || c.en), { who: { gender: c.gender } });
}

// Whether moment m, told on player i's next landing, is where their life meets a member of the cast by name: the card
// then says "Her name is …" at its end (src/render/card.js momentIn), and is worth opening whole (REDESIGN.md Phase 11).
// The parents are met but never named, so they are not an introduction.
export function meetsNamed(state, i, m) {
  if (!m?.cast || m.introduces === false || !CAST_WORDS.intro[m.cast]) return false;
  const p = state.players[i], along = yearsAlong(p.life || [], p.told || []).filter(e => e.via !== "stay");
  const last = castAlong(state, i, along).at(-1);
  return !(last && (last.before.has(m.cast) || (last.meets && last.about === m.cast)));
}

// For each entry of a life (yearsAlong, without the years a choice cost): the member its moment is about, whether this
// is where the life meets them, who it had met before, and the cast of the life it is in.
export function castAlong(state, i, along) {
  let life = 0, cast = castOf(state, i, 0), met = new Set();
  return along.map(e => {
    if (e.via === "rebirth") { life++; cast = castOf(state, i, life); met = new Set(); }
    const m = e.via === "sit" ? null : momentOf(e.n, e.told).moment, about = m?.cast ?? null, before = new Set(met);
    const meets = !!about && !met.has(about) && m.introduces !== false;
    if (meets) met.add(about);
    return { about, meets, before, cast, life };
  });
}

// The last life's cast as arcs, in the order they were met: when the life last saw each of them (the last moment it
// told that names them), the earliest they can die (the board's arc and every landing on their squares), the latest
// (before 100 says they are gone), and when they did, in the player's years. Only once the life is over.
export function castArcs(state, i, along, cc = castAlong(state, i, along)) {
  const p = state.players[i];
  if (!cc.length || !cc.at(-1).cast || !(p.dead || state.winner === i)) return [];
  const { life, cast } = cc.at(-1), from = cc.findIndex(c => c.life === life);
  const order = [], seen = {}, landed = {}, told = new Set();
  let gone = null;
  for (let k = from; k < along.length; k++) {
    const e = along[k], c = cc[k];
    if (c.meets) order.push(c.about);
    if (c.about) { seen[c.about] = Math.max(seen[c.about] ?? 0, e.years); told.add(e.via === "sit" ? null : momentOf(e.n, e.told).moment); }
    for (const who of MEMBERS) if (SQUARES[who]?.has(e.n)) landed[who] = Math.max(landed[who] ?? 0, e.years);
    const m = e.via === "sit" ? null : momentOf(e.n, e.told).moment;
    if (m?.gone && gone == null) gone = { years: e.years, who: new Set(m.gone) };
  }
  const end = p.years ?? 0;
  return order.map(who => {
    const c = cast[who], older = c.older ?? 0, floor = Math.max(FLOOR[who] ?? 0, landed[who] ?? 0), ceil = gone?.who.has(who) ? gone.years : null;
    const arc = { who, seen: seen[who], floor, ceil, end, older, coda: c.fate[1] };
    // a child outlives the player: the heavens are kept by somebody below with the player's nose (108)
    if (CHILDREN.has(who)) return { ...arc, death: null, kind: "outlived" };
    // a death the board fixes (the father at 53) is not a fate when this life was there to see it
    if (DIES[who] != null) {
      const saw = MOMENTS.some(({ m }) => m.dies && m.cast === who && told.has(m));
      return { ...arc, death: DIES[who], kind: saw ? "seen" : DIES[who] > end ? "outlived" : "died" };
    }
    // their own age at death between sixty and ninety-five, when that fits between the floor and the ceiling
    const lo = Math.floor(floor) + 1, hi = ceil == null ? Infinity : Math.ceil(ceil) - 1;
    let a = Math.max(lo, 60 - older), b = Math.min(hi, 95 - older);
    if (a > b) { a = lo; b = Math.max(lo, Number.isFinite(hi) ? hi : lo); }
    const death = a + Math.floor(c.fate[0] * (b - a + 1));
    return { ...arc, death, kind: death > end ? "outlived" : "died" };
  });
}

// The closing's fate lines in language l, one per member the last life met, in the order met, and never more than
// FATES: the lines after the third take the short form, which says only when ("…died when Meera was sixty."), and the
// rest are left unsaid. who is the player.
const FATES = 4, FULL = 3;
export function fatesIn(state, i, l, along, cc, who) {
  const cast = cc.at(-1)?.cast, W = CAST_WORDS, words = n => wordsIn(l, Math.floor(n)), pick = t => t[l] || t.en;
  let coded = false;
  const say = (t, member, v) => fill(castFill(pick(t), { who: member }).replace(/\{(seen|at|by|pos)\}/g, (_, k) => v[k] ?? ""), who);
  const arcs = castArcs(state, i, along, cc).filter(a => a.kind !== "seen" && (PARENTS.has(a.who) || calledIn(cast, a.who, l)));
  return arcs.slice(0, FATES).map((a, at) => {
    const c = cast[a.who], family = PARENTS.has(a.who) || a.who === "spouse" || CHILDREN.has(a.who);
    const name = PARENTS.has(a.who) ? fill(pick(W.family[a.who]), who) : calledIn(cast, a.who, l);
    const member = { name, gender: c.gender }, n = a.death - a.end;
    const by = n === 1 ? pick(W.year) : pick(W.years).replace("{n}", words(n));
    // the short form: "outlived" only for someone still alive when the player died, and no coda
    if (at >= FULL) return a.kind === "outlived" ? say(W.childOutlived, member, {}) : say(W.familyDied, member, { at: words(a.death) });
    if (CHILDREN.has(a.who)) return say(W.childOutlived, member, {});
    if (family) return a.kind === "died" ? say(W.familyDied, member, { at: words(a.death) }) : say(W.familyOutlived, member, { by });
    if (a.kind === "outlived") return say(a.who === "teacher" ? W.outlivedHon : W.outlived, member, { seen: words(a.seen), by });
    // at most one closing line gets the short ending after it, so it never becomes a refrain
    const k = Math.floor(a.coda * (W.codas.length + 2)), coda = k < W.codas.length && !coded ? " " + fill(pick(W.codas[k]), who) : "";
    if (coda) coded = true;
    return say(W.died, member, { seen: words(a.seen), at: words(a.death + a.older), pos: pick(a.who === "teacher" ? W.posHon : W.pos) }) + coda;
  });
}
