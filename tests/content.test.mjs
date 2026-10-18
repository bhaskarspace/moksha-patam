import test from "node:test";
import assert from "node:assert/strict";
import { lintContent } from "../tools/lint-content.mjs";
import { READINGS, CODEX, REFS, sourceOf } from "../src/content.js";

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
