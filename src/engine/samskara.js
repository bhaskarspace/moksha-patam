// ---- Saṃskāra: what a life leaves the next (REDESIGN.md Phase 16) ----
// After a death or the fall the next life carries the last, half-remembered. What is carried is small and kept in words
// only where the account says it: the guṇa mix, half of it; the unmet debts, sañcita, of which the heaviest is drawn as
// the next life's prārabdha (it ripens at the age it was made, and the door asks about it as about any debt); the vice
// the life was still holding, which the next life does not know why it is uneasy about (docs/NARRATIVE.md §13.6); the
// deed it dreams of (the Yogavāsiṣṭha: Lavaṇa, Gādhi); and the cast, whose names return in other roles (the Jātaka rule:
// the friend of one life the teacher of the next, src/engine/cast.js). A liberated life leaves nothing: it is not reborn.
// soulOf builds the record when a life ends; bornOf turns a record into what createGame gives the next life. A record
// that is missing, from another version or malformed gives a fresh life, as the game was before. Pure.
import { SITUATIONS, SNAKES } from "../content.js";
import { freshGunas } from "./self.js";
import { karmaOf, carried, seedOf } from "./karma.js";
import { worthOf, optionOf } from "./qbn.js";
import { castOf, MEMBERS } from "./cast.js";
import { pnameIn } from "../state.js";
import { interludeFor, animalEndOf, isAnimal, KINDS } from "./animal.js";
import { canChoose } from "./laws/index.js";

export const SOUL_V = 1, KEEP_DEBTS = 6;
// the roles whose names can return: the parents are never named
const NAMED = MEMBERS.filter(w => w !== "mother" && w !== "father");

// How a life ended, as the record keeps it, or null for one still going or let go.
export const endOf = (state, i) => {
  const p = state.players[i];
  // an animal interlude (src/engine/animal.js) ends at the forest's edge or short of it, and is never "let go"
  if (isAnimal(state)) return animalEndOf(p) && "animal";
  // a life let go is gone from the wheel; svarga (Mīmāṃsā's exit) lasts as long as its merit, and returns (Gītā 9.21)
  if (state.winner === i) return p.won === "svarga" ? "svarga" : null;
  if (p.dead) return p.death?.by ?? "years";
  if (p.fell) return p.fellBy === "snake" ? "siva" : "fell";
  return null;
};

// The game as it stood for the k-th life of seat i that Śiva's snake closed (Phase 17, p.past): the same table, with that
// life in the seat, so its book, its path and its mirror read as they did when it ended. state itself for k null.
export const pastOf = (state, i, k) => (k == null || !state.players[i]?.past?.[k] ? state : { ...state, winner: null, players: state.players.map((q, j) => (j === i ? q.past[k] : q)) });

// The record player i's ended life leaves, or null when it was let go or has not ended.
export function soulOf(state, i) {
  const p = state.players[i], end = endOf(state, i);
  if (!end || end === "animal") return null;
  const k = karmaOf(p), cast = castOf(state, i, p.prior?.lives ?? 0) ?? {};
  // the unmet debts, heaviest first, then the oldest; a few are enough to draw from
  const sancita = [...k.sancita, ...carried(k)].filter(s => seedOf(s.src, s.opt))
    .sort((a, b) => b.weight - a.weight || a.at - b.at).slice(0, KEEP_DEBTS)
    .map(({ src, opt, at, fuse, weight }) => ({ src, opt, at, fuse, weight }));
  // the deed it dreams of: the choice of most worth the life took, the latest of equals
  const dream = (p.witness ?? []).reduce((best, w) => {
    const o = optionOf(w.sq, w.took);
    return o?.dream && (!best || worthOf(o) >= best.worth) ? { sq: w.sq, opt: w.took, worth: worthOf(o) } : best;
  }, null);
  const rec = {
    v: SOUL_V,
    lives: (p.prior?.lives ?? 0) + 1,
    last: { name: { en: pnameIn(p, "en"), hi: pnameIn(p, "hi") }, gender: p.gender, end, age: Math.floor(p.years ?? 0),
      gunas: { ...(p.gunas ?? freshGunas()) }, peak: p.peak ?? null, holding: SNAKES[p.holding] ? p.holding : null },
    sancita,
    cast: NAMED.filter(w => cast[w]?.en).map(w => ({ role: w, gender: cast[w].gender, en: cast[w].en, hi: cast[w].hi })),
    dream: dream && { sq: dream.sq, opt: dream.opt },
    animal: null,
    // the law it lived under, offered first to the next (Phase 17)
    ...(p.law ? { law: p.law } : {}),
  };
  // a life the ledger ended is born an animal first (Phase 16's interlude), in the house of its rival or its friend
  if (end === "ledger") rec.animal = interludeFor(rec.last.holding, rec.cast);
  return rec;
}

const num = x => typeof x === "number" && Number.isFinite(x);
// Whether a stored record can be born from: the shape soulOf writes, and nothing that does not resolve on this board.
export function validSoul(s) {
  if (!s || s.v !== SOUL_V || !(s.lives >= 1) || !s.last || typeof s.last.name?.en !== "string") return false;
  const g = s.last.gunas;
  if (!g || !["s", "r", "t"].every(x => num(g[x]) && g[x] >= 0)) return false;
  if (s.animal != null && !(KINDS.includes(s.animal.kind) && (s.animal.round === 1 || s.animal.round === 2))) return false;
  return Array.isArray(s.sancita) && Array.isArray(s.cast);
}

// What the next life begins with, from a record: { gunas, karma, prior }, or null for a fresh life.
export function bornOf(soul) {
  if (!validSoul(soul)) return null;
  // the guṇas carry half: halfway from where every life begins toward where the last one ended
  const f = freshGunas(), g = soul.last.gunas, sum = g.s + g.r + g.t || 1;
  const half = Object.fromEntries(["s", "r", "t"].map(x => [x, f[x] + (g[x] / sum - f[x]) / 2]));
  // an interlude earned (src/engine/animal.js) nudges the next life a tenth of the way toward sattva
  const gunas = soul.nudge ? Object.fromEntries(["s", "r", "t"].map(x => [x, half[x] * 0.9 + (x === "s" ? 0.1 : 0)])) : half;
  const debts = soul.sancita.filter(s => seedOf(s.src, s.opt) && num(s.at) && num(s.fuse) && num(s.weight));
  // the slice of the store drawn as this life's prārabdha: the heaviest, made at the same age in the life before
  const [slice, ...rest] = debts;
  const cast = soul.cast.filter(c => NAMED.includes(c.role) && typeof c.en === "string" && typeof c.hi === "string");
  const holding = SNAKES[soul.last.holding] ? soul.last.holding : null;
  const dream = soul.dream && optionOf(soul.dream.sq, soul.dream.opt)?.dream ? soul.dream : null;
  return {
    gunas,
    ...(canChoose(soul.law) ? { law: soul.law } : {}),
    karma: { sancita: rest, agami: slice ? [{ ...slice, i: 0, prior: true }] : [], prarabdha: [] },
    prior: { lives: soul.lives, last: { ...soul.last, holding }, cast, dream, ...(KINDS.includes(soul.was) ? { was: soul.was } : {}) },
  };
}

// ---- The store (mp-samskara, src/prefs.js): { v, souls: { <nameKey>: record } }, the most recent last ----
// Kept per named person, at most KEEP_SOULS of them: a seventh pushes out whoever ended longest ago. Pure, so the tests
// run it; prefs.js only reads and writes it.
export const STORE_V = 1, KEEP_SOULS = 6;
// What was stored, as a store: anything missing, from another version or malformed is an empty one.
export function storeOf(raw) {
  if (!raw || raw.v !== STORE_V || !raw.souls || typeof raw.souls !== "object" || Array.isArray(raw.souls)) return { v: STORE_V, souls: {} };
  const keys = Object.keys(raw.souls).filter(k => k && validSoul(raw.souls[k])).slice(-KEEP_SOULS);
  return { v: STORE_V, souls: Object.fromEntries(keys.map(k => [k, raw.souls[k]])) };
}
// The store with key's record put last, or taken out when soul is null (a liberation leaves nothing).
export function storeWith(store, key, soul) {
  const souls = Object.entries(storeOf(store).souls).filter(([k]) => k !== key);
  if (soul && key) souls.push([key, soul]);
  return { v: STORE_V, souls: Object.fromEntries(souls.slice(-KEEP_SOULS)) };
}

// The situations a dream can be of, for the lint: every option carries one
export const dreamable = () => Object.entries(SITUATIONS).flatMap(([n, s]) => s.options.map(o => [+n, o]));
