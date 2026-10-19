// Small shared helpers for the page.
export const COLORS = ["var(--p0)", "var(--p1)", "var(--p2)", "var(--p3)"];
export const P_HEX = ["#C0392B", "#2E5BBA", "#2E8B57", "#D98300"];
export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
// "low" draws less: no camera, no motion extras, no paper grain, two strings in the drone. Set by ?quality=low|high,
// else by a small device (Safari reports few cores even on fast phones, so cores alone decide nothing), and
// lowered at run time if the first moves drop frames (main.js).
const qp = new URLSearchParams(location.search).get("quality");
export let quality = qp === "low" || qp === "high" ? qp : navigator.deviceMemory <= 2 || navigator.hardwareConcurrency <= 2 ? "low" : "high";
export const forcedQuality = qp === "low" || qp === "high";
export function setQuality(q) {
  quality = q;
  document.documentElement.classList.toggle("plain", q === "low");
}
setQuality(quality);
export const sleep = ms => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 60) : ms));
export const $ = id => document.getElementById(id);
// A symbol from the inlined Basohli sprite sheet (assets/sprites.svg), or the fallback when the
// sheet or that symbol is missing, so a square is never blank.
export const art = (id, fallback, cls = "spr") =>
  document.getElementById(id) ? `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>` : fallback;
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
