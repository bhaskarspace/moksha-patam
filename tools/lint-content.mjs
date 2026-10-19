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
import { GOAL, TOP, ASHRAMAS, LADDERS, SNAKES, SQ, HEAVEN, STR, SRC_HI, JOINS, READINGS, CODEX, REFS, ENTRY_IDS, srcOfSquare, sourceOf, leadOf, squareOf } from "../src/content.js";
import NAMES from "../content/names.json" with { type: "json" };

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
// The moment's placeholders: {name}, or two or three choices for g().
const badSlots = text => [...text.matchAll(/\{([^{}]*)\}/g)].map(m => m[1]).filter(x => x !== "name" && !/^[^|]+\|[^|]+(\|[^|]+)?$/.test(x));

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

  // the joining phrases of the life account
  for (const [i, j] of JOINS.then.entries()) bilingual(`strings.JOINS.then[${i}]`, j);
  bilingual("strings.JOINS.snake", JOINS.snake); bilingual("strings.JOINS.ladder", JOINS.ladder);

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
    playerText(where, m);
    if (m.mirror) { bilingual(`${where} mirror`, m.mirror); if (m.mirror.en) lintLead(`${where} mirror`, [m.mirror.en, m.mirror.hi]); }
    // §2: the mirror attaches to the moment; the Phase 2 opener is the thing being replaced
    const mirrorEn = (m.mirror || q.mirror).en;
    if (/^In (the )?\p{Lu}/u.test(mirrorEn)) err(where, `the mirror opens "${mirrorEn.split(" ").slice(0, 3).join(" ")}…", the Phase 2 voice; open with a connective (docs/NARRATIVE.md §2)`);
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
