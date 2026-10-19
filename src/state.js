// Shared mutable state for the page. gen changes on every new game, so animations from an
// abandoned turn stop where they are.
import { t, tIn, L } from "./i18n.js";
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
    rules: { six: true, brahmaloka: false },
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
export function cast(rows, seed) {
  const rng = makeRng((seed ^ 0x9E3779B9) >>> 0), taken = new Set(rows.map(r => r.name.trim()).filter(Boolean));
  return rows.map(r => {
    if (r.name.trim()) return { ...r, gender: r.gender || "n" };
    const nm = drawName(rng, r.gender, taken);
    taken.add(nm.en);
    return { ...r, gender: r.gender || nm.gender, alias: { en: nm.en, hi: nm.hi } };
  });
}

export const pname = p => p.name || (p.alias ? L(p.alias.en, p.alias.hi) : t("def" + p.color));
export const pnameIn = (p, l) => p.name || p.alias?.[l] || p.alias?.en || tIn(l, "def" + p.color);
export const cur = () => G.state.players[G.state.turn];

export function newState(seed = freshSeed()) {
  return createGame({ players: cast(G.setup.rows.slice(0, G.setup.count), seed), rules: G.setup.rules, seed });
}
