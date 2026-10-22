// The ageing paints under the labels, so no wash may make a square's number or name harder to read
// than 4.5:1, or than it was before the wash where the shipped board was already below that.
import test from "node:test";
import assert from "node:assert/strict";
import { TOP, paletteTokens } from "../src/content.js";
import { groundOf, fills, WASH } from "../src/render/ground.js";

const token = paletteTokens();
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lum = c => { const [r, g, b] = c.map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const paint = (bg, fs) => fs.reduce((c, [t, a]) => c.map((v, i) => v * (1 - a) + rgb(token[t])[i] * a), bg);
// the label ink on each kind of square (styles.css: .lab .n, .lab.li .n, .lab .dv)
const ink = n => rgb(groundOf(n)[1] ? "#FFFFFF" : n > 100 ? "#5A1E08" : "#3A2208");

test("every wash colour is a Basohli palette token", () => {
  for (let n = 1; n <= TOP; n++) for (const [t] of fills(n, { sepia: 1, dim: 1 })) assert.ok(token[t], `${t} is not in the board's palette`);
});

for (const [name, w] of [["full sepia", { sepia: 1, dim: 0 }], ["half sepia", { sepia: 0.5, dim: 0 }], ["full dim", { sepia: 0, dim: 1 }], ["half dim", { sepia: 0, dim: 0.5 }]]) {
  test(`every label stays readable at ${name}`, () => {
    for (let n = 1; n <= TOP; n++) {
      // at the worn edge, the darkening is painted over the wash too
      const bg = rgb(groundOf(n)[0]), before = ratio(bg, ink(n)), after = ratio(paint(bg, [...fills(n, w), ["--b-black", WASH.edge]]), ink(n));
      assert.ok(after >= Math.min(4.5, before) - 1e-9, `square ${n}: ${before.toFixed(2)} → ${after.toFixed(2)}`);
    }
  });
}
