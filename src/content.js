// The board's content, kept as data in content/*.json.
import squares from "../content/squares.json" with { type: "json" };
import strings from "../content/strings.json" with { type: "json" };
import readings from "../content/readings.json" with { type: "json" };
import codex from "../content/codex.json" with { type: "json" };

// Base/head → { to, ic, en, hi, skt, story: [en, hi], src }
export const { GOAL, ROWS, ASHRAMAS, LADDERS, SNAKES, HEAVEN, MOKSHA } = squares;
// Every other earthly square: [symbol, en, hi, story en, story hi, source].
export const { SQ } = squares;
export const { STR, SRC_HI } = strings;

// What each square adds when read more deeply (school lines, scholar notes, IAST, views), and the Codex.
export const READINGS = readings;
export const CODEX = codex;

// Square n's lead line as [en, hi], whichever table it lives in.
export const leadOf = n => n === GOAL ? MOKSHA.story : (LADDERS[n] || SNAKES[n] || HEAVEN[n])?.story || (SQ[n] ? [SQ[n][3], SQ[n][4]] : null);

// The citation on square n, if it has one.
export const srcOfSquare = n => (LADDERS[n] || SNAKES[n] || HEAVEN[n])?.src || SQ[n]?.[5] || "";
// The Codex source a citation belongs to: "Chandogya Upanishad 6.13" → "chandogya".
export const sourceOf = src => (src ? Object.keys(CODEX.sources).find(id => src.startsWith(CODEX.sources[id].match)) ?? null : null);

export const ENTRY_GROUPS = [["school", "schools"], ["source", "sources"], ["figure", "figures"]];
export const ENTRY_IDS = ENTRY_GROUPS.flatMap(([, g]) => Object.keys(CODEX[g]));
export function entryOf(id) {
  for (const [kind, g] of ENTRY_GROUPS) if (CODEX[g][id]) return { kind, e: CODEX[g][id] };
  return null;
}

// Which squares mention each Codex entry, so an entry can list where it appears on the board.
export const REFS = (() => {
  const refs = {};
  const add = (id, n) => { if (id) (refs[id] ||= new Set()).add(n); };
  for (let n = 1; n <= GOAL; n++) {
    const r = READINGS[n] || {};
    add(sourceOf(srcOfSquare(n)), n);
    for (const s of [...(r.schools || []), ...(r.views || []), ...(r.beyond || [])]) add(s.id, n);
    (r.figures || []).forEach(id => add(id, n));
  }
  return Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, [...v].sort((a, b) => a - b)]));
})();
