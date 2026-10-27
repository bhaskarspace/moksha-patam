// The board's content, kept as data in content/*.json.
import squares from "../content/squares.json" with { type: "json" };
import strings from "../content/strings.json" with { type: "json" };
import readings from "../content/readings.json" with { type: "json" };
import codex from "../content/codex.json" with { type: "json" };
import names from "../content/names.json" with { type: "json" };
import situations from "../content/situations.json" with { type: "json" };
import bridges from "../content/bridges.json" with { type: "json" };
import boards from "../content/boards.json" with { type: "json" };
import door from "../content/door.json" with { type: "json" };
import curses from "../content/curses.json" with { type: "json" };

// Every square is { ic, en, hi, age, moment, mirror, callsBack, src } (docs/NARRATIVE.md §11). Snakes and
// ladders add { to, skt }. The mirror is the Phase 2 lead; the moment, when there is one, sits above it and
// says what is happening to the player, as { en, hi } with an optional mirror of its own to read after it.
// GOAL is the exit, where a life is let go; TOP is the last square of the board, the board's extent: the throw past it
// is the fall (REDESIGN.md Phase 12), whose card is FALL.
export const { GOAL, TOP, ROWS, ASHRAMAS, LADDERS, SNAKES, HEAVEN, MOKSHA, FALL } = squares;
export const { SQ } = squares;
export const { STR, SRC_HI, JOINS, NUM_HI } = strings;
// What the account says about the cast: introductions, the returns join and the fate lines (src/engine/cast.js).
export const CAST_WORDS = strings.CAST;
// the ego rebellion's mirror and scholar note (REDESIGN.md Phase 15)
export const EGO = strings.EGO;
// The situations (REDESIGN.md Phase 10, §2.5): a square where the player chooses, by square number. Read through
// src/engine/qbn.js; a square without one is its story card, as before.
export const SITUATIONS = situations;
// Names drawn for players who are not given one, each [en, hi], by gender.
export const PLAYER_NAMES = names.players;
// The cast's names (REDESIGN.md Phase 10C), { m, f, either }, each [en, hi]. Read live through CAST.names so a tool or
// a test can take them away, as sim --roll=off takes the roll moments: with none, nobody is named and every account
// reads exactly as Phase 10 wrote it.
export const CAST = { names: names.cast || null };
// The door at 105 as an examination (REDESIGN.md Phase 14): the Yakṣa's question for each vice a debt holds, and the
// ladder whose climb answers it. Read through src/engine/karma.js.
export const DOOR = door.questions;
// The curses (REDESIGN.md Phase 14, docs/NARRATIVE.md §13.6): one is drawn per life, spoken early, and closed in the account.
// Read live through CURSES.list so a tool or a test can take them away, as CAST.names is.
export const CURSES = { list: curses.curses || null };

// The board's look (REDESIGN.md Phase 13): its palette (the --b-* tokens, written into styles.css by the build), the
// grounds of each band, the divine row's gold, the snakes' and the ladders' pigments, its border and its superstructure.
// Content, not code, so another board (Phase 17) is another entry.
export const BOARDS = boards;
export const BOARD = boards["110"];
// The --b-* custom properties of a board's palette, as CSS declarations.
export const paletteCss = (b = BOARD) => Object.entries(b.palette).map(([k, v]) => `--b-${k}: ${v};`).join(" ");
// A board's palette as { "--b-name": "#hex" }, for the lint and the tests.
export const paletteTokens = (b = BOARD) => Object.fromEntries(Object.entries(b.palette).map(([k, v]) => [`--b-${k}`, v]));

// What each square adds when read more deeply (school lines, scholar notes, IAST, views), and the Codex.
export const READINGS = readings;
export const CODEX = codex;

// Square n's record, whichever table it lives in.
export const squareOf = n => (n === GOAL ? MOKSHA : HEAVEN[n] || LADDERS[n] || SNAKES[n] || SQ[n] || null);
// The fall, which the top square's card shows after its god: merit spent, the throw past the top (REDESIGN.md Phase 12).
// Until Phase 12 it was the Brahma snake, 108 to 1.
export const fallOn = n => (n === TOP ? FALL : null);
// Square n's mirror (the Phase 2 lead) as [en, hi].
export const leadOf = n => { const m = squareOf(n)?.mirror; return m ? [m.en, m.hi] : null; };

// ---- Who a mirror is about (REDESIGN.md Phase 11) ----
// A cold reader is told, the first time a mirror names someone, that it is a story and who is in it: one bridge per
// figure in content/bridges.json, keyed by Codex id, or by the first English form in content/names.json. The figure
// is the mirror's own `who` when it says one, and otherwise whoever it names first; on a tie the longer name wins
// ("Vishnu Sharma" over "Vishnu"), then the Codex.
export const BRIDGES = bridges.bridges, BRIDGE_SAME = bridges.same || {};
const fold = s => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
// Every name, folded, to who it names. Names are one or two words of letters, so a mirror is read as its runs of
// letters and each run, alone and with the next, looked up: the same as matching each name between word boundaries,
// and quick enough to do on every card.
const WHO_FORMS = new Map();
for (const [codexed, list] of [
  [1, ["figures", "schools", "sources"].flatMap(g => Object.entries(codex[g]).map(([id, e]) => ({ id, forms: [e.name.en, ...(e.iast ? e.iast.split(" · ") : [])] })))],
  [0, Object.values(names).filter(Array.isArray).flat().map(e => ({ id: e.en[0], forms: e.en }))],
]) for (const { id, forms } of list) for (const f of forms) {
  const k = fold(f);
  if (!WHO_FORMS.has(k)) WHO_FORMS.set(k, []);
  WHO_FORMS.get(k).push({ id, codex: codexed, len: f.length });
}
const whoSeen = new WeakMap();
export function whoOf(mirror) {
  if (!mirror?.en) return null;
  if (mirror.who) return mirror.who;
  if (whoSeen.has(mirror)) return whoSeen.get(mirror);
  const text = fold(mirror.en), words = [...text.matchAll(/\p{L}+/gu)];
  let best = null;
  for (let w = 0; w < words.length && !best; w++) for (const k of [2, 1]) {
    const last = words[w + k - 1];
    if (!last || (k === 2 && text.slice(words[w].index + words[w][0].length, last.index) !== " ")) continue;
    for (const e of WHO_FORMS.get(text.slice(words[w].index, last.index + last[0].length)) || [])
      if (!best || e.len > best.len || (e.len === best.len && e.codex > best.codex)) best = e;
  }
  whoSeen.set(mirror, best?.id ?? null);
  return best?.id ?? null;
}
// The bridge a mirror is told with, as { id, en, hi }, the id being the one first contact is kept by; or null.
export function bridgeOf(mirror) {
  const who = whoOf(mirror), id = BRIDGE_SAME[who] ?? who;
  return id && BRIDGES[id] ? { id, ...BRIDGES[id] } : null;
}

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
    const sn = fallOn(n);
    if (sn) add(sourceOf(sn.src), n);
    for (const s of [...(r.schools || []), ...(r.views || []), ...(r.beyond || []), ...(sn?.schools || [])]) add(s.id, n);
    (r.figures || []).forEach(id => add(id, n));
  }
  return Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, [...v].sort((a, b) => a - b)]));
})();
