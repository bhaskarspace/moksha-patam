// Phase 20: a reference keeps its Latin digits in Hindi (Bhaskar, 12 Nov): "न्यायसूत्र 1.1.5", "सांख्यकारिका 59". Every
// other number a Hindi line says is in Devanagari ("घर ४२").
import test from "node:test";
import assert from "node:assert/strict";
import { tIn, srcIn } from "../src/i18n.js";

test("a Hindi line keeps its references in Latin digits, and says its other numbers in Devanagari", () => {
  assert.match(tIn("hi", "lawNyayaScholar"), /न्यायसूत्र 1\.1\.5/);
  assert.match(tIn("hi", "lawSankhyaScholar"), /सांख्यकारिका 59/);
  assert.match(tIn("hi", "lawYogaScholar"), /योगसूत्र 1\.2.*1\.12/);
  assert.doesNotMatch(tIn("hi", "lawYogaScholar"), /[०-९]/);
  assert.match(tIn("hi", "lWin", { name: "लता", pos: 105 }), /१०५/);
  assert.equal(srcIn("hi", "Mahabharata, Vana Parva 3.132"), "महाभारत, वन पर्व 3.132");
});
