import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { lintContent, lintSprites, leadNames } from "../tools/lint-content.mjs";
import { fill, castFill } from "../src/i18n.js";
import { GOAL, TOP, READINGS, CODEX, REFS, SQ, SNAKES, LADDERS, HEAVEN, MOKSHA, FALL, sourceOf, leadOf, squareOf, fallOn } from "../src/content.js";

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

test("square 36 carries the three Vedanta readings, and 105 every school's moksha", () => {
  assert.deepEqual(READINGS[36].views.map(v => v.id), ["advaita", "vishishtadvaita", "dvaita"]);
  assert.ok(READINGS[105].views.length >= 6);
  assert.ok(REFS.advaita.includes(36) && REFS.advaita.includes(105));
  assert.ok(Object.keys(CODEX.schools).every(id => REFS[id]?.length));
});

test("the card contract: a square needs two voices, and its lead must name someone in both languages", () => {
  const savedVoices = READINGS[7].schools, savedLead = { ...SQ[7].mirror };
  READINGS[7].schools = savedVoices.slice(0, 1);
  SQ[7].mirror.en = "Play teaches sharing and waiting your turn.";
  try {
    const errors = lintContent();
    assert.ok(errors.includes("square 7: one voice: a disagreement needs two schools in readings.json"));
    assert.ok(errors.includes("square 7 mirror: names nobody"));
    SQ[7].mirror = { en: savedLead.en, hi: "खेल से बाँटना आता है।" };
    assert.ok(lintContent().some(e => e.startsWith("square 7 mirror: the Hindi drops the name")));
  } finally {
    READINGS[7].schools = savedVoices; SQ[7].mirror = savedLead;
  }
});

test("a generic Hindi word never passes for a name on its own", () => {
  // "अग्नि" is Agni and also plain fire; with no name in the English, the Hindi cannot rescue the lead
  assert.deepEqual(leadNames(["Desire grows like a fire fed with ghee.", "इच्छा घी से अग्नि की तरह बढ़ती है।"]).en, []);
  assert.ok(leadNames(leadOf(79)).en.includes("Gargi") && leadNames(leadOf(79)).hi);
});

test("square 105 sets six definitions of moksha side by side, and the three outside the Veda after them", () => {
  assert.deepEqual(READINGS[105].views.map(v => v.id), ["nyaya", "samkhya", "mimamsa", "advaita", "vishishtadvaita", "dvaita"]);
  assert.deepEqual(READINGS[105].beyond.map(v => v.id).sort(), ["bauddha", "carvaka", "jaina"]);
});

test("the sprite lint holds the Basohli palette and one outline weight", () => {
  const svg = fs.readFileSync(new URL("../assets/sprites.svg", import.meta.url), "utf8");
  assert.deepEqual(lintSprites(svg), []);
  const bad = svg.replace('fill="#C8352A"', 'fill="#FF00FF"').replace('stroke-width="1.25"', 'stroke-width="2"').replace('id="sq-50"', 'id="sq-x"');
  const errors = lintSprites(bad);
  assert.ok(errors.some(e => e.includes("#FF00FF")));
  assert.ok(errors.some(e => e.includes("outline weights other than 1.25 at 24")));
  assert.ok(errors.includes("sprites.svg: no symbol for square 50"));
});

test("Hindi agreement: the player as subject needs a {m|f} choice", async () => {
  const { hindiAgreement, englishPronouns } = await import("../tools/lint-content.mjs");
  assert.deepEqual(hindiAgreement("{name} बड़ा हुआ।").errors, ["बड़ा", "हुआ"]);
  assert.deepEqual(hindiAgreement("{name} {बड़ा हुआ|बड़ी हुई}।").errors, []);
  assert.deepEqual(hindiAgreement("{name} ने देखा।").errors, []);           // ergative: no agreement
  assert.deepEqual(hindiAgreement("{name} की माँ थक गई।").errors, []);      // the mother is the subject
  assert.deepEqual(hindiAgreement("{name} रोज़ खाना बनाता है।").warnings, ["बनाता"]);
  assert.deepEqual(englishPronouns("{name} is seven and says it was not him."), ["him"]);
  assert.deepEqual(englishPronouns("{name}'s father is dying. He asks for grass."), []);
});

test("every moment, once written, names the player in both languages", () => {
  const q = SQ[7], saved = q.moment;
  q.moment = { en: "{name} is four.", hi: "चार साल का बच्चा।" };
  try {
    assert.ok(lintContent().includes("square 7 moment: the Hindi does not name the player with {name}"));
    q.moment = { en: "{name} is four." };
    assert.ok(lintContent().includes("square 7 moment: exists in English only"));
  } finally {
    if (saved) q.moment = saved; else delete q.moment;
  }
});

test("Phase 4: the five paired snake tails name their remedy", () => {
  const withRemedy = Object.keys(SQ).filter(n => SQ[n].remedy).map(Number);
  assert.deepEqual(withRemedy, [22, 43, 50, 64, 71]);
  for (const n of withRemedy) assert.ok(Object.values(SNAKES).some(s => s.to === n) && LADDERS[n + 1]);
});

// Phase 7 moved Moksha from 110 to 105 and the five gods above it up one square. Each god's writing, readings
// and sprite must have travelled with the god, not stayed with the number (REDESIGN.md Phase 7, the trap).
// Keyed by name: [square, an anchor in the moment, an anchor in the mirror, figures, first school, sprite].
// The sprite hashes were taken from main before the move; change one only when that sprite is redrawn on purpose.
const ROW = {
  Indra: [101, "good deeds", "Svarga", ["kumarila"], "mimamsa", "b985f603ce"],
  Agni: [102, "offerings", "offering", [], "mimamsa", "fb703c4a21"],
  Surya: [103, "was seen", "witness", [], "carvaka", "e0d15131f3"],
  Ganesha: [104, "painted on one door", "obstacles", ["patanjali"], "yoga", "de40541397"],
  Lakshmi: [106, "divided", "lotus", [], "vishishtadvaita", "57089a1789"],
  Saraswati: [107, "one sentence", "swan", [], "nyaya", "8781a91468"],
  Brahma: [108, "nose", "doubts him", ["kumarila"], "vaisheshika", "d67337d12a"],
  Vishnu: [109, "habit", "preserver", [], "dvaita", "4429643340"],
  Shiva: [110, "name comes loose", "dissolves", ["abhinavagupta"], "trika", "7f59c602f3"],
};
const SVG = fs.readFileSync(new URL("../assets/sprites.svg", import.meta.url), "utf8");
const isVignette = id => new RegExp(`<symbol id="${id}" class="vg"`).test(SVG);
const spriteHash = id => {
  const m = SVG.match(new RegExp(`<symbol id="${id}"[^>]*>([\\s\\S]*?)</symbol>`));
  return m && crypto.createHash("sha1").update(m[1]).digest("hex").slice(0, 10);
};

test("Phase 7: every god kept its own moment, mirror, readings and sprite when Moksha took 105", () => {
  assert.deepEqual(Object.keys(HEAVEN).map(Number), Object.values(ROW).map(r => r[0]));
  for (const [god, [n, moment, mirror, figures, school, sprite]] of Object.entries(ROW)) {
    assert.equal(HEAVEN[n].en, god, `square ${n} is not ${god}`);
    assert.ok(HEAVEN[n].moment.en.includes(moment), `${god}'s moment does not contain "${moment}"`);
    assert.ok(HEAVEN[n].mirror.en.includes(mirror), `${god}'s mirror does not contain "${mirror}"`);
    assert.deepEqual(READINGS[n].figures || [], figures, `${god}'s people`);
    assert.equal(READINGS[n].schools[0].id, school, `${god}'s first school`);
    // since Phase 13 a god's square may carry its painted vignette instead, drawn for that god in art/vignettes.mjs
    if (!isVignette(`sq-${n}`)) assert.equal(spriteHash(`sq-${n}`), sprite, `${god}'s sprite is not on sq-${n}`);
  }
  assert.ok(HEAVEN[108].src, "Brahma's citation travels with Brahma");
});

test("Phase 7: Moksha is 105, the exit, with no sprite (since Phase 13 a vignette for its card alone); Phase 12: the fall is past 110, shown on its card", () => {
  assert.equal(GOAL, 105);
  assert.equal(TOP, 110);
  assert.equal(squareOf(105), MOKSHA);
  assert.ok(spriteHash("sq-105") === null || isVignette("sq-105"), "105 carries no sprite, only the card's vignette");
  assert.equal(squareOf(108), HEAVEN[108]);
  // the Brahma snake is retired: no snake starts in the heavens, and its card is the fall's
  assert.ok(Object.keys(SNAKES).every(h => +h < 101));
  assert.equal(fallOn(TOP), FALL);
  assert.equal(fallOn(108), null);
  assert.ok(FALL.src.startsWith("Bhagavad Gita") && FALL.to === undefined);
  assert.equal(spriteHash("fall"), "409050c182");
  assert.equal(spriteHash("sn-108"), null);
  assert.ok(REFS.gita?.includes(TOP) && REFS.mimamsa.includes(TOP));
});

// Phase 17 (Bhaskar, 29 Oct): a choice whose forms have a space in them ("{का होगा|की होगी}") keeps it. Every string in
// content/*.json with such a choice, in either language, filled for each gender, says the chosen form whole.
test("a {m|f|n} choice with a space inside keeps the space, in every string that has one", () => {
  const CHOICE = /\{([^{}|:=]*(?:\|[^{}|]*){1,2})\}/g, found = [];
  const walk = (x, at) => {
    if (typeof x === "string") { for (const m of x.matchAll(CHOICE)) if (/ /.test(m[1])) found.push({ at, text: x, forms: m[1].split("|") }); }
    else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) walk(v, `${at}.${k}`);
  };
  for (const f of fs.readdirSync(new URL("../content/", import.meta.url)).filter(f => f.endsWith(".json")))
    walk(JSON.parse(fs.readFileSync(new URL(`../content/${f}`, import.meta.url), "utf8")), f);
  assert.ok(found.some(c => c.at.endsWith("hi.optDebt")), "optDebt is among them");
  for (const { at, text, forms } of found)
    for (const [k, gender] of ["m", "f", "n"].entries()) {
      const want = forms[k] ?? forms[0];
      assert.ok(fill(castFill(text), { name: "X", gender, age: "Y" }).includes(want), `${at} (${gender}): "${want}"`);
    }
});
