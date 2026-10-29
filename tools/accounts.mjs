// Every life account for a run of seeds, one sha256 per account, so two builds can be compared byte for byte.
// Phase 10C's acceptance test: with the cast list stripped, every account must be the account Phase 10 wrote.
//   node tools/accounts.mjs [seeds=2000] [--root=<checkout>] [--cast=off] [--full] [--tag]
// --root reads the engine from another checkout (a worktree of main, say) instead of this one. --cast=off takes the
// cast's names away (content/names.json `cast`), which must give back every account exactly. --full prints the
// accounts themselves instead of their hashes. Each seed is played twice: one named player in each gender, read in
// both languages, and two unnamed computers, so drawn names and the second player are covered too. --tag adds "above" to
// each hash whose game went above the exit (REDESIGN.md Phase 12): a bounce, the Brahma snake, the heavens or the fall,
// which is everything Phase 12's first step changed, so every untagged account must be the same before and after it. Its
// second step adds "karma" to each game in which a debt came due, the door refused someone, or someone carried a debt
// within a throw of the door (where a computer would rather stand short than be refused): the ledger alone touches
// nothing else, so every account untagged by either must be the same as the first step's. "door" marks a game whose
// account tells the door's refusal, or whose fall still carried a debt down: every account without it must be main's.
// Phase 14 adds --curse=off, which takes the curses away (content/curses.json), and "curse", which marks an account that
// tells one: with the curses off, every account untagged above, karma or door must be the same as main's.
// Phase 15 adds "witness": a game in which the ego threw on someone's choice (REDESIGN.md Phase 15), or an account that
// joins a cast return by what they witnessed. Every account untagged witness must be the same as main's.
// Phase 16 adds "death": a game in which the death tier came (it kills now, and before it sent the life back), or someone
// sat at the door (penance is two years a weight, and a weight-three debt no penance pays). Every account untagged death
// must be the same as main's. Its second step adds "mirror": an account whose mirror (src/engine/mirror.js) asks first
// about a rebellion. The mirror is no part of the book, so every account, tagged or not, must be the same as main's.
// Its third step adds --lives=2: each named life that ended without the door is born again (src/engine/samskara.js) as an
// unnamed computer on the seed hash(seed, 1), and that second life's account is hashed too, tagged "rebirth". A first
// life never reads saṃskāra, so every line without the tag must be the same as main's. Its fourth step plays the animal
// interlude a death by ledger is owed before that second life (src/engine/animal.js), each round's account hashed and
// tagged "animal" as well as "rebirth".
// Phase 17 makes Śiva's snake rebirth in the seat: a game can hold several lives a seat (p.past). The first is hashed
// under the seat's own key, as before, and each after it under the key with " sivaN", tagged "siva" (and "above", since
// only the heavens lead there). Every untagged account must be the same as main's.
// Its step 4 follow-up rewords the Hindi ("बरस पर" → "बरस की उम्र में", "खाना {n}" → "घर {n}"): "wording" marks a Hindi
// account that says either. Every English account, and every Hindi one untagged wording, must be the same as before.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2), flags = Object.fromEntries(args.filter(a => a.startsWith("--")).map(a => { const [k, v = true] = a.slice(2).split("="); return [k, v]; }));
const seeds = +(args.find(a => !a.startsWith("--")) ?? 2000);
const root = path.resolve(flags.root ?? path.join(import.meta.dirname, ".."));
const load = f => import(pathToFileURL(path.join(root, f)).href);
const [{ createGame, playTurn }, { lifeOf, lifeText }, content, { cast }] = await Promise.all(["src/engine/turn.js", "src/engine/account.js", "src/content.js", "src/state.js"].map(load));
// the mirror, in a checkout that has one
const { mirrorOf } = fs.existsSync(path.join(root, "src/engine/mirror.js")) ? await load("src/engine/mirror.js") : {};
const { soulOf, bornOf, pastOf } = fs.existsSync(path.join(root, "src/engine/samskara.js")) ? await load("src/engine/samskara.js") : {};
const { lifeSeed } = flags.lives ? await load("tools/sim.mjs") : {};
const { animalRules, afterAnimal } = flags.lives ? await load("src/engine/animal.js") : {};
if (flags.cast === "off") {
  if (!content.CAST) throw new Error(`${root} has no cast to take away`);
  content.CAST.names = null;
}
if (flags.curse === "off" && content.CURSES) content.CURSES.list = null;

const play = (players, seed, rules = { six: true }) => {
  const s = createGame({ players, rules, seed });
  s.above = s.karma = s.witness = s.death = false;
  while (!s.over) {
    // a debt carried within a throw of the door changes how a computer moves there, even when the door is never reached
    const p = s.players[s.turn], k = p.karma;
    if (k && k.agami.length + k.prarabdha.length && p.pos >= content.GOAL - 6) s.karma = true;
    const plan = playTurn(s);
    if (plan.fell || plan.path.some(n => n > content.GOAL)) s.above = true;
    if (plan.reckon || plan.refused) s.karma = true;
    if (plan.ego) s.witness = true;
    if (plan.reckon?.wouldDie || (plan.sit && plan.from === content.GOAL)) s.death = true;
  }
  // the door (Bhaskar's check of Phase 12): an account that tells a refusal, or a fall that still carried a debt down
  s.door = s.players.some(p => p.refusals?.length || (p.fell && p.karma?.sancita?.length));
  s.curse = s.players.some(p => p.curse);
  return s;
};
const hash = t => crypto.createHash("sha256").update(t).digest("hex");
const tally = { intros: 0, returns: 0, fates: 0, lives: 0 };
const out = [];
// every life seat i lived in game s, the first under key itself (Phase 17)
const say = (key, s, i, l) => {
  const past = s.players[i].past ?? [];
  if (!past.length) return sayOne(key, s, i, l);
  [...past.map((_, k) => pastOf(s, i, k)), s].forEach((v, k) => {
    if (k) v = { ...v, siva: true };
    sayOne(k ? `${key} siva${k}` : key, v, i, l);
  });
};
const sayOne = (key, s, i, l) => {
  const text = lifeText(s, i, l), life = lifeOf(s, i, l);
  out.push(flags.full ? `## ${key}\n${text}` : `${key} ${hash(text)}${flags.tag ? (s.above ? " above" : "") + (s.karma ? " karma" : "") + (s.door ? " door" : "") + (s.curse ? " curse" : "") + (s.witness || life.witnessed ? " witness" : "") + (s.death ? " death" : "") + (mirrorOf?.(s, i)[0]?.id === "rebel" ? " mirror" : "") + (s.rebirth ? " rebirth" : "") + (s.animal ? " animal" : "") + (s.siva ? " siva" : "") + (l === "hi" && /बरस की उम्र में|घर [०-९\d]/.test(text) ? " wording" : "") : ""}`);
  if (l === "en" && life.fates) {
    tally.lives++;
    tally.fates += life.fates.length;
    tally.intros += (text.match(/(?:His|Her) name is /g) || []).length;
    tally.returns += (text.match(/, (?:was there again|was waiting|was back|was still there): /g) || []).length;
  }
};
for (let seed = 1; seed <= seeds; seed++) {
  for (const gender of ["m", "f"]) {
    const s = play([{ name: "Meera", type: "cpu", gender }], seed);
    for (const l of ["en", "hi"]) say(`${seed} one ${gender} ${l}`, s, 0, l);
    // the life after, born of this one, when it ended without the door
    // after a death by ledger, the animal interlude first, each round hashed and tagged "animal"
    let soul = +flags.lives > 1 ? soulOf?.(s, 0) : null;
    for (let r = 0; soul?.animal; r++) {
      const a = play([{ name: "", alias: { en: "Ravi", hi: "रवि" }, type: "cpu", gender }], (lifeSeed(seed, 1) ^ Math.imul(r + 1, 0x9e3779b1)) >>> 0, animalRules(soul.animal, { six: true }));
      a.rebirth = a.animal = true;
      for (const l of ["en", "hi"]) say(`${seed} one ${gender} ${l} animal${r + 1}`, a, 0, l);
      soul = afterAnimal(soul, !!a.players[0].earned);
    }
    const born = soul && bornOf?.(soul);
    if (born) {
      const t = play([{ name: "", alias: { en: "Ravi", hi: "रवि" }, type: "cpu", gender, born }], lifeSeed(seed, 1));
      t.rebirth = true;
      for (const l of ["en", "hi"]) say(`${seed} one ${gender} ${l} life2`, t, 0, l);
    }
  }
  const s = play(cast([{ name: "", type: "cpu", gender: "" }, { name: "", type: "cpu", gender: "" }], seed), seed);
  for (const i of [0, 1]) for (const l of ["en", "hi"]) say(`${seed} two p${i} ${l}`, s, i, l);
}
process.stdout.write(out.join("\n") + "\n");
if (tally.lives) console.error(`${tally.lives} lives in English: ${tally.intros} introductions, ${tally.returns} returns, ${tally.fates} fates`);
