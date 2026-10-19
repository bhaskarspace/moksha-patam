// ---- Below 768px the card is a bottom sheet over the board (REDESIGN.md Phase 6) ----
// Two heights: half, measured so the whole board shows above it, and full. The sheet moves only when a gesture
// can't be a scroll, and that is decided when the touch starts and kept until it ends: from the header strip or the
// footer it always drags; from the text, down drags only if the text was at its top when the touch began, and a
// scroll never turns into a drag partway through. Up from the text always scrolls. The grip is also a button, and
// the × stays, so nothing here needs a gesture.
import { $ } from "../ui.js";

const narrow = matchMedia("(max-width: 767px)");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const dlg = $("folio"), leaf = $("leaf");
export const sheetOn = () => narrow.matches;

let detent = "half", heights = { half: 0, full: 0 }, saved = null, on = false;
let closer = () => {};
export const onSheetClose = fn => (closer = fn);
export const sheetState = () => (on && dlg.open ? { detent, height: Math.round(dlg.getBoundingClientRect().height), ...heights } : null);

const board = () => document.querySelector(".board-wrap");

// The heights are fixed in pixels when the sheet opens and on resize, never live dvh, so a toolbar sliding
// away mid-drag doesn't make the sheet jump.
export function measure() {
  if (!on) return;
  const vh = innerHeight, b = board()?.getBoundingClientRect().height ?? vh / 2;
  const full = vh - 24; // styles.css also keeps it under the notch
  heights = { half: Math.min(full, Math.round(Math.min(vh * 0.62, Math.max(vh * 0.45, vh - b - 16)))), full };
  set(heights[detent]);
}
const set = h => dlg.style.setProperty("--sheet-h", h + "px");

export function setDetent(d) {
  if (!on) return;
  detent = d;
  snap(() => set(heights[d]));
  leaf.querySelector(".grip")?.setAttribute("aria-expanded", String(d === "full"));
}
export const toggleDetent = () => setDetent(detent === "full" ? "half" : "full");
export const sheetDetent = () => detent;

// Before the sheet opens: the board goes to the top of the screen, so all of it shows above the half sheet.
export function sheetBefore() {
  on = true; detent = "half";
  saved = scrollY;
  const b = board();
  if (b) scrollTo({ top: Math.max(0, b.getBoundingClientRect().top + scrollY - 8), behavior: "instant" });
}
export function sheetIn() {
  measure();
  if (still.matches) return;
  return dlg.animate([{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 260, easing: "cubic-bezier(.2,.8,.25,1)" }).finished.catch(() => {});
}
// slides out from wherever a drag left it
export function sheetOut() {
  if (still.matches) return;
  const from = dlg.style.transform || "none";
  return dlg.animate([{ transform: from }, { transform: "translateY(100%)" }], { duration: 200, easing: "ease-in", fill: "forwards" }).finished.catch(() => {});
}
export function sheetAfter() {
  if (!on) return;
  on = false;
  dlg.getAnimations().forEach(a => a.cancel());
  dlg.style.transform = ""; dlg.style.removeProperty("--sheet-h");
  if (saved != null) scrollTo({ top: saved, behavior: "instant" });
  saved = null;
}

// a settle after a release, instant under reduced motion
function snap(fn) {
  if (still.matches) return fn();
  dlg.classList.add("snap");
  fn();
  setTimeout(() => dlg.classList.remove("snap"), 220);
}

let g = null;
leaf.addEventListener("touchstart", e => {
  if (!on || !sheetOn() || e.touches.length !== 1) return (g = null);
  const t = e.touches[0], body = leaf.querySelector(".leaf-main");
  const inBody = !!body?.contains(e.target);
  g = { x0: t.clientX, y0: t.clientY, dy: 0, inBody, atTop: !inBody || body.scrollTop <= 0, mode: null, y: t.clientY, t: e.timeStamp, v: 0, h: dlg.getBoundingClientRect().height };
}, { passive: true });

leaf.addEventListener("touchmove", e => {
  if (!g) return;
  const t = e.touches[0], dx = t.clientX - g.x0, dy = t.clientY - g.y0;
  if (!g.mode) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    if (Math.abs(dx) > Math.abs(dy)) return (g = null);
    g.mode = !g.inBody || (dy > 0 && g.atTop) ? "sheet" : "scroll";
  }
  if (g.mode === "scroll") return;
  e.preventDefault();
  const dt = e.timeStamp - g.t;
  if (dt > 0) g.v = (t.clientY - g.y) / dt;
  g.y = t.clientY; g.t = e.timeStamp; g.dy = dy;
  if (dy >= 0) { set(heights[detent]); dlg.style.transform = `translateY(${dy}px)`; }
  else { dlg.style.transform = ""; set(Math.min(heights.full, heights[detent] - dy)); }
}, { passive: false });

function release() {
  if (!g || g.mode !== "sheet") return (g = null);
  const { dy, v, h } = g;
  g = null;
  if (dy > 0 && (dy > h * 0.3 || v > 0.5)) return closer();
  const next = dy < -60 ? "full" : dy > 80 && detent === "full" ? "half" : detent;
  snap(() => { dlg.style.transform = ""; });
  setDetent(next);
}
leaf.addEventListener("touchend", release);
leaf.addEventListener("touchcancel", release);

addEventListener("resize", measure);
narrow.addEventListener("change", () => { if (!sheetOn()) { dlg.style.transform = ""; } else measure(); });
