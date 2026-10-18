// Per-viewer preferences, kept in localStorage. They apply at once, not at the next game.
//   depth   "story" | "school" | "scholar": how much each card says
//   landAll open a card on every landing, or only on snakes, ladders and realms
//   both    show both languages on cards (for Hindi learners)
//   mute    no sound
const KEY = "mp-prefs";
const DEFAULTS = { depth: "school", landAll: true, both: false, mute: false };

export const prefs = { ...DEFAULTS };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
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
