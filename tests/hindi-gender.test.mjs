// Phase 20: every Hindi string that names a player agrees with the seat's gender, or says it so that the verb agrees with
// something else ("लता का पासा", "{name} के बरस … पूरे हुए"). Each is rendered for a woman and for a man, as the page
// renders it (fill, with the seat's gender), and neither may put its player into the other's verb, nor into the plural
// a mixed or unknown company takes.
import test from "node:test";
import assert from "node:assert/strict";
import { STR } from "../src/content.js";
import { tIn, fill } from "../src/i18n.js";

const VERBS = ["पहुँचे", "पहुँचा", "पहुँची", "चले", "चला", "चली", "जीते", "जीता", "जीती", "रहे हैं", "रहा है", "रही है", "आया", "आई", "गया", "गई", "ठहरा", "ठहरी", "बसा", "बसी", "जिया", "रहा", "रही", "खड़े थे", "खड़ा था", "खड़ी थी", "थे", "थीं"];
const M = new Set(["पहुँचे", "पहुँचा", "चले", "चला", "जीते", "जीता", "रहे हैं", "रहा है", "आया", "गया", "ठहरा", "बसा", "जिया", "रहा", "खड़े थे", "खड़ा था", "थे"]);
const F = new Set(["पहुँचे", "पहुँची", "चले", "चली", "जीते", "जीती", "रहे हैं", "रही है", "आई", "गई", "ठहरी", "बसी", "रही", "खड़े थे", "खड़ी थी", "थे", "थीं"]);
// the name as the subject: not followed by a postposition that makes something else the subject
const POST = ["का", "के", "की", "ने", "को", "से", "और", "पर", "तक", "में", "के लिए"];
const DEV = "ऀ-ॣॱ-ॿ";
const subjectVerbs = (text, name) => {
  const out = [];
  for (const m of text.matchAll(new RegExp(name, "g"))) {
    const rest = text.slice(m.index + name.length).trimStart();
    if (POST.some(p => rest.startsWith(p + " ") || rest.startsWith(p + "।"))) continue;
    // the clause the name begins: up to the next comma, colon, danda or semicolon
    const clause = rest.split(/[,।:;]/)[0];
    for (const v of VERBS) if (new RegExp(`(?<![${DEV}])${v}(?![${DEV}])`).test(clause)) out.push(v);
  }
  return out;
};

const named = Object.entries(STR.hi).filter(([, v]) => typeof v === "string" && v.includes("{name}"));
const values = { a: "५", b: "१", v: "५", pos: "४२", to: "१२", what: "गृह", age: "बीस", at: "दस", other: "समीर", sq: "गृह", src: "१२", realm: "अग्नि", years: "दो", n: "दो" };

test("each Hindi line that names a player agrees with a woman's seat and with a man's", () => {
  const wrong = [];
  for (const [k] of named) {
    const f = fill(tIn("hi", k, { ...values, name: "लता" }), { gender: "f" });
    const m = fill(tIn("hi", k, { ...values, name: "रवि" }), { gender: "m" });
    const fv = subjectVerbs(f, "लता").filter(v => !F.has(v) || v === "पहुँचे" || v === "चले" || v === "जीते" || v === "रहे हैं" || v === "थे" || v === "खड़े थे");
    const mv = subjectVerbs(m, "रवि").filter(v => !M.has(v) || v === "पहुँचे" || v === "चले" || v === "जीते" || v === "रहे हैं" || v === "थे" || v === "खड़े थे");
    if (fv.length) wrong.push(`${k} (f): ${f} [${fv}]`);
    if (mv.length) wrong.push(`${k} (m): ${m} [${mv}]`);
  }
  assert.deepEqual(wrong, []);
});

// A line about one player that says pahuṃce, cale, jīte or rahe haiṃ outside a {m|f} choice has put the player in the
// plural (the subject may be left unsaid: "{name} का {v} आया: … में पहुँचे")
const PLURAL = new RegExp(`(?<![${DEV}])(?:पहुँचे|चले|जीते|रहे हैं|चढ़े|गिरे|लौटे|ठहरे)(?![${DEV}]|-| जा)`); // not जीते-जी (while alive), nor बरस चले जाते (the years go)
test("no line about one player puts the player in the plural", () => {
  const plural = named.filter(([, v]) => PLURAL.test(v.replace(/\{[^{}]*\|[^{}]*\}/g, "")) && !/\{other\}/.test(v)).map(([k, v]) => `${k}: ${v}`);
  assert.deepEqual(plural, []);
});

test("the lines reviewed on 12 Nov say the seat's gender", () => {
  for (const [k, f, m] of [
    ["rolling", "लता पासा फेंक रही है…", "रवि पासा फेंक रहा है…"],
    ["wins", "लता जीती", "रवि जीता"],
    ["lHeaven", "अग्नि लोक में पहुँची", "अग्नि लोक में पहुँचा"],
    ["lDice", "५ से चली", "५ से चला"],
  ]) {
    assert.ok(fill(tIn("hi", k, { ...values, what: "अग्नि", name: "लता" }), { gender: "f" }).includes(f), k);
    assert.ok(fill(tIn("hi", k, { ...values, what: "अग्नि", name: "रवि" }), { gender: "m" }).includes(m), k);
  }
});
