// Shared mutable state for the page. gen changes on every new game, so animations from an
// abandoned turn stop where they are.
import { t, tIn, L, lang, animalNameIn } from "./i18n.js";
import { PLAYER_NAMES } from "./content.js";
import { createGame } from "./engine/turn.js";
import { freshSeed, makeRng, next } from "./rng.js";

export const G = { setup: null, state: null, busy: false, cpuTimer: null, gen: 0, forcedRoll: null, choosing: null, deciding: null };

// The name and gender given at the naming, remembered so the next game can offer them again.
const SELF = "mp-self";
export function loadSelf() {
  try { const s = JSON.parse(localStorage.getItem(SELF) || "null"); if (s && typeof s.name === "string") return s; } catch {}
  return null;
}
export function saveSelf(name, gender) {
  try { localStorage.setItem(SELF, JSON.stringify({ name, gender })); } catch {}
}

export const defaultSetup = () => {
  const self = loadSelf();
  return {
    count: 2,
    rows: [{ name: self?.name || "", type: "human", gender: self?.gender || "" }, { name: "", type: "cpu", gender: "" }, { name: "", type: "cpu", gender: "" }, { name: "", type: "cpu", gender: "" }],
    // me and a computer, played together (Phase 19: the default for any table of two or more seats)
    rules: { six: true, mode: "together", length: "free" },
  };
};

// A drawn name {en, hi, gender} from content/names.json, for the given gender or either, avoiding names
// already taken. rng is a sequence of its own, never the game's, so the dice stay the same.
export function drawName(rng, gender, taken = new Set()) {
  const pool = (gender === "m" || gender === "f" ? [gender] : ["m", "f"])
    .flatMap(gd => PLAYER_NAMES[gd].map(([en, hi]) => ({ en, hi, gender: gd })))
    .filter(nm => !taken.has(nm.en));
  return pool[Math.floor(next(rng) * pool.length)];
}

// Everyone left unnamed gets a drawn name, and a gender to go with it unless one was chosen.
// An animal's interlude draws no name (src/engine/turn.js createGame calls it by its kind and household).
export function cast(rows, seed, rules) {
  const rng = makeRng((seed ^ 0x9E3779B9) >>> 0), taken = new Set(rows.map(r => r.name.trim()).filter(Boolean));
  if (rules?.animal) return rows.map(r => ({ ...r }));
  return rows.map(r => {
    if (r.name.trim()) return { ...r, gender: r.gender || "n" };
    // a life born again (Phase 16) is not called by the last one's name, nor by any name its cast carries
    const nm = drawName(rng, r.gender, new Set([...taken, ...(r.avoid ?? [])])) ?? drawName(rng, r.gender, taken);
    taken.add(nm.en);
    return { ...r, gender: r.gender || nm.gender, alias: { en: nm.en, hi: nm.hi } };
  });
}

// an animal's life (Phase 16, and a seat's in a game played together) carries no person's name: it is called by its kind
// and its household, "the tortoise in Vikram's house" (animalNameIn in src/i18n.js)
export const pname = p => pnameIn(p, lang);
export const pnameIn = (p, l) => (p.animal ? animalNameIn(l, p.animal) : p.name || p.alias?.[l] || p.alias?.en || tIn(l, "def" + p.color));
export const cur = () => G.state.players[G.state.turn];

// rows, by default the setup's; a life born again (Phase 16) brings its own
export function newState(seed = freshSeed(), rows = G.setup.rows.slice(0, G.setup.count), rules = G.setup.rules) {
  return createGame({ players: cast(rows, seed, rules), rules, seed });
}
