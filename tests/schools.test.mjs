// The schools as cast (REDESIGN.md Phase 20 step 3): who holds a darśana in a life, and how the account shows it.
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, playTurn } from "../src/engine/turn.js";
import { lifeOf, lifeText } from "../src/engine/account.js";
import { schoolsOf, SCHOOL_IDS, SCHOOL_ROLES, MEMBERS } from "../src/engine/cast.js";
import { CAST, SCHOOLS } from "../src/content.js";

const game = (seed, gender = "f") => createGame({ players: [{ name: "Meera", type: "cpu", gender }], rules: { six: true }, seed });
const played = (seed, gender) => { const s = game(seed, gender); while (!s.over) playTurn(s); return s; };

test("over ten thousand lives each school is held its fair share, by three roles, and each role holds three or more", () => {
  const N = 10000, bySchool = {}, roles = {}, schools = {};
  let holders = 0;
  for (let k = 0; k < N; k++) {
    // lives across seeds, lanes and rebirths
    const s = game(1000 + k);
    s.players[0].rebirths = k % 3;
    for (const h of schoolsOf(s, 0, k % 2)) {
      holders++;
      bySchool[h.school] = (bySchool[h.school] ?? 0) + 1;
      (roles[h.school] ||= new Set()).add(h.who);
      (schools[h.who] ||= new Set()).add(h.school);
      assert.ok(SCHOOL_ROLES[h.school].includes(h.who), `${h.who} may not hold ${h.school}`);
    }
  }
  for (const id of SCHOOL_IDS) {
    const share = (100 * bySchool[id]) / holders;
    assert.ok(Math.abs(share - 100 / 9) <= 1.5, `${id} is ${share.toFixed(2)}% of holders, not within 1.5 points of ${(100 / 9).toFixed(2)}`);
    assert.ok(roles[id].size >= 3, `${id} is held by ${roles[id].size} roles`);
  }
  for (const w of MEMBERS) assert.ok((schools[w]?.size ?? 0) >= 3, `${w} holds ${schools[w]?.size ?? 0} schools`);
  // one or two a life, about half each
  assert.ok(Math.abs(holders / N - 1.5) < 0.03, `${(holders / N).toFixed(3)} holders a life`);
});

test("two holders in one life hold different schools in different roles, and the draw is the same every time", () => {
  for (let k = 0; k < 500; k++) {
    const s = game(k), hs = schoolsOf(s, 0, 0);
    assert.deepEqual(hs, schoolsOf(s, 0, 0));
    if (hs.length === 2) { assert.notEqual(hs[0].school, hs[1].school); assert.notEqual(hs[0].who, hs[1].who); }
  }
});

test("a holder the life meets is seen holding the school in the account, never by the school's name", () => {
  let shown = 0;
  for (let seed = 1; seed <= 120; seed++) {
    for (const g of ["f", "m"]) {
      const s = played(seed, g);
      for (const l of ["en", "hi"]) {
        const life = lifeOf(s, 0, l);
        shown += life.schooled;
        const text = lifeText(s, 0, l);
        assert.doesNotMatch(text, /Mīmāṃsā|Cārvāka|Nyāya|Sāṃkhya|Advaita|\bJain\b|\bBhakti\b|\bYoga\b|Buddhis|मीमांसा|चार्वाक|सांख्य|अद्वैत|जैन|(?<!-)भक्ति|बौद्ध/, `seed ${seed} names a school`);
        assert.doesNotMatch(text, /\{who|\{name|undefined|null/, `seed ${seed} ${l} leaves a token`);
      }
    }
  }
  assert.ok(shown > 50, `only ${shown} school lines over 240 accounts`);
});

test("with the cast taken away there are no holders and no school lines", () => {
  const names = CAST.names;
  CAST.names = null;
  try {
    for (let seed = 1; seed <= 40; seed++) {
      const s = played(seed);
      assert.deepEqual(schoolsOf(s, 0, 0), []);
      for (const l of ["en", "hi"]) assert.equal(lifeOf(s, 0, l).schooled, 0);
    }
  } finally { CAST.names = names; }
});

test("every school written is one of the nine drawn, its figure only in the scholar note", () => {
  for (const [id, sc] of Object.entries(SCHOOLS)) {
    assert.ok(SCHOOL_IDS.includes(id));
    for (const k of ["hold", "back", "fate"]) for (const l of ["en", "hi", "hiHon"]) assert.ok(!sc[k][l].includes("{figure"), `${id} ${k}`);
  }
});

// Phase 20 review: a holder's hold line waits for an ordinary moment of theirs
const SEED_FRIEND_CARVAKA = 4;
const lived = (life, told) => {
  const s = createGame({ players: [{ name: "Meera", type: "cpu", gender: "f" }], rules: { six: true }, seed: SEED_FRIEND_CARVAKA });
  Object.assign(s.players[0], { life, pos: life.at(-1), told: told ?? life.map(() => null) });
  return s;
};
const HOLD = SCHOOLS.carvaka.hold.en.replace(/\{who:He\|She\} /, ""), BACK = "asked first whether";
const partsOf = s => lifeOf(s, 0, "en").paras.flatMap(p => p.parts);

test("the draw the placement tests rely on: in seed 4 the friend holds the Cārvāka's school", () => {
  assert.ok(schoolsOf(lived([1]), 0, 0).some(h => h.who === "friend" && h.school === "carvaka"));
});

test("a hold line is said where the life meets the holder on an ordinary moment", () => {
  const parts = partsOf(lived([1, 6]));
  assert.ok(parts.at(-1).includes(HOLD), parts.at(-1));
});

test("a hold line never follows a debt planted: it waits for the holder's next ordinary moment", () => {
  const parts = partsOf(lived([1, 15, 16], [null, "alone", null]));
  const met = parts.findIndex(t => /Her name is|His name is/.test(t));
  assert.ok(met >= 0 && !parts[met].includes(HOLD), `said on the debt: ${parts[met]}`);
  assert.ok(parts.at(-1).includes(HOLD), `not said on the next: ${parts.at(-1)}`);
  assert.ok(!parts.at(-1).includes(BACK), "a moment straight after is not a return");
});

test("a hold line that waited is said with the back line when the holder's next moment is a return", () => {
  const parts = partsOf(lived([1, 15, 17, 48], [null, "alone", null, null])), last = parts.at(-1);
  assert.ok(last.includes(HOLD) && last.includes(BACK) && last.indexOf(HOLD) < last.indexOf(BACK), last);
  assert.equal(parts.filter(t => t.includes(HOLD)).length, 1);
});

test("a hold line is never said on a snake, a death, a debt or a rebellion over 400 lives", () => {
  const holds = Object.values(SCHOOLS).map(sc => sc.hold.en.replace(/^.*?\}/, "").slice(0, 24));
  for (let seed = 1; seed <= 200; seed++) for (const g of ["f", "m"]) {
    const s = played(seed, g), p = s.players[0];
    if (p.rebirths) continue;
    const life = lifeOf(s, 0, "en");
    for (const t of life.paras.flatMap(x => x.parts)) {
      if (!holds.some(h => t.includes(h))) continue;
      assert.doesNotMatch(t, /fell|died|dies|is dying|meant to|the hand was quicker/i, `seed ${seed}: ${t}`);
    }
  }
});

test("every school's lines agree with a male and a female holder of every role it allows, in both languages", async () => {
  const { schoolLineIn } = await import("../src/engine/cast.js");
  const player = { name: "Meera", gender: "f" };
  for (const [id, sc] of Object.entries(SCHOOLS)) for (const who of SCHOOL_ROLES[id]) for (const gender of ["m", "f"]) {
    // a parent's gender is fixed by the role; the rest may be either
    if ((who === "mother" && gender === "m") || (who === "father" && gender === "f") || (who === "son" && gender === "f") || (who === "daughter" && gender === "m")) continue;
    for (const k of ["hold", "back", "fate"]) for (const l of ["en", "hi"]) {
      const t = sc[k], tpl = l === "hi" ? (["teacher", "mother", "father"].includes(who) && t.hiHon) || t.hi : t.en;
      const out = schoolLineIn(t, l, who, { name: "X", gender }, player);
      assert.doesNotMatch(out, /[{}]/, `${id} ${who} ${k} ${l}`);
      for (const [, a, b] of tpl.matchAll(/\{who:([^{}|]*)\|([^{}|]*)\}/g)) assert.ok(out.includes(gender === "f" ? b : a), `${id} ${who} ${gender} ${k} ${l}: ${out}`);
      if (l === "en") assert.doesNotMatch(out, gender === "f" ? /\b(?:he|his|him)\b/i : /\b(?:she|her|hers)\b/i, `${id} ${who} ${gender} ${k}: ${out}`);
    }
  }
});

test("in Hindi a name from names.json is in Devanagari, and a name the person typed stays as typed", () => {
  for (let seed = 1; seed <= 60; seed++) {
    const s = createGame({ players: [{ name: "", type: "cpu", gender: seed % 2 ? "f" : "m" }, { name: "Meera", type: "cpu", gender: "f" }], rules: { six: true }, seed });
    while (!s.over) playTurn(s);
    const drawn = lifeText(s, 0, "hi").replace(/\([^()]*\)/g, ""), typed = lifeText(s, 1, "hi");
    assert.doesNotMatch(drawn, /[A-Za-z]/, `seed ${seed}: ${drawn.match(/.{0,30}[A-Za-z]+.{0,30}/)?.[0]}`);
    // a life born again takes a drawn name (Phase 19), so only a first life keeps the one typed
    if (s.players[1].rebirths) continue;
    assert.match(typed, /Meera/);
    assert.doesNotMatch(typed.replace(/Meera/g, "").replace(/\([^()]*\)/g, ""), /[A-Za-z]/, `seed ${seed}: a cast name in Latin`);
  }
});

// Phase 20 review: no form that agrees with only one gender of the holder is left outside a {who:m|f} choice. Each line is
// rendered for a male and a female holder of every role its school allows; the male render may hold no word only the
// feminine choices have, and the female none only the masculine have. Words fixed in a line are checked apart: every
// Hindi word outside a choice that could agree with someone (it ends as a verb, participle or adjective would) is in
// FIXED, read and pinned with what it agrees with, so a new one fails until it is read.
const FIXED = new Set([
  // agree with a noun of the line, not the holder: अनुष्ठान, दलील, पक्ष, शरीर, बोझ, क्रिया-कर्म, क्षमा, यह, सब, जीव, कुछ
  "निभाया", "आधी", "लिखी", "गई", "आधा", "पूरा", "वाला", "रहा", "दिखता", "था", "थे", "गया", "माँगा", "माँगी", "आएगा", "आया", "टिका", "टूटता", "जाए", "चला", "पता",
  // ergative, so the verb follows its object, never the holder: उसने/उन्होंने/{who} ने …
  "कहा", "किया", "पूछा", "बताया",
  // invariant: the infinitive, the adverbial participle, the oblique and the possessive before a noun of the line
  "करना", "जानना", "पूछना", "टूटना", "हुए", "करते-करते", "गाते-गाते", "गुनगुनाते", "पत्ते", "अपनी", "उसका", "उसकी", "उनका", "उनकी", "का", "की",
  // agree with others in the line: सब सो रहे थे, जो नहीं रहे (the dead), सब … छोड़ चुके हैं, कोई पूछे
  "रहे", "चुके", "पूछे",
  // the auxiliary, which agrees in number and honour, never gender; the ergative and the honorific pronouns
  "है", "हैं", "ने", "उसने", "उन्होंने", "वे", "उसके", "इसे", "उसमें", "उनमें",
  // oblique infinitives and participles before a postposition, and the conjunctive -के, all invariant
  "उठने", "कहने", "जाने", "बैठने", "समेटने", "होने", "करके", "गिने-चुने",
  // postpositions, oblique nouns and adverbs
  "के", "से", "में", "नहीं", "पहले", "सबसे", "सबके", "सीधे", "नीचे", "ऐसे", "जैसे", "कैसे", "तड़के", "दिनों", "दूसरे", "अगले", "कमरे", "घरवालों", "वालों",
  // not verbs: nouns, pronouns, particles and adverbs
  "अँधेरा", "आख़िरी", "इसलिए", "ईमानदारी", "किसलिए", "किसी", "कोई", "क्या", "क्षमा", "चींटी", "ज़्यादा", "जा", "बाक़ी", "भी", "या", "वादा", "वही", "सीढ़ी", "ही",
]);
const ENDS = /[ाीेैंॉ]$|थी$|थीं$/;
test("no form that agrees with the holder is left outside a {who:m|f} choice, in any school's line", async () => {
  const { schoolLineIn, HONORED } = await import("../src/engine/cast.js");
  const choices = tpl => [...tpl.matchAll(/\{who:([^{}|]*)\|([^{}|]*)\}/g)];
  const words = s => s.split(/[\s,;:.।?!'"“”]+/).filter(Boolean);
  const unseen = [];
  for (const [id, sc] of Object.entries(SCHOOLS)) for (const k of ["hold", "back", "fate"]) for (const l of ["en", "hi", "hiHon"]) {
    const tpl = sc[k][l];
    if (!tpl) continue;
    const fixed = words(tpl.replace(/\{who:[^{}]*\}/g, " ").replace(/\{[^{}]*\}/g, " "));
    if (l !== "en") for (const w of fixed) if (ENDS.test(w) && !FIXED.has(w)) unseen.push(`${id} ${k} ${l}: ${w}`);
    const m = new Set(choices(tpl).flatMap(x => words(x[1]))), f = new Set(choices(tpl).flatMap(x => words(x[2])));
    const mOnly = [...m].filter(w => !f.has(w)), fOnly = [...f].filter(w => !m.has(w));
    for (const who of SCHOOL_ROLES[id]) for (const gender of ["m", "f"]) {
      if ((who === "mother" || who === "daughter") && gender === "m") continue;
      if ((who === "father" || who === "son") && gender === "f") continue;
      // the honorific is said of the teacher and the parents, the familiar of the rest
      if (l === "hiHon" && !HONORED.has(who)) continue;
      if (l === "hi" && HONORED.has(who) && sc[k].hiHon) continue;
      const out = words(schoolLineIn(sc[k], l === "en" ? "en" : "hi", who, { name: "X", gender }, { name: "Meera", gender: "f" })).filter(w => !fixed.includes(w));
      const wrong = out.filter(w => (gender === "m" ? fOnly : mOnly).includes(w));
      assert.deepEqual(wrong, [], `${id} ${k} ${l} for a ${gender === "m" ? "male" : "female"} ${who}: ${wrong.join(", ")}`);
    }
  }
  assert.deepEqual(unseen, [], "a word outside a choice that may agree with the holder: template it, or pin it in FIXED with what it agrees with");
});

// Phase 20 review: the closing's one line when the life's law is the school of a member it met
test("the same-law line is said exactly when the life's law is the school of a member it met, once, freed or not", async () => {
  const { castAlong } = await import("../src/engine/cast.js");
  const { yearsAlong } = await import("../src/engine/self.js");
  const LAW_SCHOOL = { mimamsa: "mimamsa", carvaka: "carvaka", jain: "jaina", bhakti: "bhakti", nyaya: "nyaya", sankhya: "samkhya", advaita: "advaita", yoga: "yoga", board: null };
  const seen = { said: 0, not: 0, freed: 0 };
  for (const [law, school] of Object.entries(LAW_SCHOOL)) for (let seed = 1; seed <= 60; seed++) {
    const s = createGame({ players: [{ name: "Meera", type: "cpu", gender: seed % 2 ? "f" : "m" }], rules: { six: true, law }, seed });
    while (!s.over) playTurn(s);
    if (s.players[0].rebirths) continue;
    const p = s.players[0], along = yearsAlong(p.life || [], p.told || []).filter(e => e.via !== "stay");
    const met = new Set(castAlong(s, 0, along).filter(c => c.meets).map(c => c.about));
    const want = !!school && schoolsOf(s, 0, 0).some(h => h.school === school && met.has(h.who));
    for (const l of ["en", "hi"]) {
      const text = lifeText(s, 0, l), n = (text.match(l === "en" ? /This life was lived under the same law/g : /यह जीवन उसी नियम पर चला/g) || []).length;
      assert.equal(n, want ? 1 : 0, `${law} seed ${seed} ${l}: said ${n} times, wanted ${want ? 1 : 0}`);
      // after the fate lines: the last thing the account says
      if (want) assert.match(text.trimEnd(), l === "en" ? /had lived by\.$/ : /जीवन जिया था।$/);
    }
    seen[want ? "said" : "not"]++;
    if (want && p.won) seen.freed++;
  }
  assert.ok(seen.said > 10 && seen.not > 10, JSON.stringify(seen));
});
