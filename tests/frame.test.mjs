// The illuminated frame (render/frame.js) is drawn from the Basohli tokens, holds the square's sprite when there is
// one and its emoji when there isn't, and shares the sprites' one outline weight.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { illumined } from "../src/render/frame.js";
import { paletteTokens } from "../src/content.js";

const css = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = new Set(Object.keys(paletteTokens()));
const rules = [...css.matchAll(/([^{}]*\.ill\b[^{}]*)\{([^}]*)\}/g)].map(m => [m[1].trim(), m[2]]);

test("every colour the frame is painted with is a Basohli token", () => {
  assert.ok(rules.length > 5, "no frame rules found in styles.css");
  for (const [sel, body] of rules) {
    for (const [, v] of body.matchAll(/(?:fill|stroke|--field|--corner):\s*([^;]+)/g)) {
      if (/^(none|var\(--field\)|var\(--corner\))$/.test(v.trim())) continue;
      const t = v.match(/^var\((--b-[\w-]+)\)$/)?.[1];
      assert.ok(t && tokens.has(t), `${sel}: ${v.trim()} is not a palette token`);
    }
  }
});

test("each kind of card gives the arch its own field", () => {
  const fields = new Map(rules.filter(([sel]) => /\.leaf\.\w+ \.ill$/.test(sel)).map(([sel, b]) => [sel.match(/\.leaf\.(\w+)/)[1], b.match(/--field:\s*([^;]+)/)?.[1]]));
  for (const k of ["virtue", "vice", "heaven", "goal"]) assert.ok(fields.get(k), `no field for ${k}`);
  assert.notEqual(fields.get("virtue"), fields.get("vice"));
});

test("the frame holds the sprite, or the emoji in its place, never nothing", () => {
  const withSprite = illumined("sq-34", "🙏");
  assert.match(withSprite, /<use href="#sq-34"/);
  assert.doesNotMatch(withSprite, /<text/);
  const without = illumined(null, "🙏");
  assert.match(without, /<text[^>]*>🙏<\/text>/);
  assert.doesNotMatch(without, /<use/);
});

test("the frame's lines are the sprites' weight, set in CSS, with no colours of its own", () => {
  const svg = illumined("sq-1", "");
  assert.doesNotMatch(svg, /(fill|stroke|stroke-width)="/);
  assert.match(rules.find(([sel]) => sel === ".ill .ink")?.[1] || "", /stroke-width:\s*1\.25/);
});

test("the picture is drawn whole, never clipped to the arch", () => {
  assert.doesNotMatch(illumined("sq-3", ""), /clip-path|clipPath/);
});
