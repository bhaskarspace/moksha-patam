// ---- Pixel-art characters, one per stage of life (12 x 16, facing right) ----
import { GOAL, squareOf } from "../content.js";
import { L } from "../i18n.js";
import { P_HEX } from "../ui.js";
import { ART, STAGES, PAL, ANIMALS, artOf, framesOf, stageHi } from "./art.js";
import { groundOf } from "./ground.js";

export { ART, STAGES } from "./art.js";
// stageOf(player), or stageOf(pos) for a square alone
export function stageOf(p) {
  const pos = typeof p === "number" ? p : p.pos;
  if (pos > 100) return STAGES.length - 1;
  // never younger than the square: they agree in play, and differ only for a token moved by hand
  const years = Math.max(typeof p === "number" ? 0 : p.years ?? 0, squareOf(Math.max(pos, 1)).age);
  return STAGES.findIndex(s => s.max > 100 || years <= squareOf(s.max).age);
}
export const stageName = (i, gender) => L(STAGES[i].en, stageHi(STAGES[i], gender));

const spriteCache = new Map();
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * (1 + f)));
  return "#" + ch.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}
// frame: 0/1 walking, 2/3 climbing (seen from behind); gender "f", "n" or else male; animal, a kind from
// src/engine/animal.js, draws the interlude's creature instead of the stage's figure.
export function spriteURL(stage, color, frame, gender = "m", animal = null) {
  const key = `${stage}|${color}|${frame}|${gender}|${animal ?? ""}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const rows = framesOf(animal && ART[animal] ? ART[animal] : artOf(STAGES[stage].art, gender), frame);
  const pal = { ...PAL, C: P_HEX[color], c: shade(P_HEX[color], -0.35) };
  const cv = document.createElement("canvas"); cv.width = 12; cv.height = 16;
  const c = cv.getContext("2d");
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { c.fillStyle = pal[ch]; c.fillRect(x, y, 1, 1); } }));
  const url = `url(${cv.toDataURL()})`;
  spriteCache.set(key, url);
  return url;
}

// ---- mp.sprites() under ?debug: every figure side by side ----
// Each stage by gender (male, female, neutral) and the interlude's animals, in all four colours, walking and climbing,
// each on the ground of every band of the board, so the art can be looked over before it ships. Returns the data URLs.
const BAND_SQUARES = [1, 21, 41, 61, 81, 101, GOAL];
export function spriteSheet() {
  document.getElementById("mpSprites")?.remove();
  const urls = {}, cell = (url, ground) => `<span style="display:inline-block;background:${ground};padding:2px;margin:1px"><span style="display:block;width:48px;height:64px;background:${url} 0 0/100% 100%;image-rendering:pixelated"></span></span>`;
  const row = (label, key, make) => {
    urls[key] = [0, 1, 2, 3].map(f => [0, 1, 2, 3].map(color => make(color, f)));
    const frames = [0, 1, 2, 3].map(f => cell(urls[key][f][0], groundOf(BAND_SQUARES[f + 1])[0])).join("");
    const colours = [1, 2, 3].map(color => cell(urls[key][0][color], groundOf(BAND_SQUARES[0])[0])).join("");
    const grounds = BAND_SQUARES.map(n => cell(urls[key][0][0], groundOf(n)[0])).join("");
    return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:4px 0"><b style="width:150px;font:600 13px system-ui">${label}</b>${frames}<i style="width:8px"></i>${colours}<i style="width:8px"></i>${grounds}</div>`;
  };
  let html = `<div style="font:12px system-ui;margin-bottom:8px">Frames 0–3 (walk, walk, climb, climb) · the other three colours · on every band's ground</div>`;
  STAGES.forEach((s, i) => ["m", "f", "n"].forEach(gd => {
    if (gd !== "m" && artOf(s.art, gd) === ART[s.art]) return;
    html += row(`${s.en} · ${stageHi(s, gd)} (${gd})`, `${s.art}_${gd}`, (color, f) => spriteURL(i, color, f, gd));
  }));
  for (const a of ANIMALS) html += row(a, a, (color, f) => spriteURL(0, color, f, "m", a));
  // a modal dialog of its own, so it sits above the naming or a card in the top layer; Esc closes it as any dialog
  const el = document.createElement("dialog");
  el.id = "mpSprites";
  el.style.cssText = "max-width:none;max-height:none;width:100%;height:100%;margin:0;border:0;padding:16px;overflow:auto;background:#FBF6EA;color:#1A1208";
  el.innerHTML = `<button type="button" aria-label="Close" style="position:sticky;top:0;float:right;font:20px system-ui">×</button>${html}`;
  el.querySelector("button").addEventListener("click", () => el.close());
  el.addEventListener("close", () => el.remove());
  document.body.appendChild(el);
  el.showModal();
  return urls;
}
