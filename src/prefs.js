// Per-viewer preferences, kept in localStorage. They apply at once, not at the next game.
//   depth   "story" | "school" | "scholar": how much each card says
//   everyCard  the full card on every landing; otherwise an ordinary square is told in a line under the board
//              (REDESIGN.md Phase 11). It replaces landAll, which nearly every saved copy holds as true.
//   both    show both languages on cards (for Hindi learners)
//   mute    no sound
const KEY = "mp-prefs";
const DEFAULTS = { depth: "school", everyCard: false, both: false, mute: false };

export const prefs = { ...DEFAULTS };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
delete prefs.landAll;
const q = new URLSearchParams(location.search).get("depth");
if (q === "story" || q === "school" || q === "scholar") prefs.depth = q;

export function setPref(k, v) {
  prefs[k] = v;
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {}
}

// Ids of codex entries this viewer has met, so the Codex fills in across games.
const SEEN = "mp-codex";
let seen = new Set();
try { seen = new Set(JSON.parse(localStorage.getItem(SEEN) || "[]")); } catch {}
export const hasMet = id => seen.has(id);
export function meet(ids) {
  const fresh = ids.filter(id => id && !seen.has(id));
  if (!fresh.length) return fresh;
  fresh.forEach(id => seen.add(id));
  try { localStorage.setItem(SEEN, JSON.stringify([...seen])); } catch {}
  return fresh;
}
export const metCount = ids => ids.filter(id => seen.has(id)).length;

// ---- The first life (REDESIGN.md Phase 11) ----
// A viewer's first life shows each card's moment alone, with the story behind one tap; how far they open it is
// remembered for the rest of that life. Lives are counted per viewer: one ends when the viewer's own life does (death,
// Moksha, the fall from Brahma) or when they start a new game after rolling. ?first treats the viewer as new for
// this page, and asks for a name, without touching what is stored, so a first-time player can be watched on a used
// device.
const LIVES = "mp-lives", FIRST = "mp-first", WHO = "mp-who";
export const freshViewer = new URLSearchParams(location.search).has("first");
const read = (k, d) => { if (freshViewer) return d; try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? d; } catch { return d; } };
const write = (k, v) => { if (freshViewer) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
// Someone who played before lives were counted (a name kept, or a Codex entry met) has lived one already; anyone
// else starts their first now, and it is written down so that a reload in the middle of it keeps it.
const played = () => { try { return !!(localStorage.getItem("mp-self") || localStorage.getItem(SEEN)); } catch { return false; } };
let lives = read(LIVES, null);
if (lives == null) { lives = !freshViewer && played() ? 1 : 0; write(LIVES, lives); }
let opened = read(FIRST, "moment"), who = new Set(read(WHO, []));
export const firstLife = () => !(lives > 0);
export const lifeLived = () => { lives = (lives || 0) + 1; opened = "moment"; write(LIVES, lives); write(FIRST, opened); };
// "moment" or "mirror": how far the reader has opened a card in the first life
export const firstOpened = () => opened;
export const openFirst = d => { opened = d; write(FIRST, d); };
// the people behind the mirrors this viewer has been told about (content/bridges.json), kept apart from the Codex
export const knowsWho = id => who.has(id);
export const meetWho = id => { if (!id || who.has(id)) return; who.add(id); write(WHO, [...who]); };
// mp.first(): this page treats the viewer as new from here on, as ?first does
export const beFirst = () => { lives = 0; opened = "moment"; who = new Set(); };
