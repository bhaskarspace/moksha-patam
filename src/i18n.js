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
export const srcIn = (l, s) => (l === "hi" ? numIn(l, SRC_HI.reduce((a, [en, hi]) => a.replace(en, hi), s)) : s);
export const srcText = s => srcIn(lang, s);
export const tIn = (l, k, v = {}) => (STR[l][k] ?? STR.en[k]).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "").replace(/\d/g, d => numIn(l, d));
export const t = (k, v = {}) => tIn(lang, k, v);

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
    .replace(/\{age\}/g, () => age).replace(/\{name\}/g, () => name);

// ---- Numbers as words, for ages and years in prose ----
// English is composed; Hindi numbers to a hundred are irregular, so they come from strings.NUM_HI.
const ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const wordsEn = n => (n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "") : "a hundred" + (n % 100 ? " and " + wordsEn(n % 100) : ""));
const wordsHi = n => (n <= 100 ? NUM_HI[n] : "एक सौ " + NUM_HI[n - 100]);
export const wordsIn = (l, n) => (l === "hi" ? wordsHi(n) : wordsEn(n));
// How old the player is, as a moment says it: "fifty-one", or "still eighty-nine" when nothing has passed.
export const ageWordsIn = (l, n, still = false) => (still ? (l === "hi" ? "अब भी " : "still ") : "") + wordsIn(l, n);
