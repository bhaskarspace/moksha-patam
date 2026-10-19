// The board's content, kept as data in content/*.json.
import squares from "../content/squares.json" with { type: "json" };
import strings from "../content/strings.json" with { type: "json" };
import readings from "../content/readings.json" with { type: "json" };
import codex from "../content/codex.json" with { type: "json" };
import names from "../content/names.json" with { type: "json" };
import situations from "../content/situations.json" with { type: "json" };

// Every square is { ic, en, hi, age, moment, mirror, callsBack, src } (docs/NARRATIVE.md §11). Snakes and
// ladders add { to, skt }. The mirror is the Phase 2 lead; the moment, when there is one, sits above it and
// says what is happening to the player, as { en, hi } with an optional mirror of its own to read after it.
// GOAL is the exit, where a life is let go; TOP is the last square of the board, where a roll turns back.
export const { GOAL, TOP, ROWS, ASHRAMAS, LADDERS, SNAKES, HEAVEN, MOKSHA } = squares;
export const { SQ } = squares;
export const { STR, SRC_HI, JOINS, NUM_HI } = strings;
// The situations (REDESIGN.md Phase 10, §2.5): a square where the player chooses, by square number. Read through
// src/engine/qbn.js; a square without one is its story card, as before.
export const SITUATIONS = situations;
// Names drawn for players who are not given one, each [en, hi], by gender.
export const PLAYER_NAMES = names.players;

// What each square adds when read more deeply (school lines, scholar notes, IAST, views), and the Codex.
export const READINGS = readings;
export const CODEX = codex;

// Square n's record, whichever table it lives in.
// A god's square stays the god's even when a snake starts on it (108, merit spent): heaven comes first.
export const squareOf = n => (n === GOAL ? MOKSHA : HEAVEN[n] || LADDERS[n] || SNAKES[n] || SQ[n] || null);
// The snake that starts on a god's square, which the square's card shows after the god.
export const snakeOn = n => (HEAVEN[n] && SNAKES[n]) || null;
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
  for (let n = 1; n <= TOP; n++) {
    const r = READINGS[n] || {};
    add(sourceOf(srcOfSquare(n)), n);
    const sn = snakeOn(n);
    if (sn) add(sourceOf(sn.src), n);
    for (const s of [...(r.schools || []), ...(r.views || []), ...(r.beyond || []), ...(sn?.schools || [])]) add(s.id, n);
    (r.figures || []).forEach(id => add(id, n));
  }
  return Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, [...v].sort((a, b) => a - b)]));
})();
