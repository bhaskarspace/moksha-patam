// ---- The painted ground of each square, and how the ageing washes it ----
// Pure, so tests can check every square's text contrast after the strongest wash (tests/contrast.test.mjs).
import { GOAL, ROWS } from "../content.js";

// [background, light ink?]: the bright printed colours of the traditional board.
export const PALETTE = [["#D2402E", true], ["#F2C232", false], ["#3A78C2", true], ["#EC8A2E", false], ["#3F9A52", true], ["#7CC3E8", false]];
// the heaven row's gradient at its middle stop, and the goal's, for contrast checks
const HEAVEN_MID = "#F2C14E", GOAL_MID = "#1E2A78";

export function colRow(n) {
  const i = n - 1, row = Math.floor(i / 10);
  const col = row % 2 === 0 ? i % 10 : 9 - (i % 10);
  return { col, row };
}
// Square n's ground colour and whether its label is written in light ink.
export function groundOf(n) {
  if (n === GOAL) return [GOAL_MID, true];
  if (n > 100) return [HEAVEN_MID, false];
  const { col, row } = colRow(n);
  return PALETTE[(col + 2 * row) % PALETTE.length];
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
