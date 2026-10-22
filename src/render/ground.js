// ---- The painted ground of each square, and how the ageing washes it ----
// Pure, so tests can check every square's text contrast after the strongest wash (tests/contrast.test.mjs).
import { GOAL, ROWS, ASHRAMAS, BOARD } from "../content.js";

export function colRow(n) {
  const i = n - 1, row = Math.floor(i / 10);
  const col = row % 2 === 0 ? i % 10 : 9 - (i % 10);
  return { col, row };
}
// Square n's ground as a palette token name (REDESIGN.md Phase 13): pale, by band, the two grounds of a band alternating
// square by square, as the painted boards vary their rows. The divine row is gold, and the exit indigo.
export function groundToken(n) {
  if (n === GOAL) return BOARD.divine.goal;
  if (n > 100) return BOARD.divine.ground[0];
  const band = Math.max(0, ASHRAMAS.findIndex(([max]) => n <= max)), [a, b] = BOARD.grounds[band % BOARD.grounds.length];
  const { col, row } = colRow(n);
  return (col + row) % 2 ? b : a;
}
// Square n's ground colour and whether its label is written in light ink. The gold row is checked at the middle of its
// gradient, the lighter end, since dark ink on it reads worst there; only the exit, indigo, has light ink.
const hex = t => BOARD.palette[t];
const mix = (a, b) => "#" + [1, 3, 5].map(i => Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, "0")).join("");
export function groundOf(n) {
  if (n === GOAL) return [hex(BOARD.divine.goal), true];
  if (n > 100) return [mix(hex(BOARD.divine.ground[0]), hex(BOARD.divine.ground[1])), false];
  return [hex(groundToken(n)), false];
}
export const SQUARES = ROWS * 10;

// How strongly the ageing paints, at full sepia or full dim. Sepia is ochre, plus lamp black under light ink
// so a dark square never lightens. Dim pushes each square away from its ink: toward shell white where the
// ink is dark and toward lamp black where it is light, so a wash can only raise a label's contrast or hold it.
export const WASH = { ochre: 0.42, deepen: 0.22, dim: 0.5, edge: 0.14 };

// The fills that age square n, in order, as [token, alpha]. Tokens name the Basohli palette in styles.css.
export function fills(n, { sepia, dim }) {
  const light = groundOf(n)[1], out = [];
  if (sepia) {
    out.push(["--b-ochre", sepia * WASH.ochre]);
    if (light) out.push(["--b-black", sepia * WASH.deepen]);
  }
  if (dim) out.push([light ? "--b-black" : "--b-shell", dim * WASH.dim]);
  return out;
}

// Which of the board's snake pigments each snake is painted in (REDESIGN.md Phase 13): greedy, by head, so that no two
// snakes whose bodies pass within reach of each other share a body colour. at(n) is square n's centre in squares. Pure.
export const NEAR = 1.6;
export function snakeHues(snakes, hues, at = n => { const { col, row } = colRow(n); return { x: col + 0.5, y: row + 0.5 }; }) {
  const heads = Object.keys(snakes).map(Number).sort((a, b) => a - b);
  const line = h => { const p = at(h), q = at(snakes[h].to); return Array.from({ length: 21 }, (_, i) => ({ x: p.x + ((q.x - p.x) * i) / 20, y: p.y + ((q.y - p.y) * i) / 20 })); };
  const pts = Object.fromEntries(heads.map(h => [h, line(h)]));
  const near = (a, b) => pts[a].some(p => pts[b].some(q => Math.hypot(p.x - q.x, p.y - q.y) < NEAR));
  const out = {};
  for (const h of heads) {
    const taken = heads.filter(o => o in out && near(h, o)).map(o => out[o]);
    // of the pigments no neighbour has, the one the board has used least so far, so the thirteen spread over all of
    // them; with every one taken, the one fewest neighbours have
    const used = k => Object.values(out).filter(v => v === k).length, ks = hues.map((_, k) => k);
    const free = ks.filter(k => !taken.includes(k));
    out[h] = free.length ? free.sort((a, b) => used(a) - used(b) || a - b)[0] : ks.sort((a, b) => taken.filter(t => t === a).length - taken.filter(t => t === b).length || a - b)[0];
  }
  return out;
}
