// The board's content, kept as data in content/*.json.
import squares from "../content/squares.json" with { type: "json" };
import strings from "../content/strings.json" with { type: "json" };
import readings from "../content/readings.json" with { type: "json" };
import codex from "../content/codex.json" with { type: "json" };
import names from "../content/names.json" with { type: "json" };

// Every square is { ic, en, hi, age, moment, mirror, callsBack, src } (docs/NARRATIVE.md §11). Snakes and
// ladders add { to, skt }. The mirror is the Phase 2 lead; the moment, when there is one, sits above it and
// says what is happening to the player, as { en, hi } with an optional mirror of its own to read after it.
export const { GOAL, ROWS, ASHRAMAS, LADDERS, SNAKES, HEAVEN, MOKSHA } = squares;
export const { SQ } = squares;
export const { STR, SRC_HI, JOINS } = strings;
// Names drawn for players who are not given one, each [en, hi], by gender.
export const PLAYER_NAMES = names.players;

// What each square adds when read more deeply (school lines, scholar notes, IAST, views), and the Codex.
export const READINGS = readings;
export const CODEX = codex;

// Square n's record, whichever table it lives in.
export const squareOf = n => (n === GOAL ? MOKSHA : LADDERS[n] || SNAKES[n] || HEAVEN[n] || SQ[n] || null);
// Square n's mirror (the Phase 2 lead) as [en, hi].
export const leadOf = n => { const m = squareOf(n)?.mirror; return m ? [m.en, m.hi] : null; };

// The citation on square n, if it has one.
export const srcOfSquare = n => squareOf(n)?.src || "";
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
