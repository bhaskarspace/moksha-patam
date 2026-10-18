// Small shared helpers for the page.
export const COLORS = ["var(--p0)", "var(--p1)", "var(--p2)", "var(--p3)"];
export const P_HEX = ["#C0392B", "#2E5BBA", "#2E8B57", "#D98300"];
export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const sleep = ms => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 60) : ms));
export const $ = id => document.getElementById(id);
// A symbol from the inlined Basohli sprite sheet (assets/sprites.svg), or the fallback when the
// sheet or that symbol is missing, so a square is never blank.
export const art = (id, fallback, cls = "spr") =>
  document.getElementById(id) ? `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>` : fallback;
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
