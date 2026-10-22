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
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2), flags = Object.fromEntries(args.filter(a => a.startsWith("--")).map(a => { const [k, v = true] = a.slice(2).split("="); return [k, v]; }));
const seeds = +(args.find(a => !a.startsWith("--")) ?? 2000);
const root = path.resolve(flags.root ?? path.join(import.meta.dirname, ".."));
const load = f => import(pathToFileURL(path.join(root, f)).href);
const [{ createGame, playTurn }, { lifeOf, lifeText }, content, { cast }] = await Promise.all(["src/engine/turn.js", "src/engine/account.js", "src/content.js", "src/state.js"].map(load));
if (flags.cast === "off") {
  if (!content.CAST) throw new Error(`${root} has no cast to take away`);
  content.CAST.names = null;
}

const play = (players, seed) => {
  const s = createGame({ players, rules: { six: true }, seed });
  s.above = s.karma = false;
  while (!s.over) {
    // a debt carried within a throw of the door changes how a computer moves there, even when the door is never reached
    const p = s.players[s.turn], k = p.karma;
    if (k && k.agami.length + k.prarabdha.length && p.pos >= content.GOAL - 6) s.karma = true;
    const plan = playTurn(s);
    if (plan.fell || plan.path.some(n => n > content.GOAL)) s.above = true;
    if (plan.reckon || plan.refused) s.karma = true;
  }
  // the door (Bhaskar's check of Phase 12): an account that tells a refusal, or a fall that still carried a debt down
  s.door = s.players.some(p => p.refusals?.length || (p.fell && p.karma?.sancita?.length));
  return s;
};
const hash = t => crypto.createHash("sha256").update(t).digest("hex");
const tally = { intros: 0, returns: 0, fates: 0, lives: 0 };
const out = [];
const say = (key, s, i, l) => {
  const text = lifeText(s, i, l);
  out.push(flags.full ? `## ${key}\n${text}` : `${key} ${hash(text)}${flags.tag ? (s.above ? " above" : "") + (s.karma ? " karma" : "") + (s.door ? " door" : "") : ""}`);
  const life = lifeOf(s, i, l);
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
  }
  const s = play(cast([{ name: "", type: "cpu", gender: "" }, { name: "", type: "cpu", gender: "" }], seed), seed);
  for (const i of [0, 1]) for (const l of ["en", "hi"]) say(`${seed} two p${i} ${l}`, s, i, l);
}
process.stdout.write(out.join("\n") + "\n");
if (tally.lives) console.error(`${tally.lives} lives in English: ${tally.intros} introductions, ${tally.returns} returns, ${tally.fates} fates`);
