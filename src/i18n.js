// ---- Language ----
// The game runs in English or Hindi; story cards always show both.
import { STR, SRC_HI } from "./content.js";

export let lang = "en";
try { lang = localStorage.getItem("mp-lang") || lang; } catch {}
export const urlLang = new URLSearchParams(location.search).get("lang");
if (urlLang === "en" || urlLang === "hi") lang = urlLang;
export const setLangValue = l => { lang = l; };

export const L = (en, hi) => (lang === "hi" ? hi : en);
const DEV_DIGITS = "०१२३४५६७८९";
export const num = n => (lang === "hi" ? String(n).replace(/\d/g, d => DEV_DIGITS[d]) : String(n));
// Source names, for showing citations in Hindi.
export const srcText = s => (lang === "hi" ? num(SRC_HI.reduce((a, [en, hi]) => a.replace(en, hi), s)) : s);
export const t = (k, v = {}) => STR[lang][k].replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "").replace(/\d/g, d => num(d));
