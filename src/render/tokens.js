// ---- Tokens and their animations ----
import { ROWS } from "../content.js";
import { t, fill } from "../i18n.js";
import { G, pname } from "../state.js";
import { $, COLORS, P_HEX, reduced, sleep, quality } from "../ui.js";
import { S, colRow, center, fx, fxClear, snakePath, snakeColors, drawHood, paint } from "./board.js";
import { STAGES, stageOf, stageName, spriteURL } from "./sprites.js";
import { renderPlayers } from "./log.js";
import { gone } from "../engine/turn.js";
import { isAnimal } from "../engine/animal.js";

export const tokenEls = [];
const OFFS = [[0, 0], [-2.2, -1.2], [2.2, -1.2], [-2.2, 1.2], [2.2, 1.2]];
const FEET = 0.38; // feet sit this far below a square's centre, in squares

export function buildTokens() {
  tokenEls.length = 0;
  $("tokens").innerHTML = ""; $("tray").innerHTML = "";
  G.state.players.forEach(p => {
    const el = document.createElement("div");
    el.className = "token";
    el.innerHTML = `<div class="body"><div class="spr"></div></div>`;
    el.style.setProperty("--pc", COLORS[p.color]);
    el._frame = 0; el._stage = null;
    tokenEls.push(el);
  });
  place(true);
}

// A person is drawn by their gender; during an animal interlude (Phase 16) as the creature they were born.
export function setSprite(el, p, stage) {
  const animal = isAnimal(G.state) ? G.state.rules.animal?.kind ?? "tortoise" : null;
  el.querySelector(".spr").style.backgroundImage = spriteURL(stage, p.color, el._frame, p.gender, animal);
  el.classList.toggle("divine", !animal && STAGES[stage].art === "divine");
}

function setXY(el, x, y) {
  el.style.left = (x / (S * 10)) * 100 + "%";
  el.style.top = ((y + FEET * S) / (S * ROWS)) * 100 + "%";
}

export function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

export function place(silent = false) {
  const at = {};
  G.state.players.forEach((p, i) => (at[p.pos] ||= []).push(i));
  G.state.players.forEach((p, i) => {
    const el = tokenEls[i];
    el.title = pname(p);
    el.classList.toggle("active", i === G.state.turn && !G.state.over && !G.busy);
    el.classList.toggle("dead", gone(p));
    el.classList.toggle("left", p.face === "l" && el._frame < 2);
    const stage = stageOf(p);
    if (el._stage !== stage) {
      // an animal does not grow through the stages of a person's life, so its interlude is told no stage
      if (el._stage != null && !silent && !isAnimal(G.state)) {
        retrigger(el, "poof");
        // growing up, or, on the Brahmā fall alone, being born again: a snake no longer makes anyone younger
        const v = { name: pname(p), stage: stageName(stage, p.gender) }, you = !p.name && p.color === 0;
        const key = stage > el._stage ? "grew" : "bornAgain";
        toast(fill(t(key + (you && key !== "grew" ? "You" : ""), v), { name: v.name, gender: p.gender }));
      }
      el._stage = stage;
    }
    setSprite(el, p, stage);
    if (p.pos === 0) { if (el.parentNode !== $("tray")) $("tray").appendChild(el); return; }
    if (el.parentNode !== $("tokens")) $("tokens").appendChild(el);
    const group = at[p.pos], k = group.indexOf(i);
    const [ox, oy] = group.length === 1 ? OFFS[0] : OFFS[k + 1];
    const { col, row } = colRow(p.pos);
    el.style.left = (col + 0.5) * 10 + ox + "%";
    el.style.top = ((ROWS - 1 - row + 0.5 + FEET) * 10 + oy) * (10 / ROWS) + "%";
  });
  renderPlayers();
}

export function toast(text) {
  const slot = $("toastSlot");
  slot.innerHTML = "";
  const el = document.createElement("div");
  el.className = "toast"; el.textContent = text;
  slot.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ---- Animations ----
// Runs fn(t) for t in 0..1 over ms; stops early if a new game starts.
export const animate = (ms, fn) => new Promise(res => {
  const g = G.gen, t0 = performance.now(), d = reduced ? 1 : ms;
  const tick = now => {
    if (g !== G.gen) return res();
    // the frame time can be a little before t0, so clamp at 0 (a negative u once froze the game mid-swallow)
    const u = Math.max(0, Math.min(1, (now - t0) / d));
    fn(u);
    u < 1 ? requestAnimationFrame(tick) : res();
  };
  requestAnimationFrame(tick);
});
export const ease = f => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);

export async function climb(idx, a, b) {
  const g = G.gen, el = tokenEls[idx], p = G.state.players[idx];
  const P = center(a), Q = center(b), len = Math.hypot(Q.x - P.x, Q.y - P.y);
  const rungs = Math.max(2, Math.floor(len / (S * 0.36)));
  const trail = [], glints = [], extras = quality !== "low";
  let lastRung = -1;
  el.classList.add("free"); el.classList.remove("left");
  await animate(Math.min(1700, Math.max(900, (len / S) * 230)), u => {
    const r = u * rungs, k = Math.min(rungs - 1, Math.floor(r)), f = r - k;
    const e = (k + ease(f)) / rungs;
    const x = P.x + (Q.x - P.x) * e, y = P.y + (Q.y - P.y) * e - Math.sin(f * Math.PI) * S * 0.08;
    el._frame = 2 + (k % 2); setSprite(el, p, el._stage); setXY(el, x, y);
    trail.push({ x, y, u });
    // each rung catches the light as a hand takes it
    if (extras && k !== lastRung) { lastRung = k; glints.push({ x, y: y + S * 0.15, u }); }
    fxClear();
    for (const gl of glints) {
      const a = 1 - (u - gl.u) * 4;
      if (a <= 0) continue;
      fx.strokeStyle = `rgba(255, 236, 150, ${a})`; fx.lineWidth = S * 0.03;
      fx.beginPath(); fx.arc(gl.x, gl.y, S * (0.12 + (1 - a) * 0.22), 0, Math.PI * 2); fx.stroke();
    }
    for (const pt of trail) {
      const alpha = 1 - (u - pt.u) * 3;
      if (alpha <= 0) continue;
      fx.fillStyle = `rgba(255, 214, 90, ${alpha * 0.7})`;
      fx.beginPath(); fx.arc(pt.x, pt.y + S * 0.15, S * 0.08 * alpha, 0, Math.PI * 2); fx.fill();
    }
  });
  fxClear();
  if (g !== G.gen) return;
  el.classList.remove("free"); el._frame = 0; p.pos = b; place();
  retrigger(el, "land");
  setTimeout(() => el.classList.remove("land"), 340);
}

// How long the bulge takes to travel a snake's body, in ms: longer snakes swallow more slowly, within limits.
const bulgeMs = pts => { let len = 0; for (let i = 0; i + 1 < pts.length; i++) len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); return Math.min(2000, Math.max(1000, (len / S) * 170)); };
// The whole swallow, strike to spit, in seconds, so the sound of a fall can last exactly as long.
export const swallowSecs = (h, tail) => (reduced ? 0 : (450 + 340 + bulgeMs(snakePath(h, tail)) + 700) / 1000);
export async function swallow(idx, h, tail) {
  const g = G.gen, el = tokenEls[idx], p = G.state.players[idx];
  const pts = snakePath(h, tail), N = pts.length - 1, cols = snakeColors(h);
  // the hood flares and strikes
  await animate(450, u => {
    fxClear();
    fx.strokeStyle = `rgba(220, 40, 30, ${1 - u})`; fx.lineWidth = S * 0.05;
    fx.beginPath(); fx.arc(pts[0].x, pts[0].y, S * (0.25 + 0.4 * u), 0, Math.PI * 2); fx.stroke();
    drawHood(fx, pts[0], pts[4], cols, 1 + 0.35 * Math.sin(u * Math.PI));
  });
  if (g !== G.gen) return fxClear();
  retrigger(el, "gulp");
  await sleep(340);
  if (g !== G.gen) return fxClear();
  el.classList.add("hide"); el.classList.remove("gulp");
  // a bulge in the player's colour travels down the body
  await animate(bulgeMs(pts), v => {
    // the bulge is slow to start and slows again before the tail, as a swallowed thing would be
    const u = ease(v), i = u * N, k = Math.min(N - 1, Math.floor(i)), f = i - k, a = pts[k], b = pts[k + 1];
    const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, r = Math.max(S * 0.11, a.w * 0.95);
    fxClear();
    drawHood(fx, pts[0], pts[4], cols);
    fx.lineWidth = 2; fx.strokeStyle = paint("black"); fx.fillStyle = cols[0];
    fx.beginPath(); fx.arc(x, y, r, 0, Math.PI * 2); fx.fill(); fx.stroke();
    fx.globalAlpha = 0.6; fx.fillStyle = P_HEX[p.color];
    fx.beginPath(); fx.arc(x, y, r * 0.65, 0, Math.PI * 2); fx.fill();
    fx.globalAlpha = 1;
  });
  fxClear();
  if (g !== G.gen) return;
  // ...and spits the player out at the tail, dizzy, and no younger
  p.pos = tail; el.classList.remove("hide"); place();
  retrigger(el, "dizzy");
  await sleep(700);
  el.classList.remove("dizzy");
}
