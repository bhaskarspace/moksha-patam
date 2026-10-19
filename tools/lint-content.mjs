// Checks content/*.json: every string in both languages, every id pointing somewhere, every
// citation glossed, no Codex entry that a reader could never meet, and the card contract of
// docs/CONTENT.md §2: every lead line names someone, and every square has two voices to disagree.
// Phase 3 (docs/NARRATIVE.md §4, §10, §11) adds the moments: each names the player in both
// languages, Hindi agreement goes through {m|f} choices, every earthly square has an age, and the
// lint reports how many moments are written so the content build has a visible burn-down.
//   node tools/lint-content.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { GOAL, TOP, ASHRAMAS, LADDERS, SNAKES, SQ, HEAVEN, STR, SRC_HI, JOINS, NUM_HI, READINGS, CODEX, REFS, ENTRY_IDS, srcOfSquare, sourceOf, leadOf, squareOf, SITUATIONS } from "../src/content.js";
import NAMES from "../content/names.json" with { type: "json" };
import { ENDGAME } from "../src/engine/turn.js";
import { destOf, worthOf } from "../src/engine/qbn.js";
import { ageOf, stageOfYears } from "../src/engine/self.js";

// Names compare without diacritics or case, so "Śaṅkara", "Sankara" and "sankara" are one name.
const fold = s => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const has = (text, form, f = x => x) => new RegExp(`(?<![\\p{L}\\p{M}])${f(form).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{M}])`, "u").test(f(text));
// Everyone a lead can name, each as {en: [forms], hi: [forms]}: the lexicon in names.json, plus every
// Codex school, figure and source ("अद्वैत वेदांत" also matches as "अद्वैत").
export const NAMED = [
  ...Object.values(NAMES).filter(Array.isArray).flat(),
  ...["schools", "figures", "sources"].flatMap(g => Object.values(CODEX[g]).map(e => ({
    en: [e.name.en, ...(e.iast ? e.iast.split(" · ") : [])], hi: [e.name.hi, e.name.hi.split(" ")[0]] }))),
];
// The names a lead carries. English must name someone; the Hindi must carry one of those same names,
// so a generic Hindi word ("अग्नि" is also fire) never passes on its own.
export function leadNames([en, hi]) {
  const found = NAMED.filter(e => e.en.some(f => has(en, f, fold)));
  return { en: found.map(e => e.en[0]), hi: found.some(e => e.hi.some(f => has(hi, f))) };
}

// ---- Moments (docs/NARRATIVE.md §4) ----
// Hindi words that agree with their subject's gender. Where the player is the subject they must come
// from a {m|f} choice: "{name} {बड़ा|बड़ी} हुआ" is still wrong, "{name} {बड़ा हुआ|बड़ी हुई}" is right.
const AGREES = new Set(("हुआ हुई हुए था थी थे गया गई गयी गए रहा रही रहे लगा लगी लगे सका सकी सके चुका चुकी चुके " +
  "पाया पाई पाए बड़ा बड़ी छोटा छोटी अकेला अकेली बैठा बैठी खड़ा खड़ी लेटा लेटी थका थकी चला चली गिरा गिरी उठा उठी " +
  "पहुँचा पहुँची लौटा लौटी आया आई जागा जागी सोया सोई रुका रुकी डरा डरी हँसा हँसी रोया रोई बूढ़ा बूढ़ी").split(" "));
// Habitual participles (करता / करती) agree too, but a word ending in ता is often a noun (पिता, पता), so
// these only warn.
const HABITUAL = /^[\p{L}\p{M}]{2,}(ता|ती)$/u;
const NOT_HABITUAL = new Set("पिता माता पता देवता कविता रास्ता ममता गीता लता सविता जनता रोती बत्ती मिट्टी धरती रोटी चिट्ठी मोती छाती बस्ती सती ज्योति".split(" "));
// After {name}, a postposition means the player is not the subject ("{name} की माँ थक गई" is about the mother).
const NOT_SUBJECT = /^\s*(का|की|के|को|से|ने|में|पर|तक|जैसा|जैसी|जैसे)(?![\p{L}\p{M}])/u;
// Where a clause ends: punctuation, or a word that brings in a new one.
const CLAUSE_END = /[।,;:—?!."'‘’“”]|(?<![\p{L}\p{M}])(कि|जब|जो|तो|लेकिन|मगर)(?![\p{L}\p{M}])/u;
export function hindiAgreement(hi) {
  const bare = hi.replace(/\{[^{}]*\|[^{}]*\}/g, " ¦ "), errors = [], warnings = [];
  for (const m of bare.matchAll(/\{name\}/g)) {
    let rest = bare.slice(m.index + m[0].length);
    if (NOT_SUBJECT.test(rest)) continue;
    const end = rest.search(CLAUSE_END);
    if (end >= 0) rest = rest.slice(0, end);
    for (const w of rest.split(/\s+/).filter(Boolean)) {
      if (AGREES.has(w)) errors.push(w);
      else if (HABITUAL.test(w) && !NOT_HABITUAL.has(w)) warnings.push(w);
    }
  }
  return { errors, warnings };
}
// English: a he or she about the player should be the name again, or a {his|her|their} choice. A sentence
// that names a male or female member of the cast, or follows one that does, may use that pronoun for
// them ("{name}'s father is dying. He asks…"), so those only warn.
const HE = /(?<![\w{|])(he|him|his|himself)(?![\w|}])/i, SHE = /(?<![\w{|])(she|her|hers|herself)(?![\w|}])/i;
const MALE = /\b(father|son|grandson|brother|husband|man|boy|uncle|grandfather|teacher|brahmin|king|jackal|monk)\b/i;
const FEMALE = /\b(mother|daughter|granddaughter|sister|wife|woman|girl|aunt|grandmother|queen)\b/i;
export function englishPronouns(en) {
  const sentences = en.replace(/\{[^{}]*\|[^{}]*\}/g, " ").split(/(?<=[.!?])\s+/);
  return sentences.flatMap((bare, i) => {
    const near = (sentences[i - 1] || "") + " " + bare;
    return [[HE, MALE], [SHE, FEMALE]].filter(([p, cast]) => p.test(bare) && !cast.test(near)).map(([p]) => bare.match(p)[0]);
  });
}
// The moment's placeholders: {name}, {age} (Phase 8: the years lived, as words), or two or three choices for g().
const badSlots = text => [...text.matchAll(/\{([^{}]*)\}/g)].map(m => m[1]).filter(x => x !== "name" && x !== "age" && !/^[^|]+\|[^|]+(\|[^|]+)?$/.test(x));
// An age spoken as a number word in English, which since Phase 8 must come from {age} so it can be the years lived.
const SPOKEN_AGE = /^\{name\} is (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b(?! months)/;

// The lint in full: errors fail the build, warnings print, and moments counts the burn-down.
export function lintReport() {
  const errors = [], warnings = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
  const bilingual = (where, o) => {
    if (!o || typeof o !== "object") return err(where, "missing");
    if (!o.en?.trim()) err(where, "no English");
    if (!o.hi?.trim()) err(where, "no Hindi");
  };

  // UI strings: the same keys in both languages
  for (const k of Object.keys(STR.en)) if (!STR.hi[k]?.trim()) err(`strings.${k}`, "no Hindi");
  for (const k of Object.keys(STR.hi)) if (!STR.en[k]?.trim()) err(`strings.${k}`, "no English");

  // the joining phrases of the life account: each reads on into a moment, so it ends in a space (Phase 8)
  const join = (where, j) => { bilingual(where, j); for (const l of ["en", "hi"]) if (j?.[l] && !j[l].endsWith(" ")) err(where, `the ${l} join does not read on into the moment: end it with a space`); };
  for (const [i, j] of JOINS.then.entries()) join(`strings.JOINS.then[${i}]`, j);
  for (const k of ["snake", "ladder", "again", "gap", "sameYear", "months"]) join(`strings.JOINS.${k}`, JOINS[k]);
  // whole sentences, or the part of one a tally counts in (Phase 9: repeats told short, years sat out)
  for (const k of ["foldRun", "foldOne", "foldHeights", "snakeAgain", "ladderAgain", "tallySnake", "tallyLadder", "times", "sitOne", "sitRun", "backTo"]) bilingual(`strings.JOINS.${k}`, JOINS[k]);
  if (NUM_HI?.length !== 101 || NUM_HI.some(w => !w?.trim())) err("strings.NUM_HI", "needs the Hindi number words from 0 to 100");

  // a mirror, wherever it is, names someone in both languages
  const lintLead = (where, lead) => {
    const named = leadNames(lead);
    if (!named.en.length) err(where, "names nobody");
    else if (lead[1] && !named.hi) err(where, `the Hindi drops the name (${named.en.join(", ")})`);
  };

  // text about the player: {name} in both languages, known placeholders, Hindi agreement through {m|f}
  const playerText = (where, o) => {
    for (const l of ["en", "hi"]) {
      if (!o[l].includes("{name}")) err(where, `the ${l === "en" ? "English" : "Hindi"} does not name the player with {name}`);
      for (const x of badSlots(o[l])) err(where, `unknown placeholder {${x}}`);
    }
    const agree = hindiAgreement(o.hi);
    if (agree.errors.length) err(where, `the Hindi agrees with {name} without a {m|f} choice: ${agree.errors.join(", ")}`);
    if (agree.warnings.length) warn(where, `the Hindi may agree with {name} without a {m|f} choice: ${agree.warnings.join(", ")}`);
    const he = englishPronouns(o.en);
    if (he.length) warn(where, `the English uses "${he.join('", "')}"; use the name again, or a {his|her|their} choice`);
  };
  const citation = (where, src) => {
    if (src && !sourceOf(src)) err(where, `citation "${src}" matches no Codex source`);
    if (src && /[A-Za-z]/.test(SRC_HI.reduce((a, [en, hi]) => a.replace(en, hi), src))) err(where, `citation "${src}" has no Hindi in strings.SRC_HI`);
  };

  // every square has a name and a mirror in both languages, and its citation is in the Codex
  const moments = { written: 0, total: TOP - 1, bands: ASHRAMAS.map(([max, en]) => ({ en, max, written: 0, total: 0 })) };
  let lastAge = 0;
  // what every moment must do, a square's own or the other one it can tell
  const momentText = (where, m, q) => {
    playerText(where, m);
    if (SPOKEN_AGE.test(m.en)) err(where, "says the age in words; say {age}, so the moment tells the years actually lived (REDESIGN.md Phase 8)");
    if ((m.en.includes("{age}") || m.hi.includes("{age}")) && !(Number.isInteger(q.age) && q.age >= 1)) err(where, "says {age} on a square whose age is not a whole year");
    if (m.en.includes("{age}") !== m.hi.includes("{age}")) err(where, "says {age} in one language only");
    if (m.mirror) { bilingual(`${where} mirror`, m.mirror); if (m.mirror.en) lintLead(`${where} mirror`, [m.mirror.en, m.mirror.hi]); }
    // §2: the mirror attaches to the moment; the Phase 2 opener is the thing being replaced
    const mirrorEn = (m.mirror || q.mirror).en;
    if (/^In (the )?\p{Lu}/u.test(mirrorEn)) err(where, `the mirror opens "${mirrorEn.split(" ").slice(0, 3).join(" ")}…", the Phase 2 voice; open with a connective (docs/NARRATIVE.md §2)`);
  };
  for (let n = 1; n <= TOP; n++) {
    const q = squareOf(n), lead = leadOf(n);
    if (!q) { err(`square ${n}`, "has no content"); continue; }
    if (lead?.[0]) lintLead(`square ${n} mirror`, lead);
    bilingual(`square ${n} mirror`, q.mirror);
    if (n === GOAL) {
      if ((READINGS[n]?.views?.length || 0) < 2) err(`square ${n}`, "needs the schools' definitions of moksha in views");
      // §8: no moment and no name on the last square; that is the whole statement
      if (q.moment) err(`square ${n}`, "must have no moment: the player's name does not appear on the exit");
      if (q.age != null) err(`square ${n}`, "has no age");
      continue;
    }
    bilingual(`square ${n} name`, q);

    // §5: an authored age on every earthly square, none above the world
    if (n <= 100) {
      if (typeof q.age !== "number" || q.age < 0 || q.age > 120) err(`square ${n}`, "needs an authored age (docs/NARRATIVE.md §5)");
      else { if (q.age < lastAge) warn(`square ${n}`, `age ${q.age} is younger than the square before (${lastAge})`); lastAge = q.age; }
    } else if (q.age != null) err(`square ${n}`, "is above the world and has no age (docs/NARRATIVE.md §8)");
    if (q.callsBack != null && !(Number.isInteger(q.callsBack) && q.callsBack >= 1 && q.callsBack <= TOP && q.callsBack !== GOAL && q.callsBack !== n)) err(`square ${n}`, `callsBack ${q.callsBack} is not another square`);
    else if (q.callsBack != null && !squareOf(q.callsBack)?.moment) warn(`square ${n}`, `calls back to ${q.callsBack}, which has no moment yet`);
    // Phase 8: a callback is said in the life account by its own echo, a phrase that reads on into the moment
    if ((q.callsBack != null) !== !!q.echo) err(`square ${n}`, q.echo ? "has an echo but calls back to nothing" : "calls back without an echo for the life account");
    if (q.echo) join(`square ${n} echo`, q.echo);

    const r = READINGS[n] || {}, voices = (r.schools?.length || 0) + (r.views?.length || 0);
    if (voices < 2) err(`square ${n}`, voices ? "one voice: a disagreement needs two schools in readings.json" : "no voice: needs two schools in readings.json");
    citation(`square ${n}`, srcOfSquare(n));

    // Phase 4: a snake tail paired with its remedy says the ladder is one step above (REDESIGN.md Phase 4,
    // item 3). Only the five declared pairs carry one; tail 11 sits under Wit, which does not heal fibbing.
    const remedyOf = Object.values(SNAKES).some(s => s.to === n) && LADDERS[n + 1];
    if (q.remedy) {
      if (!remedyOf) err(`square ${n} remedy`, "is not a snake tail one square below a ladder");
      bilingual(`square ${n} remedy`, q.remedy);
      if (q.remedy.en && q.remedy.hi) playerText(`square ${n} remedy`, q.remedy);
    }

    // §4, §10: the moment
    const band = moments.bands.find(b => n <= b.max);
    band.total++;
    const m = q.moment;
    if (!m) continue;
    const where = `square ${n} moment`;
    if (!m.en?.trim() || !m.hi?.trim()) { err(where, `exists in ${m.en?.trim() ? "English" : "Hindi"} only`); continue; }
    moments.written++; band.written++;
    momentText(where, m, q);

    // Phase 10: a square that tells one of two moments by the face it was arrived at. Only a story square below the
    // endgame: there one die is rolled and the face cannot be chosen. Snakes and ladders fire on every face, since
    // making them roll-dependent was measured to raise the liberation rate (REDESIGN.md Phase 10).
    const roll = q.roll;
    if (!roll) continue;
    const rw = `square ${n} roll`;
    if (!SQ[n] || LADDERS[n] || SNAKES[n] || HEAVEN[n]) err(rw, "only a story square can tell two moments: snakes and ladders fire on every face");
    if (n >= ENDGAME) err(rw, `is at or above ${ENDGAME}, where the player chooses the die and so the moment`);
    if (roll.valence !== "good" && roll.valence !== "bad") err(rw, `valence "${roll.valence}" is neither good (low faces bring the event) nor bad (high faces do)`);
    if (!(Number.isInteger(roll.faces) && roll.faces >= 1 && roll.faces <= 5)) err(rw, `faces ${roll.faces} is not 1 to 5: each moment needs a face`);
    const rm = roll.moment;
    if (!rm?.en?.trim() || !rm?.hi?.trim()) err(`${rw} moment`, "needs the other moment in both languages");
    else momentText(`${rw} moment`, rm, q);
    if (roll.echo) { if (q.callsBack == null) err(`${rw} echo`, "has an echo but the square calls back to nothing"); join(`${rw} echo`, roll.echo); }
  }

  // a snake that starts on a god's square (Phase 4: 109, merit spent) is a snake card of its own: a name,
  // a moment, a mirror that names someone, two voices and a citation, like every other snake
  for (const [h, sn] of Object.entries(SNAKES)) {
    if (!HEAVEN[h]) continue;
    const where = `snake ${h}`;
    bilingual(`${where} name`, sn);
    if (!sn.skt) err(where, "no Sanskrit name");
    bilingual(`${where} mirror`, sn.mirror);
    if (sn.mirror?.en) lintLead(`${where} mirror`, [sn.mirror.en, sn.mirror.hi]);
    if (!sn.moment?.en || !sn.moment?.hi) err(`${where} moment`, "needs a moment in both languages");
    else playerText(`${where} moment`, sn.moment);
    if ((sn.schools?.length || 0) < 2) err(where, "a disagreement needs two schools");
    for (const [i, s] of (sn.schools || []).entries()) { bilingual(`${where}.schools[${i}]`, s); if (!CODEX.schools[s.id]) err(`${where}.schools[${i}]`, `unknown school "${s.id}"`); }
    citation(where, sn.src);
  }
  for (const [h, sn] of Object.entries(SNAKES)) if (!(sn.to >= 1 && sn.to < +h)) err(`snake ${h}`, `falls to ${sn.to}, which is not below it`);

  // Phase 8: every vice and virtue moves the gunas, and a vice says what a life was still holding when it ended
  for (const [h, sl] of [...Object.entries(SNAKES), ...Object.entries(LADDERS)]) {
    if (SNAKES[h]?.rebirth) continue;
    const where = `${LADDERS[h] ? "ladder" : "snake"} ${h}`;
    if (!["s", "r", "t"].includes(sl.guna)) err(where, "needs a guna: s, r or t");
    if (LADDERS[h] && sl.guna !== "s") err(where, "a virtue is sattva");
    if (SNAKES[h]) { bilingual(`${where} holding`, sl.holding); if (sl.holding?.en && !/^still /.test(sl.holding.en)) err(`${where} holding`, 'reads on from the closing line, as "still …"'); }
    // Phase 9: and what a life let go puts down, the same vice, so a win ends with the weight a death does
    if (SNAKES[h]) { bilingual(`${where} letgo`, sl.letgo); if (sl.letgo?.en && /^still /.test(sl.letgo.en)) err(`${where} letgo`, "is put down, not still held"); }
  }

  // Phase 10: the situations (REDESIGN.md §2.5). Each is two or three options on a square below the endgame, every
  // one bilingual and agreeing in Hindi, at least one never withheld, and every gate one a life can pass. The
  // structural rule: the option worth least advances more cheaply, never further, than the one worth most.
  const GUNAS = ["s", "r", "t"], AIMS = ["dharma", "artha", "kama"];
  const range = (where, r, lo, hi) => {
    if (r.min != null && !(r.min >= lo && r.min < hi)) err(where, `min ${r.min} cannot be passed`);
    if (r.max != null && !(r.max > lo && r.max <= hi)) err(where, `max ${r.max} cannot be passed`);
    if (r.min != null && r.max != null && r.min >= r.max) err(where, "is an empty range");
  };
  for (const [key, sit] of Object.entries(SITUATIONS)) {
    const n = +key, w = `situations.${key}`, q = squareOf(n);
    if (!(Number.isInteger(n) && n >= 1 && n < ENDGAME) || !q) { err(w, `is not a square below ${ENDGAME}`); continue; }
    if (HEAVEN[n]) err(w, "is in the divine row, where you walk");
    if (SQ[n]?.roll) err(w, "is on a square that already tells two moments by the roll");
    if (!sit.prompt?.en?.trim() || !sit.prompt?.hi?.trim()) err(`${w} prompt`, "needs a prompt in both languages");
    else momentText(`${w} prompt`, sit.prompt, q);
    const opts = sit.options || [];
    if (opts.length < 2 || opts.length > 3) err(w, `has ${opts.length} options: a situation offers two or three`);
    if (new Set(opts.map(o => o.id)).size !== opts.length) err(w, "uses an option id twice");
    if (!opts.some(o => !o.require)) err(w, "can withhold every option: one must always be open");
    const earliest = stageOfYears(ageOf(n) ?? 0);
    for (const o of opts) {
      const ow = `${w}.${o.id}`;
      bilingual(`${ow} label`, o.label);
      if (!["snake", "ladder", "here"].includes(o.move)) err(ow, `move "${o.move}" is not snake, ladder or here`);
      if (o.move === "snake" && (!SNAKES[n] || SNAKES[n].rebirth)) err(ow, "takes a snake on a square that has none");
      if (o.move === "ladder" && !LADDERS[n]) err(ow, "takes a ladder on a square that has none");
      if (!(Number.isInteger(o.cost) && o.cost >= 0 && o.cost <= 8)) err(ow, `cost ${o.cost} is not a whole number of years, 0 to 8`);
      if (!GUNAS.includes(o.guna)) err(ow, `guna "${o.guna}" is not s, r or t`);
      for (const [k, d] of Object.entries(o.aims || {})) if (!AIMS.includes(k) || typeof d !== "number") err(ow, `aims.${k} is not an aim with a number`);
      if (o.outcome) { if (!o.outcome.en?.trim() || !o.outcome.hi?.trim()) err(`${ow} outcome`, "needs both languages"); else momentText(`${ow} outcome`, o.outcome, q); }
      else if (!q.moment) err(ow, "has no outcome, and the square has no moment of its own to tell");
      if (o.require) {
        // §2.5: a withheld option says why, or the player loses the thread
        bilingual(`${ow} why`, o.why);
        for (const [k, r] of Object.entries(o.require.guna || {})) { if (!GUNAS.includes(k)) err(`${ow} require`, `"${k}" is not a guna`); else range(`${ow} require.guna.${k}`, r, 0, 1); }
        for (const [k, r] of Object.entries(o.require.aims || {})) { if (!AIMS.includes(k)) err(`${ow} require`, `"${k}" is not an aim`); else range(`${ow} require.aims.${k}`, r, 0, 100); }
        // years only go forward, so a stage before the square's own can never be in force there
        if (o.require.stage && !o.require.stage.some(x => Number.isInteger(x) && x >= earliest && x <= 4)) err(`${ow} require.stage`, "names no stage a life can be in on this square");
      } else if (o.why) err(ow, "has a reason for being withheld, but no gate");
    }
    if (opts.length >= 2) {
      const sorted = [...opts].sort((a, b) => worthOf(a) - worthOf(b)), lo = sorted[0], hi = sorted.at(-1);
      if (worthOf(lo) === worthOf(hi)) err(w, "has no option worth less than another: a choice needs a temptation");
      else {
        if (destOf(n, lo) > destOf(n, hi)) err(w, `the option worth least (${lo.id}) goes further than the one worth most (${hi.id}): it may advance more cheaply, never further`);
        if (lo.cost > hi.cost) err(w, `the option worth least (${lo.id}) costs more years than the one worth most (${hi.id})`);
      }
    }
  }

  // readings: bilingual, and every school or person they name exists
  for (const [n, r] of Object.entries(READINGS)) {
    if (!(+n >= 1 && +n <= TOP)) err(`readings.${n}`, "not a square");
    for (const [i, s] of (r.schools || []).entries()) { bilingual(`readings.${n}.schools[${i}]`, s); if (!CODEX.schools[s.id]) err(`readings.${n}.schools[${i}]`, `unknown school "${s.id}"`); }
    for (const k of ["views", "beyond"]) for (const [i, s] of (r[k] || []).entries()) { bilingual(`readings.${n}.${k}[${i}]`, s); if (!CODEX.schools[s.id]) err(`readings.${n}.${k}[${i}]`, `unknown school "${s.id}"`); }
    for (const id of r.figures || []) if (!CODEX.figures[id]) err(`readings.${n}.figures`, `unknown person "${id}"`);
    if (r.scholar) bilingual(`readings.${n}.scholar`, r.scholar);
    if (r.line2) bilingual(`readings.${n}.line2`, r.line2);
  }

  // the Codex itself
  for (const [id, e] of Object.entries(CODEX.schools)) {
    for (const f of ["name", "tag", "line", "body", "moksha"]) bilingual(`codex.schools.${id}.${f}`, e[f]);
    if (!e.url) err(`codex.schools.${id}`, "no link");
  }
  for (const [id, e] of Object.entries(CODEX.sources)) {
    for (const f of ["name", "gloss"]) bilingual(`codex.sources.${id}.${f}`, e[f]);
    if (!e.match) err(`codex.sources.${id}`, "no match prefix");
    if (!e.url) err(`codex.sources.${id}`, "no link");
  }
  for (const [id, e] of Object.entries(CODEX.figures)) {
    for (const f of ["name", "dates", "line"]) bilingual(`codex.figures.${id}.${f}`, e[f]);
    if (e.school && !CODEX.schools[e.school]) err(`codex.figures.${id}`, `unknown school "${e.school}"`);
    if (!e.url) err(`codex.figures.${id}`, "no link");
  }
  const dupes = ENTRY_IDS.filter((id, i) => ENTRY_IDS.indexOf(id) !== i);
  if (dupes.length) err("codex", `ids used twice: ${dupes.join(", ")}`);

  // reachable: met on some square, or (people) through a school that is
  const reachable = new Set(Object.keys(REFS));
  for (const [id, e] of Object.entries(CODEX.figures)) if (e.school && reachable.has(e.school)) reachable.add(id);
  for (const id of ENTRY_IDS) if (!reachable.has(id)) err(`codex.${id}`, "never appears on the board, so it can never be met");

  // the Basohli sprite sheet (CONTENT.md §7), when there is one: the seven palette colours from styles.css
  // and nothing else, one outline weight, flat fills, and a symbol for every square and every school
  const root = path.resolve(import.meta.dirname, "..");
  const sheet = path.join(root, "assets/sprites.svg");
  if (fs.existsSync(sheet)) errors.push(...lintSprites(fs.readFileSync(sheet, "utf8"), fs.readFileSync(path.join(root, "src/styles.css"), "utf8")));
  errors.push(...lintPaint(root));

  // REFERENCE.md §6: the board's own history is medieval, not ancient
  const all = JSON.stringify([READINGS, CODEX, STR]);
  if (/\bancient\b/i.test(all)) err("content", 'says "ancient"; the board\'s history is medieval');

  return { errors, warnings, moments };
}

export const lintContent = () => lintReport().errors;

// "moments: 23/109 written (Childhood 20/20 · Brahmacharya 3/20 · …)"
export const momentsLine = ({ written, total, bands }) =>
  `moments: ${written}/${total} written (${bands.filter(b => b.total).map(b => `${b.en} ${b.written}/${b.total}`).join(" · ")})`;

export function lintSprites(svg, css) {
  const errors = [], err = msg => errors.push(`sprites.svg: ${msg}`);
  const palette = new Set([...css.matchAll(/--b-[\w-]+:\s*(#[0-9A-Fa-f]{6})/g)].map(m => m[1].toUpperCase()));
  const off = [...new Set(svg.match(/#[0-9A-Fa-f]{3,8}\b/g) || [])].filter(c => !palette.has(c.toUpperCase()));
  if (off.length) err(`colours outside the Basohli palette: ${off.join(", ")}`);
  const widths = [...new Set([...svg.matchAll(/stroke-width="([^"]+)"/g)].map(m => m[1]))];
  if (widths.some(w => w !== "1.25")) err(`outline weights other than 1.25: ${widths.join(", ")}`);
  if (/<(linearGradient|radialGradient|filter)\b|\b(filter|transform)=/.test(svg)) err("gradients, filters or transforms; the sprites are flat fills");
  for (let n = 1; n <= TOP; n++) if (n !== GOAL && !svg.includes(`id="sq-${n}"`)) err(`no symbol for square ${n}`);
  for (const h of Object.keys(SNAKES)) if (HEAVEN[h] && !svg.includes(`id="sn-${h}"`)) err(`no symbol for the snake on square ${h}`);
  for (const id of Object.keys(CODEX.schools)) if (!svg.includes(`id="seal-${id}"`)) err(`no seal for ${id}`);
  return errors;
}

// Phase 5 paints the board's age and its cloth in the Basohli palette too: the ageing, camera and drone code
// names colours only as --b-* tokens, and the paper grain in styles.css floods with palette colours only.
export function lintPaint(root) {
  const errors = [], css = fs.readFileSync(path.join(root, "src/styles.css"), "utf8");
  const palette = new Set([...css.matchAll(/--b-[\w-]+:\s*(#[0-9A-Fa-f]{6})/g)].map(m => m[1].toUpperCase()));
  for (const f of ["src/render/age.js", "src/render/ground.js", "src/render/camera.js", "src/audio/drone.js", "src/render/frame.js"]) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    // ground.js holds the board's shipped printed colours, which predate the palette; anything after them must not
    const body = f.endsWith("ground.js") ? src.replace(/export const PALETTE[^\n]*\n|const HEAVEN_MID[^\n]*\n/g, "") : src;
    const hex = body.match(/#[0-9A-Fa-f]{6}\b/g);
    if (hex) errors.push(`${f}: colours written as hex (${[...new Set(hex)].join(", ")}); name a --b-* token`);
  }
  // the card's illuminated frame is painted from the tokens alone (REDESIGN.md Phase 6)
  for (const [, sel, body] of css.matchAll(/([^{}]*\.ill\b[^{}]*)\{([^}]*)\}/g)) {
    const hex = body.match(/#[0-9A-Fa-f]{3,8}\b/g);
    if (hex) errors.push(`styles.css: the frame (${sel.trim()}) is coloured in hex (${hex.join(", ")}); name a --b-* token`);
  }
  for (const [, uri] of css.matchAll(/url\("data:image\/svg\+xml,([^"]+)"\)/g)) {
    const off = [...new Set(decodeURIComponent(uri).match(/#[0-9A-Fa-f]{6}\b/g) || [])].filter(c => !palette.has(c.toUpperCase()));
    if (off.length) errors.push(`styles.css: paper grain uses colours outside the Basohli palette: ${off.join(", ")}`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { errors, warnings, moments } = lintReport();
  if (warnings.length) console.warn(warnings.map(w => "warning: " + w).join("\n"));
  console.log(momentsLine(moments));
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  console.log("content: ok");
}
