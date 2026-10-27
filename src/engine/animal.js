// ---- The animal interlude (REDESIGN.md Phase 16) ----
// A life the ledger ended (a death by ledger, src/engine/karma.js) is not born human at once: it is born an animal, the
// Panchatantra creature of the vice it was still holding, for a short interlude (Chāndogya 5.10.8's animal births, never
// a ranking of human ones). One law, rules.law = "animal", read in src/engine/turn.js: the board is squares 1 to 40, one
// die, at most ANIMAL_TURNS throws; no omen, no situation, no planting, no curse. Reaching the edge of the forest (square
// 40, or a ladder past it) earns the human birth back, with a nudge toward sattva and a dream of the animal; falling
// short means an animal once more, and after that human regardless: the interlude never becomes a trap. The master is
// the rival from the life before, or else the friend (the Jātaka rule, src/engine/cast.js). Pure.
import { squareOf, SQ } from "../content.js";
import { tIn, fill } from "../i18n.js";
import { pnameIn } from "../state.js";

export const ANIMAL_TOP = 40, ANIMAL_TURNS = 15;
export const KINDS = ["tortoise", "jackal", "mongoose", "cat", "lion"];
// the vice held, by its snake's head, and the creature of its fable: the tortoise that talked (14), the blue jackal (19)
// and the jackal of the change (55), the mongoose killed in anger (59), the cat that played the ascetic (88), the lion
// that leapt at itself (39). Anything else is the tortoise.
const BY_HOLDING = { 14: "tortoise", 19: "jackal", 55: "jackal", 59: "mongoose", 88: "cat", 39: "lion" };
export const animalOf = holding => BY_HOLDING[holding] ?? "tortoise";
// the squares of 1 to 40 whose Panchatantra mirror is told as the moment while the life is an animal
export const TALES = [6, 8, 9, 11, 12, 13, 14, 15, 16, 19, 22, 24, 39];
// the fables that are the animal's own: on these it knows the story without being told
const OWN = { tortoise: [6, 8, 14, 15], jackal: [11, 19], lion: [12, 22, 24, 39] };
export const ownTale = (kind, n) => !!OWN[kind]?.includes(n);
// the rival of the life before, or else the friend, whose house the animal is born into
export const masterOf = cast => (cast ?? []).find(c => c.role === "rival") ?? (cast ?? []).find(c => c.role === "friend") ?? null;

// The interlude a soul is owed: { kind, master, round }, from a death by ledger.
export const interludeFor = (holding, cast) => ({ kind: animalOf(holding), master: masterOf(cast), round: 1 });

// The rules of an interlude's game.
export const animalRules = (animal, rules = {}) => ({ ...rules, six: false, law: "animal", animal });
export const isAnimal = state => state?.rules?.law === "animal";

// What the soul is after the interlude: earned, the next birth is human, nudged toward sattva and dreaming of the animal;
// short in the first round, an animal once more; short in the second, human regardless.
export function afterAnimal(soul, earned) {
  const a = soul?.animal;
  if (!a) return soul;
  if (!earned && a.round < 2) return { ...soul, animal: { ...a, round: 2 } };
  return { ...soul, animal: null, was: a.kind, ...(earned ? { nudge: true } : {}) };
}

// How an interlude ended for player i: "human" (earned), "short", or null while it goes on.
export const animalEndOf = p => (p.earned ? "human" : p.short ? "short" : null);

// The interlude's account, in the shape lifeOf returns (src/engine/account.js): who was born what, into whose house; the
// fables met, each told once, as the moment; and how it ended. No ages, no numbers: an animal does not count years.
export function animalLifeOf(state, i, l) {
  const p = state.players[i], a = state.rules.animal ?? {}, kind = a.kind ?? "tortoise", name = pnameIn(p, l);
  const T = (k, v = {}) => fill(tIn(l, k, { name, animal: tIn(l, "a_" + kind), animalO: tIn(l, "ao_" + kind), ...v }), { name, gender: p.gender });
  const master = a.master?.[l] || a.master?.en;
  const told = [], seen = new Set();
  let known = false;
  for (const n of p.life ?? []) {
    if (!TALES.includes(n) || seen.has(n)) continue;
    seen.add(n);
    const m = squareOf(n)?.mirror ?? SQ[n]?.mirror;
    if (m) told.push(m[l] || m.en);
    // said once, at the first of its own fables
    if (ownTale(kind, n) && !known) { known = true; told.push(T("animalOwn")); }
  }
  const end = animalEndOf(p);
  return {
    title: T("animalTitle"),
    sub: "",
    open: master ? T("animalOpen", { master }) : T("animalOpenNone"),
    paras: told.length ? [{ head: T("animalHead"), text: told.join(" ") }] : [],
    end: end === "human" ? T("animalEndHuman") : end === "short" ? T(a.round >= 2 ? "animalEndLast" : "animalEndShort") : "",
    curse: "",
    fates: [],
  };
}
