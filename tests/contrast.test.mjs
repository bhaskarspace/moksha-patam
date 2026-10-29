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

test("the fade at turya (Phase 16) is on the art alone: no label, card or token is in its rule", async () => {
  const css = (await import("node:fs")).readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const rules = [...css.matchAll(/([^{}]+)\{[^}]*var\(--clear/g)].map(m => m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim());
  assert.ok(rules.length >= 1);
  for (const sel of rules.flatMap(r => r.split(",").map(x => x.trim()))) {
    assert.ok(["#art", ".cell .pic"].includes(sel), `--clear is on ${sel}`);
  }
});

// ---- The tokens (src/render/art.js) ----
// Every figure is bounded by its outline on the left, the right and the top (the staff and the crown may stand proud of
// it), and the token's edge, the outline with its white halo (.token .spr in styles.css), keeps 3:1 against the ground
// of every square it can stand on: the animals only walk 1–40.
const { ART, PAL, ANIMALS, framesOf } = await import("../src/render/art.js");
const EDGE = new Set(["K", "B", "Y"]);
test("every figure is bounded by its outline", () => {
  for (const [k, a] of Object.entries(ART)) for (const f of [0, 1, 2, 3]) {
    const rows = framesOf(a, f), bad = [];
    rows.forEach((r, y) => {
      const xs = [...r].flatMap((c, x) => (c === "." ? [] : [x]));
      for (const x of xs.length ? [xs[0], xs.at(-1)] : []) if (!EDGE.has(r[x])) bad.push(`row ${y} at ${x}`);
    });
    for (let x = 0; x < 12; x++) { const y = rows.findIndex(r => r[x] !== "."); if (y >= 0 && !EDGE.has(rows[y][x])) bad.push(`top at ${x}`); }
    assert.deepEqual(bad, [], `${k}, frame ${f}`);
  }
});
test("every token's edge reads on every ground it can stand on", () => {
  const outline = rgb(PAL.K), halo = rgb("#FFFFFF");
  for (const [k] of Object.entries(ART)) {
    const last = ANIMALS.includes(k) ? 40 : TOP;
    for (let n = 1; n <= last; n++) {
      const bg = rgb(groundOf(n)[0]);
      assert.ok(Math.max(ratio(bg, outline), ratio(bg, halo)) >= 3, `${k} on square ${n}`);
    }
  }
});
