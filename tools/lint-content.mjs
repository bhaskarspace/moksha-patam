// Checks content/*.json: every string in both languages, every id pointing somewhere, every
// citation glossed, no Codex entry that a reader could never meet, and the card contract of
// docs/CONTENT.md §2: every lead line names someone, and every square has two voices to disagree.
//   node tools/lint-content.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { GOAL, LADDERS, SNAKES, SQ, HEAVEN, MOKSHA, STR, SRC_HI, READINGS, CODEX, REFS, ENTRY_IDS, srcOfSquare, sourceOf, leadOf } from "../src/content.js";
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

export function lintContent() {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const bilingual = (where, o) => {
    if (!o || typeof o !== "object") return err(where, "missing");
    if (!o.en?.trim()) err(where, "no English");
    if (!o.hi?.trim()) err(where, "no Hindi");
  };

  // UI strings: the same keys in both languages
  for (const k of Object.keys(STR.en)) if (!STR.hi[k]?.trim()) err(`strings.${k}`, "no Hindi");
  for (const k of Object.keys(STR.hi)) if (!STR.en[k]?.trim()) err(`strings.${k}`, "no English");

  // every square has a name and a story in both languages, and its citation is in the Codex
  for (let n = 1; n <= GOAL; n++) {
    const sl = LADDERS[n] || SNAKES[n], h = HEAVEN[n], q = SQ[n];
    const lead = leadOf(n);
    if (lead?.[0]) {
      const named = leadNames(lead);
      if (!named.en.length) err(`square ${n} lead`, "names nobody");
      else if (lead[1] && !named.hi) err(`square ${n} lead`, `the Hindi drops the name (${named.en.join(", ")})`);
    }
    if (n === GOAL) { bilingual(`square ${n} story`, { en: MOKSHA.story[0], hi: MOKSHA.story[1] }); if ((READINGS[n]?.views?.length || 0) < 2) err(`square ${n}`, "needs the schools' definitions of moksha in views"); continue; }
    if (sl) { bilingual(`square ${n} name`, sl); bilingual(`square ${n} story`, { en: sl.story[0], hi: sl.story[1] }); }
    else if (h) { bilingual(`square ${n} name`, h); bilingual(`square ${n} story`, { en: h.story[0], hi: h.story[1] }); }
    else if (q) { bilingual(`square ${n} name`, { en: q[1], hi: q[2] }); bilingual(`square ${n} story`, { en: q[3], hi: q[4] }); }
    else err(`square ${n}`, "has no content");
    const r = READINGS[n] || {}, voices = (r.schools?.length || 0) + (r.views?.length || 0);
    if (voices < 2) err(`square ${n}`, voices ? "one voice: a disagreement needs two schools in readings.json" : "no voice: needs two schools in readings.json");
    const src = srcOfSquare(n);
    if (src && !sourceOf(src)) err(`square ${n}`, `citation "${src}" matches no Codex source`);
    if (src && /[A-Za-z]/.test(SRC_HI.reduce((a, [en, hi]) => a.replace(en, hi), src))) err(`square ${n}`, `citation "${src}" has no Hindi in strings.SRC_HI`);
  }

  // readings: bilingual, and every school or person they name exists
  for (const [n, r] of Object.entries(READINGS)) {
    if (!(+n >= 1 && +n <= GOAL)) err(`readings.${n}`, "not a square");
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

  // REFERENCE.md §6: the board's own history is medieval, not ancient
  const all = JSON.stringify([READINGS, CODEX, STR]);
  if (/\bancient\b/i.test(all)) err("content", 'says "ancient"; the board\'s history is medieval');

  return errors;
}

export function lintSprites(svg, css) {
  const errors = [], err = msg => errors.push(`sprites.svg: ${msg}`);
  const palette = new Set([...css.matchAll(/--b-[\w-]+:\s*(#[0-9A-Fa-f]{6})/g)].map(m => m[1].toUpperCase()));
  const off = [...new Set(svg.match(/#[0-9A-Fa-f]{3,8}\b/g) || [])].filter(c => !palette.has(c.toUpperCase()));
  if (off.length) err(`colours outside the Basohli palette: ${off.join(", ")}`);
  const widths = [...new Set([...svg.matchAll(/stroke-width="([^"]+)"/g)].map(m => m[1]))];
  if (widths.some(w => w !== "1.25")) err(`outline weights other than 1.25: ${widths.join(", ")}`);
  if (/<(linearGradient|radialGradient|filter)\b|\b(filter|transform)=/.test(svg)) err("gradients, filters or transforms; the sprites are flat fills");
  for (let n = 1; n < GOAL; n++) if (!svg.includes(`id="sq-${n}"`)) err(`no symbol for square ${n}`);
  for (const id of Object.keys(CODEX.schools)) if (!svg.includes(`id="seal-${id}"`)) err(`no seal for ${id}`);
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = lintContent();
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  console.log("content: ok");
}
