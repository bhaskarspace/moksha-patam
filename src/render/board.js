// ---- The board: squares, labels, and the painted snakes and ladders ----
import { GOAL, TOP, ROWS, COLS, LAYOUT, ASHRAMAS, LADDERS, SNAKES, SQ, HEAVEN, BOARD, onBoard, legendOf } from "../content.js";
import { isCloth } from "../engine/cloth.js";
import { lang, L, t, num } from "../i18n.js";
import { $, art, esc, quality } from "../ui.js";
import { groundToken, groundOf, colRow, fills, WASH, snakeHues, sivaPath } from "./ground.js";
import { cameraOn } from "./camera.js";

export { colRow };

export const ashramaIn = (l, n) => { const a = ASHRAMAS.find(([max]) => n <= max); return l === "hi" ? a[2] : a[1]; };
export const ashramaOf = n => ashramaIn(lang, n);

// The board's name for square n in the current language.
export function squareName(n) {
  if (isCloth()) { const g = legendOf(n); return g ? L(g.en, g.hi) : ""; }
  if (HEAVEN[n]) return L(HEAVEN[n].en, HEAVEN[n].hi);
  const sl = SNAKES[n] || LADDERS[n];
  if (sl) return L(sl.en, sl.hi);
  if (n === GOAL) return t("moksha");
  return SQ[n] ? L(SQ[n].en, SQ[n].hi) : "";
}

// A square's painted vignette (REDESIGN.md Phase 13): a symbol of the sheet's drawn as a scene for the whole square. It is
// painted in the cell, under the snakes and ladders and the ageing, as all the art is; its square's label then carries no
// roundel. A square without one keeps its sprite in the roundel, or its emoji. Moksha's is the card's alone: the board keeps ॐ.
export const vignette = n => !isCloth() && n !== GOAL && !!document.getElementById(`sq-${n}`)?.classList.contains("vg");

function labelHtml(n) {
  const numEl = `<span class="n">${num(n)}</span>`;
  // an old cloth writes every square's legend in it, as the charts do (Phase 18)
  if (isCloth()) return numEl + `<span class="nm">${esc(squareName(n))}</span>`;
  const vg = vignette(n);
  if (n === GOAL) return numEl + `<span class="om">ॐ</span><span class="dv">${t("moksha")}</span>`;
  if (HEAVEN[n]) return numEl + (vg ? "" : `<span class="ic">${art(`sq-${n}`, HEAVEN[n].ic)}</span>`) + `<span class="dv">${L(HEAVEN[n].en, HEAVEN[n].hi)}</span>`;
  const sl = SNAKES[n] || LADDERS[n];
  if (sl) return numEl + (vg ? "" : `<span class="ic">${art(`sq-${n}`, sl.ic)}</span>`) + `<span class="nm">${L(sl.en, sl.hi)}</span>`;
  return numEl;
}

// The 72's superstructure (Phase 18): a gold arch over each square of the top row, as the painted Vaiṣṇava cloths have
// it, and the trimūrti over the three realms at its centre, each as its emblem alone, never a likeness: Śiva's
// trident over his realm (67), Viṣṇu's discus over Vaikuṇṭha (68), Brahmā's lotus over his (69).
const TRIMURTI = { "-1": "trident", 0: "discus", 1: "lotus" };
function emblemOf(kind, x) {
  const cx = x + 5, cy = 5.7;
  if (kind === "trident") return `<path class="emb" d="M${cx},8.4 V3.4 M${cx - 1.5},4.1 Q${cx - 1.5},6 ${cx},6 Q${cx + 1.5},6 ${cx + 1.5},4.1 M${cx - 0.5},3.9 L${cx},3 L${cx + 0.5},3.9"/>`;
  if (kind === "discus") return `<circle class="emb" cx="${cx}" cy="${cy}" r="1.7"/><circle class="emb dot" cx="${cx}" cy="${cy}" r="0.45"/>` +
    Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a); return `<path class="emb" d="M${+(cx + c * 0.45).toFixed(2)},${+(cy + s * 0.45).toFixed(2)} L${+(cx + c * 1.7).toFixed(2)},${+(cy + s * 1.7).toFixed(2)}"/>`; }).join("");
  if (kind === "lotus") return [-2, -1, 0, 1, 2].map(k => `<ellipse class="emb petal" cx="${cx}" cy="${cy + 0.2}" rx="0.62" ry="1.9" transform="rotate(${k * 28} ${cx} ${cy + 1.9})"/>`).join("") +
    `<path class="emb" d="M${cx - 2},${cy + 2.1} H${cx + 2}"/>`;
  return "";
}
const archOf = (x, emblem) =>
  `<path class="arch" d="M${x + 0.4},9 V1.6 H${x + 9.6} V9 Z"/>` +
  `<path class="niche" d="M${x + 1.4},9 V5.4 Q${x + 1.4},3.6 ${x + 2.6},3.4 Q${x + 3},2.2 ${x + 4},2.3 Q${x + 5},1 ${x + 6},2.3 Q${x + 7},2.2 ${x + 7.4},3.4 Q${x + 8.6},3.6 ${x + 8.6},5.4 V9 Z"/>` +
  (emblem ? emblemOf(emblem, x) : "");

// The board's superstructure, from its look (content/boards.json): for the 110, a vimāna over each square of the divine row,
// as on the 1780 board and the Jain charts, the exit's doorway in indigo. Ornament: it goes first on a weak device.
function superstructure() {
  const el = $("vimana");
  if (!el) return;
  el.hidden = !["vimana", "arches"].includes(BOARD.superstructure);
  if (el.hidden) return;
  const top = ROWS - 1, f = n => +n.toFixed(2);
  let d = "";
  if (BOARD.superstructure === "arches") {
    for (let c = 0; c < COLS; c++) {
      const n = LAYOUT.cell[`${c},${top}`];
      if (n != null) d += archOf(c * 10, BOARD.panel === "trimurti" ? TRIMURTI[n - GOAL] : null);
    }
    el.innerHTML = `<svg viewBox="0 0 ${COLS * 10} 9" preserveAspectRatio="none">${d}</svg>`;
    return;
  }
  for (let c = 0; c < COLS; c++) {
    const n = LAYOUT.cell[`${c},${top}`], x = c * 10;
    if (n == null) continue;
    d += `<path class="dome" d="M${x + 1},9 L${x + 1},6.2 Q${x + 1},2.6 ${x + 5},1.9 Q${x + 9},2.6 ${x + 9},6.2 L${x + 9},9 Z"/>` +
      `<path class="door${n === GOAL ? " goal" : ""}" d="M${x + 3.4},9 L${x + 3.4},6.6 Q${x + 5},4.4 ${x + 6.6},6.6 L${x + 6.6},9 Z"/>` +
      `<circle class="finial" cx="${x + 5}" cy="${f(1.3)}" r="0.75"/>`;
  }
  el.innerHTML = `<svg viewBox="0 0 ${COLS * 10} 9" preserveAspectRatio="none">${d}</svg>`;
}

export const labEls = {};
let focusN = 1;
export function focusSquare(n) {
  labEls[focusN].tabIndex = -1;
  focusN = n;
  labEls[n].tabIndex = 0;
  labEls[n].focus();
}
export function buildCells() {
  const cells = $("cells"), labels = $("labels");
  superstructure();
  cells.innerHTML = ""; labels.innerHTML = "";
  // the grid is the board's extent (src/geometry.js); each square is placed in its own cell, top-left first, so a board
  // with squares outside its main grid, or cells with none, is drawn as it is
  const board = $("board");
  board.style.setProperty("--cols", COLS);
  board.style.setProperty("--rows", ROWS);
  for (let r = ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      const n = LAYOUT.cell[`${c},${r}`];
      if (n == null) continue;
      const light = groundOf(n)[1], heaven = n > 100;
      const el = document.createElement("div");
      el.className = "cell" + (heaven ? " heaven" : "") + (n === GOAL ? " goal" : "");
      if (!heaven) el.style.background = `var(--b-${groundToken(n)})`;
      if (vignette(n)) el.innerHTML = `<span class="pic vg">${art(`sq-${n}`, "", "spr vg")}</span>`;
      else if (SQ[n] && !isCloth()) el.innerHTML = `<span class="pic">${art(`sq-${n}`, SQ[n].ic)}</span>`;
      el.style.gridArea = `${ROWS - r} / ${c + 1}`;
      cells.appendChild(el);

      const lab = document.createElement("div");
      const kind = n === GOAL ? " heaven goal" : heaven ? " heaven" : SNAKES[n] ? " vice" : LADDERS[n] ? " virtue" : "";
      lab.className = "lab" + kind + (light && !heaven ? " li" : "");
      lab.innerHTML = labelHtml(n);
      const s = SNAKES[n], l = LADDERS[n];
      lab.title = s ? `${squareName(n)} (${s.skt}) → ${num(s.to)}` : l ? `${squareName(n)} (${l.skt}) → ${num(l.to)}` : squareName(n);
      // every square opens its card; one square at a time takes Tab, and the arrow keys move between them
      lab.dataset.n = n;
      lab.setAttribute("role", "button");
      lab.setAttribute("aria-label", t("sqLabel", { n, name: squareName(n) }));
      lab.tabIndex = n === focusN ? 0 : -1;
      lab.style.gridArea = `${ROWS - r} / ${c + 1}`;
      labels.appendChild(lab);
      labEls[n] = lab;
    }
  }
}

// ---- Drawing snakes and ladders ----
const canvas = $("art"), ctx = canvas.getContext("2d");
export const fxCanvas = $("fx"), fx = fxCanvas.getContext("2d");
export let S = 0;
export const center = n => { const { col, row } = colRow(n); return { x: (col + 0.5) * S, y: (ROWS - 1 - row + 0.5) * S }; };
export const fxClear = () => fx.clearRect(0, 0, S * COLS, S * ROWS);

// A palette colour by token name ("vermilion"), as the page's stylesheet has it (content/boards.json, by the build).
const tokenCache = {};
// another board brings another palette and other snakes (Phase 18)
onBoard(() => { for (const k in tokenCache) delete tokenCache[k]; hues = null; });
export const paint = name => (tokenCache[name] ||= getComputedStyle(document.documentElement).getPropertyValue(`--b-${name}`).trim());

// Ladders red-outlined, as on the 72-square boards: rails and rungs of Indian yellow inside a thin vermilion line, and that
// inside the lamp-black outline. Thin, so the yellow is what reads and the vignettes under them stay seen (26 Oct: at
// three times this the vermilion dominated, the ladders read orange, and they covered 11.7% of the vignettes, now 5.9%).
function drawLadder(a, b) {
  const p = center(a), q = center(b);
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len, half = S * 0.14;
  ctx.lineCap = "round";
  const rungs = Math.max(2, Math.floor(len / (S * 0.36)));
  for (let pass = 0; pass < 3; pass++) {
    // lamp black, the single outline; then the vermilion band; then the yellow wood
    ctx.strokeStyle = pass === 0 ? paint("black") : pass === 1 ? paint(BOARD.ladder.outline) : paint(BOARD.ladder.rail);
    const w = [S * 0.07, S * 0.056, S * 0.04][pass];
    ctx.lineWidth = w * 0.85;
    for (let i = 1; i <= rungs; i++) {
      const t = i / (rungs + 1), x = p.x + dx * t, y = p.y + dy * t;
      ctx.beginPath(); ctx.moveTo(x - nx * half, y - ny * half); ctx.lineTo(x + nx * half, y + ny * half); ctx.stroke();
    }
    ctx.lineWidth = w;
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(p.x + nx * half * sg, p.y + ny * half * sg); ctx.lineTo(q.x + nx * half * sg, q.y + ny * half * sg); ctx.stroke();
    }
  }
}

// [body, band, belly, tongue] for each snake: a pigment of its own from the board's look, so no two snakes near each
// other match (ground.js snakeHues), with lamp-black scales and a pale or bright belly.
let hues = null;
export const snakeColors = h => {
  hues ||= snakeHues(SNAKES, BOARD.snakes);
  const [body, belly] = BOARD.snakes[hues[h]];
  return [paint(body), paint("black"), paint(belly), paint(body === "vermilion" ? "yellow" : "vermilion")];
};

// The wavy body from head (index 0) to tail, shared by drawing and the swallow animation.
export function snakePath(h, t) {
  const p = center(h), q = center(t);
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const amp = Math.min(S * 0.42, len * 0.14);
  const waves = Math.max(1, Math.round(len / (S * 1.7)));
  const N = 80, pts = [];
  for (let i = 0; i <= N; i++) {
    const tt = i / N, o = Math.sin(tt * Math.PI * 2 * waves) * amp * Math.sin(tt * Math.PI);
    pts.push({ x: p.x + dx * tt + nx * o, y: p.y + dy * tt + ny * o, w: S * (0.24 - 0.18 * tt) });
  }
  return pts;
}

// The nāga's head: a hood of seven lobes with the spectacle mark, the head before it with two almond eyes, and a forked
// tongue. Flat pigment inside one lamp-black line.
export function drawHood(c, a, b, [body, band, belly, tongue], flare = 1) {
  const ang = Math.atan2(a.y - b.y, a.x - b.x), ink = paint("black"), line = Math.max(1.2, S * 0.022);
  c.save(); c.translate(a.x, a.y); c.rotate(ang); c.scale(flare, flare);
  c.lineJoin = "round"; c.lineCap = "round";
  c.strokeStyle = tongue; c.lineWidth = S * 0.028;
  c.beginPath(); c.moveTo(S * 0.17, 0); c.lineTo(S * 0.31, 0); c.lineTo(S * 0.37, -S * 0.045); c.moveTo(S * 0.31, 0); c.lineTo(S * 0.37, S * 0.045); c.stroke();
  // the hood: lobes round a broad oval, then the oval over them
  c.fillStyle = body; c.strokeStyle = ink; c.lineWidth = line;
  const hx = -S * 0.08, rx = S * 0.17, ry = S * 0.31;
  for (let k = 0; k < 7; k++) {
    // round the back of the hood only, from one shoulder to the other, as the hood spreads behind the head
    const th = Math.PI * (0.55 + (0.9 * k) / 6), x = hx + Math.cos(th) * rx, y = Math.sin(th) * ry;
    c.beginPath(); c.arc(x, y, S * 0.055, 0, Math.PI * 2); c.fill(); c.stroke();
  }
  c.beginPath(); c.ellipse(hx, 0, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  // the inner hood in the belly's colour, and the spectacle mark on it
  c.fillStyle = belly; c.beginPath(); c.ellipse(hx - S * 0.01, 0, rx * 0.62, ry * 0.68, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = band; c.lineWidth = S * 0.02;
  for (const sg of [-1, 1]) { c.beginPath(); c.arc(hx - S * 0.03, sg * S * 0.085, S * 0.042, 0, Math.PI * 2); c.stroke(); }
  c.beginPath(); c.moveTo(hx - S * 0.03, -S * 0.043); c.quadraticCurveTo(hx + S * 0.02, 0, hx - S * 0.03, S * 0.043); c.stroke();
  // the head, and its eyes
  c.strokeStyle = ink; c.lineWidth = line; c.fillStyle = body;
  c.beginPath(); c.ellipse(S * 0.07, 0, S * 0.13, S * 0.095, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  for (const sg of [-1, 1]) {
    c.fillStyle = paint("shell"); c.beginPath();
    c.moveTo(S * 0.05, sg * S * 0.05); c.quadraticCurveTo(S * 0.1, sg * S * 0.085, S * 0.15, sg * S * 0.045); c.quadraticCurveTo(S * 0.1, sg * S * 0.025, S * 0.05, sg * S * 0.05);
    c.fill(); c.lineWidth = line * 0.6; c.stroke();
    c.fillStyle = ink; c.beginPath(); c.arc(S * 0.108, sg * S * 0.05, S * 0.016, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

function drawSnake(h, t) {
  const pts = snakePath(h, t), N = pts.length - 1, cols = snakeColors(h), [body, band, belly] = cols, ink = paint("black");
  ctx.lineCap = "round";
  // the outline, the body, a belly stripe, then the scales: lamp-black crescents down both flanks
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[i + 1];
      ctx.strokeStyle = pass === 0 ? ink : pass === 1 ? body : belly;
      ctx.lineWidth = pass === 0 ? a.w + 3 : pass === 1 ? a.w : a.w * 0.26;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  if (quality !== "low") {
    // all of a snake's scales are one path, stroked once
    ctx.strokeStyle = band; ctx.lineWidth = Math.max(0.8, S * 0.014);
    ctx.beginPath();
    for (let i = 3; i < N - 2; i += 3) {
      const a = pts[i], b = pts[i + 1], ang = Math.atan2(b.y - a.y, b.x - a.x), r = a.w * 0.22;
      for (const sg of [-1, 1]) {
        const cx = a.x + Math.cos(ang + (sg * Math.PI) / 2) * a.w * 0.3, cy = a.y + Math.sin(ang + (sg * Math.PI) / 2) * a.w * 0.3;
        ctx.moveTo(cx + Math.cos(ang + Math.PI / 2) * r, cy + Math.sin(ang + Math.PI / 2) * r);
        ctx.arc(cx, cy, r, ang + Math.PI / 2, ang + (3 * Math.PI) / 2);
      }
    }
    ctx.stroke();
  }
  drawHood(ctx, pts[0], pts[4], cols);
}

// Śiva's snake (REDESIGN.md Phase 14): one nāga in nīla, blue-black, apart from the board's five snake pigments, coiled
// round the trident on 110 and lying along the board's edge to its tail in square 1. It is the second form of the fall,
// for a throw that lands exactly on 110; it is not one of SNAKES, so nothing moves by it but that.
export const sivaPoints = () => sivaPath().map(p => ({ x: p.x * S, y: p.y * S, w: p.w * S }));
function drawSiva() {
  const pts = sivaPoints(), N = pts.length - 1, ink = paint("black"), body = paint("nila"), belly = paint("shell");
  ctx.lineCap = "round";
  for (let pass = 0; pass < 3; pass++) {
    ctx.strokeStyle = pass === 0 ? ink : pass === 1 ? body : belly;
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[i + 1];
      ctx.lineWidth = pass === 0 ? a.w + 3 : pass === 1 ? a.w : a.w * 0.22;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  drawHood(ctx, pts[0], pts[2], [body, ink, belly, paint("vermilion")], 0.7);
}

// ---- The ageing (render/age.js): a wash per square in palette colours, painted between the art and the labels ----
const ageCanvas = $("age"), agx = ageCanvas.getContext("2d");
let tokens = null, washes = null, grain = null;
// washes[n] is { sepia, dim } for square n
export function drawAge(next = washes) {
  washes = next;
  if (!S || !washes) return;
  tokens ||= Object.fromEntries(["--b-ochre", "--b-black", "--b-shell"].map(t => [t, getComputedStyle(document.documentElement).getPropertyValue(t).trim()]));
  const W = S * COLS, H = S * ROWS;
  agx.clearRect(0, 0, W, H);
  // the cloth first, under the washes
  if (grain && quality !== "low") { agx.fillStyle = grain; agx.fillRect(0, 0, W, H); }
  for (const n of LAYOUT.squares) {
    const { col, row } = colRow(n), x = col * S, y = (ROWS - 1 - row) * S;
    for (const [t, a] of fills(n, washes[n] ?? {})) {
      agx.globalAlpha = a; agx.fillStyle = tokens[t];
      agx.fillRect(x, y, S, S);
    }
  }
  // and the edges worn darker: five flat rings, each a little darker toward the rim, never more than WASH.edge in all
  // (no gradients but the gold, REDESIGN.md Phase 13)
  agx.fillStyle = tokens["--b-black"];
  for (const k of [1, 0.95, 0.9, 0.85, 0.8]) {
    agx.globalAlpha = WASH.edge / 5;
    agx.beginPath(); agx.rect(0, 0, W, H);
    agx.ellipse(W / 2, H / 2, W * 0.72 * k, H * 0.7 * k, 0, 0, Math.PI * 2);
    agx.fill("evenodd");
  }
  agx.globalAlpha = 1;
}

// Bake the paper grain (an SVG turbulence filter, --grain in styles.css) into a pattern at this screen's density, once.
const GRAIN = 180;
function bakeGrain() {
  const m = getComputedStyle(ageCanvas).getPropertyValue("--grain").match(/url\("?(data:image\/svg\+xml[^")]+)"?\)/);
  if (!m) return;
  const img = new Image(), k = Math.min(3, window.devicePixelRatio || 1);
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = c.height = GRAIN * k;
    c.getContext("2d").drawImage(img, 0, 0, GRAIN * k, GRAIN * k);
    grain = agx.createPattern(c, "repeat");
    grain.setTransform(new DOMMatrix().scale(1 / k));
    drawAge();
  };
  img.src = m[1];
}
bakeGrain();

export function draw() {
  const W = $("cells").clientWidth, H = $("cells").clientHeight;
  if (!W) return;
  const dpr = window.devicePixelRatio || 1;
  // the snakes and ladders are drawn finer when the camera may zoom in on them
  for (const [cv, c, k] of [[canvas, ctx, cameraOn() ? 1.3 : 1], [fxCanvas, fx, 1], [ageCanvas, agx, 1]]) {
    cv.width = W * dpr * k; cv.height = H * dpr * k;
    c.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
  }
  ctx.clearRect(0, 0, W, H);
  S = W / COLS;
  for (const [a, l] of Object.entries(LADDERS)) drawLadder(+a, l.to);
  for (const [h, s] of Object.entries(SNAKES)) drawSnake(+h, s.to);
  // Śiva's snake is the 110's own; an old cloth has only its own snakes
  if (!isCloth()) drawSiva();
  drawAge();
}
