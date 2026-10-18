// Checks content/*.json: every string in both languages, every id pointing somewhere, every
// citation glossed, and no Codex entry that a reader could never meet.
//   node tools/lint-content.mjs
import { pathToFileURL } from "node:url";
import { GOAL, LADDERS, SNAKES, SQ, HEAVEN, STR, READINGS, CODEX, REFS, ENTRY_IDS, srcOfSquare, sourceOf } from "../src/content.js";

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
    if (n === GOAL) continue;
    if (sl) { bilingual(`square ${n} name`, sl); bilingual(`square ${n} story`, { en: sl.story[0], hi: sl.story[1] }); }
    else if (h) { bilingual(`square ${n} name`, h); bilingual(`square ${n} story`, { en: h.story[0], hi: h.story[1] }); }
    else if (q) { bilingual(`square ${n} name`, { en: q[1], hi: q[2] }); bilingual(`square ${n} story`, { en: q[3], hi: q[4] }); }
    else err(`square ${n}`, "has no content");
    const src = srcOfSquare(n);
    if (src && !sourceOf(src)) err(`square ${n}`, `citation "${src}" matches no Codex source`);
  }

  // readings: bilingual, and every school or person they name exists
  for (const [n, r] of Object.entries(READINGS)) {
    if (!(+n >= 1 && +n <= GOAL)) err(`readings.${n}`, "not a square");
    for (const [i, s] of (r.schools || []).entries()) { bilingual(`readings.${n}.schools[${i}]`, s); if (!CODEX.schools[s.id]) err(`readings.${n}.schools[${i}]`, `unknown school "${s.id}"`); }
    for (const [i, s] of (r.views || []).entries()) { bilingual(`readings.${n}.views[${i}]`, s); if (!CODEX.schools[s.id]) err(`readings.${n}.views[${i}]`, `unknown school "${s.id}"`); }
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

  // REFERENCE.md §6: the board's own history is medieval, not ancient
  const all = JSON.stringify([READINGS, CODEX, STR]);
  if (/\bancient\b/i.test(all)) err("content", 'says "ancient"; the board\'s history is medieval');

  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = lintContent();
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  console.log("content: ok");
}
