// ---- The board: squares, labels, and the painted snakes and ladders ----
import { GOAL, ROWS, ASHRAMAS, LADDERS, SNAKES, SQ, HEAVEN } from "../content.js";
import { lang, L, t, num } from "../i18n.js";
import { $, art } from "../ui.js";

export const ashramaIn = (l, n) => { const a = ASHRAMAS.find(([max]) => n <= max); return l === "hi" ? a[2] : a[1]; };
export const ashramaOf = n => ashramaIn(lang, n);

// [background, light ink?]: the bright printed colours of the traditional board.
const PALETTE = [["#D2402E", true], ["#F2C232", false], ["#3A78C2", true], ["#EC8A2E", false], ["#3F9A52", true], ["#7CC3E8", false]];

// ---- Board geometry ----
export function colRow(n) {
  const i = n - 1, row = Math.floor(i / 10);
  const col = row % 2 === 0 ? i % 10 : 9 - (i % 10);
  return { col, row };
}

// The board's name for square n in the current language.
export function squareName(n) {
  const sl = SNAKES[n] || LADDERS[n];
  if (sl) return L(sl.en, sl.hi);
  if (HEAVEN[n]) return L(HEAVEN[n].en, HEAVEN[n].hi);
  if (n === GOAL) return t("moksha");
  return SQ[n] ? L(SQ[n][1], SQ[n][2]) : "";
}

function labelHtml(n) {
  const numEl = `<span class="n">${num(n)}</span>`;
  if (n === GOAL) return numEl + `<span class="om">ॐ</span><span class="dv">${t("moksha")}</span>`;
  if (HEAVEN[n]) return numEl + `<span class="ic">${art(`sq-${n}`, HEAVEN[n].ic)}</span><span class="dv">${L(HEAVEN[n].en, HEAVEN[n].hi)}</span>`;
  const sl = SNAKES[n] || LADDERS[n];
  if (sl) return numEl + `<span class="ic">${art(`sq-${n}`, sl.ic)}</span><span class="nm">${L(sl.en, sl.hi)}</span>`;
  return numEl;
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
  cells.innerHTML = ""; labels.innerHTML = "";
  for (let r = ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < 10; c++) {
      const n = r % 2 === 0 ? r * 10 + c + 1 : r * 10 + (9 - c) + 1;
      const [bg, light] = PALETTE[(c + 2 * r) % PALETTE.length];
      const heaven = n > 100;
      const el = document.createElement("div");
      el.className = "cell" + (heaven ? " heaven" : "") + (n === GOAL ? " goal" : "");
      if (!heaven) el.style.background = bg;
      if (SQ[n]) el.innerHTML = `<span class="pic">${art(`sq-${n}`, SQ[n][0])}</span>`;
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
export const fxClear = () => fx.clearRect(0, 0, S * 10, S * ROWS);

function drawLadder(a, b) {
  const p = center(a), q = center(b);
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len, half = S * 0.18;
  ctx.lineCap = "round";
  const rungs = Math.max(2, Math.floor(len / (S * 0.36)));
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? "#F7DB64" : "#4A2E06";
    ctx.lineWidth = pass ? S * 0.055 : S * 0.095;
    for (let i = 1; i <= rungs; i++) {
      const t = i / (rungs + 1), x = p.x + dx * t, y = p.y + dy * t;
      ctx.beginPath(); ctx.moveTo(x - nx * half, y - ny * half); ctx.lineTo(x + nx * half, y + ny * half); ctx.stroke();
    }
    ctx.strokeStyle = pass ? "#F4CF3A" : "#4A2E06";
    ctx.lineWidth = pass ? S * 0.07 : S * 0.115;
    for (const sg of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(p.x + nx * half * sg, p.y + ny * half * sg); ctx.lineTo(q.x + nx * half * sg, q.y + ny * half * sg); ctx.stroke();
    }
  }
}

// [body, band, belly] for each cobra, dark like the snakes on painted boards.
const SNAKE_COLORS = [
  ["#4A4F5C", "#262A33", "#C9CFC2"], ["#2F4C70", "#18293F", "#BFD3E6"], ["#5B5240", "#332D22", "#E3D3A8"],
  ["#3C5A44", "#1F3325", "#C8DDB8"], ["#6A3B32", "#3D1F1A", "#E8C2A8"],
];
export const snakeColors = h => SNAKE_COLORS[Object.keys(SNAKES).indexOf(String(h)) % SNAKE_COLORS.length];

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

export function drawHood(c, a, b, [body, band, belly], flare = 1) {
  const ang = Math.atan2(a.y - b.y, a.x - b.x);
  c.save(); c.translate(a.x, a.y); c.rotate(ang); c.scale(flare, flare);
  c.strokeStyle = "#B3261E"; c.lineWidth = S * 0.025;
  c.beginPath(); c.moveTo(S * 0.16, 0); c.lineTo(S * 0.3, 0); c.lineTo(S * 0.35, -S * 0.04); c.moveTo(S * 0.3, 0); c.lineTo(S * 0.35, S * 0.04); c.stroke();
  c.lineWidth = 2; c.strokeStyle = "#0E0C08";
  c.fillStyle = body; c.beginPath(); c.ellipse(-S * 0.07, 0, S * 0.19, S * 0.3, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  c.fillStyle = band; c.beginPath(); c.ellipse(-S * 0.07, 0, S * 0.12, S * 0.2, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = belly; c.lineWidth = S * 0.022;
  for (const sg of [-1, 1]) { c.beginPath(); c.arc(-S * 0.1, sg * S * 0.09, S * 0.045, 0, Math.PI * 2); c.stroke(); }
  c.lineWidth = 1.5; c.strokeStyle = "#0E0C08";
  c.fillStyle = body; c.beginPath(); c.ellipse(S * 0.06, 0, S * 0.13, S * 0.1, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  for (const sg of [-1, 1]) {
    c.fillStyle = "#FFF6D8"; c.beginPath(); c.arc(S * 0.1, sg * S * 0.05, S * 0.03, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#111"; c.beginPath(); c.arc(S * 0.11, sg * S * 0.05, S * 0.015, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

function drawSnake(h, t) {
  const pts = snakePath(h, t), N = pts.length - 1, cols = snakeColors(h), [body, band, belly] = cols;
  ctx.lineCap = "round";
  // outline, banded body, then a pale belly stripe
  for (let pass = 0; pass < 3; pass++) {
    ctx.globalAlpha = pass === 2 ? 0.45 : 1;
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[i + 1];
      ctx.strokeStyle = pass === 0 ? "#0E0C08" : pass === 1 ? (Math.floor(i / 5) % 2 ? body : band) : belly;
      ctx.lineWidth = pass === 0 ? a.w + 3 : pass === 1 ? a.w : a.w * 0.3;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  drawHood(ctx, pts[0], pts[4], cols);
}

export function draw() {
  const W = $("cells").clientWidth, H = $("cells").clientHeight;
  if (!W) return;
  const dpr = window.devicePixelRatio || 1;
  for (const [cv, c] of [[canvas, ctx], [fxCanvas, fx]]) {
    cv.width = W * dpr; cv.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  ctx.clearRect(0, 0, W, H);
  S = W / 10;
  for (const [a, l] of Object.entries(LADDERS)) drawLadder(+a, l.to);
  for (const [h, s] of Object.entries(SNAKES)) drawSnake(+h, s.to);
}
