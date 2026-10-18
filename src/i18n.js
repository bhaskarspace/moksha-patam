// ---- Language ----
// The game runs in English or Hindi. Cards can show either language, or both, independently of the UI.
import { STR, SRC_HI } from "./content.js";

export let lang = "en";
try { lang = localStorage.getItem("mp-lang") || lang; } catch {}
export const urlLang = new URLSearchParams(location.search).get("lang");
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
// A card string filled in for one player: {name}, and {m|f} or {m|f|n} for each agreeing form.
// The choices go first, so a name with a | or a brace in it is never read as one.
export const fill = (text, { name = "", gender = "m" } = {}) =>
  text.replace(/\{([^{}|]*(?:\|[^{}|]*){1,2})\}/g, (_, alts) => { const [m, f, n] = alts.split("|"); return g(gender, { m, f, n }); })
    .replace(/\{name\}/g, () => name);
