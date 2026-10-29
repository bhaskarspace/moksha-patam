// The pixel art (src/render/art.js): every figure is whole, every stage has its female and neutral form, the animals walk,
// and the Hindi stage names agree with the player.
import test from "node:test";
import assert from "node:assert/strict";
import { ART, PAL, STAGES, ANIMALS, GENDERED, artOf, framesOf, stageHi } from "../src/render/art.js";

const LETTERS = new Set([".", "C", "c", ...Object.keys(PAL)]);

test("every figure is 12 x 16 in known colours, with two rows of legs for the other step", () => {
  for (const [k, a] of Object.entries(ART)) {
    assert.equal(a.rows.length, 16, k);
    assert.equal(a.legsB.length, 2, k);
    for (const r of [...a.rows, ...a.legsB, ...(a.behind ?? []).map(([, r]) => r)]) {
      assert.equal(r.length, 12, `${k}: ${r}`);
      for (const ch of r) assert.ok(LETTERS.has(ch), `${k}: ${ch}`);
    }
  }
});

test("every adult stage has a female and a neutral form; the baby and the child are shared", () => {
  for (const art of GENDERED) for (const g of ["f", "n"]) assert.ok(ART[`${art}_${g}`], `${art}_${g}`);
  for (const art of ["baby", "toddler"]) for (const g of ["m", "f", "n"]) assert.equal(artOf(art, g), ART[art]);
  for (const art of GENDERED) {
    assert.equal(artOf(art, "m"), ART[art]);
    assert.equal(artOf(art, undefined), ART[art]);
    assert.notDeepEqual(artOf(art, "f").rows, ART[art].rows, art);
  }
});

test("the neutral figures carry no beard or moustache", () => {
  for (const art of GENDERED) {
    const rows = ART[`${art}_n`].rows;
    assert.ok(!rows.join("").includes("W"), `${art}_n has a beard`);
    // the householder's moustache is a run of outline across the face below the eyes
    const eye = rows.findIndex(r => r.includes("E"));
    assert.ok(!/SKKKS/.test(rows[eye + 1]), `${art}_n has a moustache`);
  }
});

test("the long plait reads from behind on a ladder", () => {
  const back = framesOf(ART.youth_f, 2);
  assert.ok(back.slice(8, 11).every(r => r.slice(5, 7) === "HH"), back.join("\n"));
});

test("each animal walks on two frames and climbs as it walks", () => {
  for (const a of ANIMALS) {
    assert.ok(ART[a], a);
    assert.notDeepEqual(framesOf(ART[a], 0), framesOf(ART[a], 1), a);
    assert.deepEqual(framesOf(ART[a], 2), framesOf(ART[a], 0), a);
    // a thread in the player's colour at the neck
    assert.ok(ART[a].rows.join("").includes("C"), `${a} wears no thread`);
  }
});

test("the stage names agree in Hindi: feminine for a woman, masculine for a man and for the neutral", () => {
  const hi = g => STAGES.map(s => stageHi(s, g));
  assert.deepEqual(hi("f"), ["शिशु", "बालिका", "विद्यार्थिनी", "युवा विद्यार्थिनी", "गृहस्थ", "वानप्रस्थिनी", "संन्यासिनी", "दिव्य आत्मा"]);
  assert.deepEqual(hi("m"), ["शिशु", "बालक", "विद्यार्थी", "युवा विद्यार्थी", "गृहस्थ", "वानप्रस्थी", "संन्यासी", "दिव्य आत्मा"]);
  assert.deepEqual(hi("n"), hi("m"));
});
