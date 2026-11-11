// ---- Language ----
// The game runs in English or Hindi. Cards can show either language, or both, independently of the UI.
import { STR, SRC_HI, NUM_HI } from "./content.js";

export let lang = "en";
try { lang = localStorage.getItem("mp-lang") || lang; } catch {}
// read from the page's address when there is one, so the pure modules that use this file also run in node
export const urlLang = new URLSearchParams(globalThis.location?.search || "").get("lang");
if (urlLang === "en" || urlLang === "hi") lang = urlLang;
export const setLangValue = l => { lang = l; };

export const L = (en, hi) => (lang === "hi" ? hi : en);
const DEV_DIGITS = "०१२३४५६७८९";
export const numIn = (l, n) => (l === "hi" ? String(n).replace(/\d/g, d => DEV_DIGITS[d]) : String(n));
export const num = n => numIn(lang, n);
// Source names, for showing citations in Hindi.
// a citation keeps its Latin digits in Hindi, on every board: a reference is given as it is cited (Bhaskar, 3 Nov)
export const srcIn = (l, s) => (l === "hi" ? SRC_HI.reduce((a, [en, hi]) => a.replace(en, hi), s) : s);
export const srcText = s => srcIn(lang, s);
export const tIn = (l, k, v = {}) => (STR[l][k] ?? STR.en[k]).replace(/\{(\w+)\}/g, (m, x, at, all) => named(v[x] ?? "", l, all.slice(0, at), all.slice(at + m.length))).replace(/\d/g, d => numIn(l, d));
export const t = (k, v = {}) => tIn(lang, k, v);

// ---- An animal's life is named by its kind and its household, never by a person's name (reviewed 11 Nov) ----
// "The tortoise in Vikram's house" / "विक्रम के घर का कछुआ", or "the tortoise at the edge of a village" with no master.
// The English is kept with a capital, for a label, and said in lower case inside a sentence; the Hindi is said in its
// oblique form before a postposition (विक्रम के घर के कछुए ने), as a person's name needs none. named() does both, for
// the names animalNameIn has made: every other value is left exactly as it was.
const ANIMAL_F = new Set(["cat"]);
export const animalGender = kind => (ANIMAL_F.has(kind) ? "f" : "m");
const LOWER = new Map(), OBLIQUE = new Map();
const POST = /^\s*(ने|का|की|के|को|से|में|पर|तक)(?![\u0900-\u097F])/u;
function named(val, l, before, after) {
  if (typeof val !== "string") return val;
  if (LOWER.has(val) && !(before.trim() === "" || /[.!?:।]\s*$/u.test(before))) return LOWER.get(val);
  if (l === "hi" && OBLIQUE.has(val) && POST.test(after)) return OBLIQUE.get(val);
  return val;
}
export function animalNameIn(l, a) {
  const kind = a?.kind ?? "tortoise", master = a?.master?.[l] || a?.master?.en, gender = animalGender(kind);
  const k = master ? "animalName" : "animalNameNone", v = { master, animal: tIn(l, "a_" + kind), animalO: tIn(l, "ao_" + kind) };
  const say = key => fill(STR[l][key] ?? STR.en[key], { gender }).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "");
  const direct = say(k);
  const label = direct.charAt(0).toUpperCase() + direct.slice(1);
  if (label !== direct) LOWER.set(label, direct);
  if (l === "hi") OBLIQUE.set(label, say(k + "O"));
  return label;
}

// A bilingual {en, hi} field in language l. Missing Hindi falls back to English, with a warning once per text.
const warned = new Set();
export function pick(o, l = lang) {
  if (!o) return "";
  if (o[l]) return o[l];
  if (l !== "en" && o.en && !warned.has(o.en)) { warned.add(o.en); console.warn("Missing Hindi:", o.en); }
  return o.en || "";
}

// ---- Gender agreement (docs/NARRATIVE.md §4) ----
// Hindi verbs and adjectives agree with the subject, so a player carries a gender: "m", "f" or "n".
// g() returns the agreeing form; neutral falls back to masculine where no neutral form was written.
export const g = (gender, forms) => forms[gender] ?? forms.m;
// A card string filled in for one player: {name}, {age} as words, and {m|f} or {m|f|n} for each agreeing
// form. The choices go first, so a name with a | or a brace in it is never read as one.
export const fill = (text, { name = "", gender = "m", age = "" } = {}) =>
  text.replace(/\{([^{}|]*(?:\|[^{}|]*){1,2})\}/g, (_, alts) => { const [m, f, n] = alts.split("|"); return g(gender, { m, f, n }); })
    .replace(/\{age\}/g, () => age).replace(/\{name\}/g, (m, at, all) => named(name, /[\u0900-\u097F]/u.test(all) ? "hi" : "en", all.slice(0, at), all.slice(at + m.length)));

// ---- The cast (docs/NARRATIVE.md §13.3, REDESIGN.md Phase 10C) ----
// A moment names a member of the cast in two ways. {friend=the friend} is the friend by name once this life has met
// them, and until then the words after the "=" (which may hold {name}); a bare {friend} is the name alone.
// {friend:लेता|लेती} agrees with the friend's own gender, not the player's. people maps a role to { name, gender }:
// with no name the words stand, and with no gender the first form does, so a cast with nobody in it reads exactly as
// the moment was first written. "who" is whichever member a join or a closing line is about. This runs before fill():
// fill() would read {friend:लेता|लेती} as the player's choice.
export const CAST_ROLES = ["mother", "father", "teacher", "friend", "spouse", "child", "rival", "who"];
const CAST_AGREE = new RegExp(`\\{(${CAST_ROLES.join("|")}):([^{}|]*)\\|([^{}|]*)\\}`, "g");
const CAST_REF = new RegExp(`\\{(${CAST_ROLES.join("|")})(?:=((?:[^{}]|\\{name\\})*))?\\}`, "g");
export const castFill = (text, people = {}) =>
  text.replace(CAST_AGREE, (_, r, m, f) => (people[r]?.gender === "f" ? f : m)).replace(CAST_REF, (_, r, words = "") => people[r]?.name ?? words);

// ---- Numbers as words, for ages and years in prose ----
// English is composed; Hindi numbers to a hundred are irregular, so they come from strings.NUM_HI.
const ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const wordsEn = n => (n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "") : "a hundred" + (n % 100 ? " and " + wordsEn(n % 100) : ""));
const wordsHi = n => (n <= 100 ? NUM_HI[n] : "एक सौ " + NUM_HI[n - 100]);
export const wordsIn = (l, n) => (l === "hi" ? wordsHi(n) : wordsEn(n));
// How old the player is, as a moment says it: "fifty-one", or "still eighty-nine" when nothing has passed.
export const ageWordsIn = (l, n, still = false) => (still ? (l === "hi" ? "अब भी " : "still ") : "") + wordsIn(l, n);
