import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { lintContent, lintSprites, leadNames } from "../tools/lint-content.mjs";
import { READINGS, CODEX, REFS, SQ, sourceOf, leadOf } from "../src/content.js";

test("all content passes the lint", () => {
  assert.deepEqual(lintContent(), []);
});

test("the lint catches missing Hindi and unknown schools", () => {
  const saved = READINGS[36].schools;
  READINGS[36].schools = [{ id: "nobody", en: "An English line" }];
  try {
    const errors = lintContent();
    assert.ok(errors.some(e => e.includes("readings.36.schools[0]: no Hindi")));
    assert.ok(errors.some(e => e.includes('unknown school "nobody"')));
  } finally {
    if (saved) READINGS[36].schools = saved; else delete READINGS[36].schools;
  }
});

test("citations map to Codex sources by prefix", () => {
  assert.equal(sourceOf("Chandogya Upanishad 6.8.7"), "chandogya");
  assert.equal(sourceOf("Mahabharata, Adi Parva"), "mahabharata");
  assert.equal(sourceOf(""), null);
});

test("square 36 carries the three Vedanta readings, and 110 every school's moksha", () => {
  assert.deepEqual(READINGS[36].views.map(v => v.id), ["advaita", "vishishtadvaita", "dvaita"]);
  assert.ok(READINGS[110].views.length >= 6);
  assert.ok(REFS.advaita.includes(36) && REFS.advaita.includes(110));
  assert.ok(Object.keys(CODEX.schools).every(id => REFS[id]?.length));
});

test("the card contract: a square needs two voices, and its lead must name someone in both languages", () => {
  const savedVoices = READINGS[7].schools, savedLead = [SQ[7][3], SQ[7][4]];
  READINGS[7].schools = savedVoices.slice(0, 1);
  SQ[7][3] = "Play teaches sharing and waiting your turn.";
  try {
    const errors = lintContent();
    assert.ok(errors.includes("square 7: one voice: a disagreement needs two schools in readings.json"));
    assert.ok(errors.includes("square 7 lead: names nobody"));
    SQ[7][3] = savedLead[0]; SQ[7][4] = "खेल से बाँटना आता है।";
    assert.ok(lintContent().some(e => e.startsWith("square 7 lead: the Hindi drops the name")));
  } finally {
    READINGS[7].schools = savedVoices; [SQ[7][3], SQ[7][4]] = savedLead;
  }
});

test("a generic Hindi word never passes for a name on its own", () => {
  // "अग्नि" is Agni and also plain fire; with no name in the English, the Hindi cannot rescue the lead
  assert.deepEqual(leadNames(["Desire grows like a fire fed with ghee.", "इच्छा घी से अग्नि की तरह बढ़ती है।"]).en, []);
  assert.ok(leadNames(leadOf(79)).en.includes("Gargi") && leadNames(leadOf(79)).hi);
});

test("square 110 sets six definitions of moksha side by side, and the three outside the Veda after them", () => {
  assert.deepEqual(READINGS[110].views.map(v => v.id), ["nyaya", "samkhya", "mimamsa", "advaita", "vishishtadvaita", "dvaita"]);
  assert.deepEqual(READINGS[110].beyond.map(v => v.id).sort(), ["bauddha", "carvaka", "jaina"]);
});

test("the sprite lint holds the Basohli palette and one outline weight", () => {
  const svg = fs.readFileSync(new URL("../assets/sprites.svg", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.deepEqual(lintSprites(svg, css), []);
  const bad = svg.replace('fill="#C8352A"', 'fill="#FF00FF"').replace('stroke-width="1.25"', 'stroke-width="2"').replace('id="sq-50"', 'id="sq-x"');
  const errors = lintSprites(bad, css);
  assert.ok(errors.some(e => e.includes("#FF00FF")));
  assert.ok(errors.some(e => e.includes("outline weights other than 1.25")));
  assert.ok(errors.includes("sprites.svg: no symbol for square 50"));
});
