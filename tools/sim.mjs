// Plays N games headless with the real rules and reports how long they take.
//   node tools/sim.mjs [games=20000] [players=1] [firstSeed=1] [--span=110] [--spans=100,105,110,115,120]
//     [--practice=off] [--endgame=94] [--pick=plain|bigger|first]
// With one player this is the time a single life takes to reach Moksha, or to run out of years.
// With more it is a race, and the game ends when the first player arrives, or when nobody is left.
// Phase 8 adds the lives themselves: how many end by running out of years, how long they last, and the
// bhumika a sannyasin is in. --spans sweeps the span of a life and prints one line per value.
// Phase 9 adds the endgame's two dice: --pick=bigger moves by the bigger die whatever it lands on and --pick=first
// by the first, to show what choosing is worth; --practice=off spends no spare die; --endgame=N moves where the
// two dice begin.
// Phase 10 adds the roll-dependent squares: a square can tell one of two moments, so besides a square landed on four
// times or more, the same moment told four times or more. --roll=off takes the second moment away, which must leave
// every other number exactly as it was.
// Phase 10 B adds the situations: --policy=honest|dishonest|mixed is how every computer chooses (mixed, any open
// option, is the game's own), and the report adds where a life is on the board at fifty and seventy and what it
// became: the guna mix, dharma and the highest bhumika. --situations=off takes them away.
import { pathToFileURL } from "node:url";
import { createGame, playTurn, moveFor, rollDice, diceFor, setEndgame, ENDGAME } from "../src/engine/turn.js";
import { SNAKES, SQ, SITUATIONS } from "../src/content.js";
import { setPolicy, worthOf, optionOf } from "../src/engine/qbn.js";
import { SPAN, setSpan, yearsAlong, BHUMIKA_AT, TURYA, setPractice } from "../src/engine/self.js";

// how a computer chooses between the endgame's dice: the game's own way, or carelessly
const PICKS = { plain: moveFor, bigger: (s, d) => Math.max(...d), first: (s, d) => d[0] };

export const SIM_RULES = { six: true, brahmaloka: false, cards: "off" };

// One game from a seed, every player a computer. Returns the full log, oldest entry first,
// plus the number of turns each player took.
export function playGame(seed, { players = 2, rules = SIM_RULES, pick = moveFor } = {}) {
  const state = createGame({ players: Array.from({ length: players }, () => ({ name: "", type: "cpu" })), rules, seed });
  const log = [...state.log], turns = Array(players).fill(0), seen = state.players.map(() => new Set());
  while (!state.over) {
    turns[state.turn]++;
    const before = state.log[0];
    const plan = playTurn(state, rollDice(state.rng, diceFor(state.players[state.turn])), pick), p = state.players[plan.idx];
    if (plan.jump?.rebirth) seen[plan.idx].clear();
    if (p.bhumika != null) seen[plan.idx].add(p.bhumika);
    log.push(...state.log.slice(0, state.log.indexOf(before)).reverse());
  }
  return { log, turns, winner: state.winner, players: state.players, seen };
}

// Turn counts summarised the way docs/BOARDCRAFT.md §5 asks: the distribution is right-skewed, so the
// median and the 95th percentile matter more than the mean, and so does the share of very long games.
export function summarise(lengths) {
  const xs = [...lengths].sort((a, b) => a - b), n = xs.length;
  const q = f => xs[Math.floor(f * (n - 1))];
  return { games: n, mean: xs.reduce((a, b) => a + b, 0) / n, median: q(0.5), p5: q(0.05), p95: q(0.95), max: xs[n - 1], over100: xs.filter(x => x > 100).length / n };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // --rules=bounce|brahmaloka picks a ruleset; --snake=HEAD:TAIL moves or adds a snake for this run only
  const args = process.argv.slice(2), flags = Object.fromEntries(args.filter(a => a.startsWith("--")).map(a => a.slice(2).split("=")));
  const [games = 20000, players = 1, first = 1] = args.filter(a => !a.startsWith("--")).map(Number);
  if (flags.span) setSpan(+flags.span);
  if (flags.practice === "off") setPractice(0);
  if (flags.endgame) setEndgame(+flags.endgame);
  if (flags.roll === "off") for (const q of Object.values(SQ)) delete q.roll;
  if (flags.situations === "off") for (const k of Object.keys(SITUATIONS)) delete SITUATIONS[k];
  if (flags.policy) setPolicy(flags.policy);
  const pick = PICKS[flags.pick || "plain"];
  const rules = { ...SIM_RULES, ...(flags.rules === "brahmaloka" ? { brahmaloka: true } : {}) };
  // --snake=none drops the rebirth snake, to measure bounce-back on its own
  if (flags.snake) {
    for (const [h, sn] of Object.entries(SNAKES)) if (sn.rebirth) delete SNAKES[h];
    if (flags.snake !== "none") {
      const [head, tail] = flags.snake.split(":").map(Number);
      SNAKES[head] = { ...(SNAKES[head] || {}), to: tail, rebirth: true };
    }
  }
  const pct = x => `${(x * 100).toFixed(1)}%`;
  // --spans: one line per span of life, the numbers the span is chosen by
  if (flags.spans) {
    console.log(`${games} games, ${players} players, seeds ${first}–${first + games - 1}`);
    for (const span of flags.spans.split(",").map(Number)) {
      setSpan(span);
      const lengths = [];
      let died = 0;
      for (let s = first; s < first + games; s++) {
        const g = playGame(s, { players, rules, pick });
        lengths.push(Math.max(...g.turns));
        died += g.players.filter(p => p.dead).length;
      }
      const r = summarise(lengths);
      console.log(`span ${span}: lives ending in death ${pct(died / (games * players))}, turns median ${r.median}, p95 ${r.p95}, over 100: ${pct(r.over100)}`);
    }
    process.exit(0);
  }
  // how often the rebirth snake fires, and how often the exit is won coming back down onto it (REDESIGN.md Phase 7)
  let rolls = 0, fell = 0, falls = 0, above = 0;
  const lengths = [], spans = [], finals = Array(BHUMIKA_AT.length).fill(0), shown = {};
  let died = 0, lives = 0, sannyasins = 0, looped = 0, told4 = 0, said4 = 0, sits = 0;
  // the age a life goes through the exit at, the spread choosing makes (REDESIGN.md Phase 9)
  const AT = 90, freed = [];
  // Phase 10 B: the board at fifty and seventy, and the ledger at the end of each life
  const at50 = [], at70 = [], sat = [], tam = [], dharma = [], peaks = [];
  let met = 0, crooked = 0;
  for (let s = first; s < first + games; s++) {
    const g = playGame(s, { players, rules, pick }), { turns, log, players: ps, seen } = g;
    lengths.push(Math.max(...turns));
    rolls += turns.reduce((a, b) => a + b, 0);
    const f = log.filter(e => e.k === "lRebirth").length;
    falls += f; fell += f > 0;
    above += log.some(e => e.k === "lWinAbove");
    // Phase 8: each life's end, length in years, and the bhumikas it was in
    for (const [i, p] of ps.entries()) {
      lives++; died += p.dead;
      const along = yearsAlong(p.life).filter(e => e.n <= 100);
      if (along.length) spans.push(Math.max(...along.map(e => e.years)));
      // the 99 → 61 loop taken twice or more, a square landed on four times or more, and years sat out
      const life = p.life, count = new Map();
      looped += life.filter((n, k) => n === 61 && life[k - 1] === 99).length >= 2;
      life.forEach((n, k) => { if (p.told?.[k] !== "stay") count.set(n, (count.get(n) || 0) + 1); });
      told4 += Math.max(0, ...count.values()) >= 4;
      // the same moment: a square that told its other moment is a different one (REDESIGN.md Phase 10)
      const said = new Map();
      life.forEach((n, k) => { if (p.told?.[k] === "stay") return; const key = p.told?.[k] ? `${n}:${p.told[k]}` : n; said.set(key, (said.get(key) || 0) + 1); });
      said4 += Math.max(0, ...said.values()) >= 4;
      const all = yearsAlong(life, p.told || []);
      sits += all.filter(e => e.via === "sit").length;
      if (g.winner === i) freed.push(p.years);
      const lived = yearsAlong(life, p.told || []), where = y => lived.filter(e => e.years <= y && e.n <= 100).at(-1)?.n ?? 0;
      at50.push(where(50)); at70.push(where(70));
      sat.push(p.gunas.s); tam.push(p.gunas.t); dharma.push(p.aims.dharma); peaks.push(p.peak ?? -1);
      // a choice is the least worth one of its situation when no option there is worth less
      life.forEach((n, k) => { const o = optionOf(n, p.told?.[k]); if (!o) return; met++; crooked += SITUATIONS[n].options.every(x => worthOf(x) >= worthOf(o)); });
      if (seen[i].size) { sannyasins++; finals[Math.max(...seen[i])]++; shown[seen[i].size] = (shown[seen[i].size] || 0) + 1; }
    }
  }
  const r = summarise(lengths), y = summarise(spans);
  console.log(`${games} games, ${players} players, seeds ${first}–${first + games - 1}${flags.rules ? `, rules ${flags.rules}` : ""}${flags.snake ? `, snake ${flags.snake}` : ""}, span ${SPAN}, two dice from ${ENDGAME}${flags.pick ? `, pick ${flags.pick}` : ""}${flags.practice ? `, practice ${flags.practice}` : ""}${flags.roll ? `, roll ${flags.roll}` : ""}${flags.policy ? `, policy ${flags.policy}` : ""}${flags.situations ? `, situations ${flags.situations}` : ""}`);
  console.log(`turns per player until the game ends: median ${r.median}, p5 ${r.p5}, p95 ${r.p95}, mean ${r.mean.toFixed(1)}, max ${r.max}, over 100: ${pct(r.over100)}`);
  console.log(`rolls per game: mean ${(rolls / games).toFixed(1)}`);
  console.log(`the rebirth snake fires in ${pct(fell / games)} of games, ${(falls / games).toFixed(2)} falls a game; ${pct(above / games)} are won coming back down onto the exit`);
  console.log(`lives that run out of years: ${pct(died / lives)}; years lived: median ${y.median}, p5 ${y.p5}, p95 ${y.p95}, max ${y.max}`);
  console.log(`highest bhumika reached, of ${sannyasins} sannyasins: ${finals.map((c, b) => `${b + 1}: ${pct(c / sannyasins)}`).join(" · ")} (turya ${pct(finals[TURYA] / sannyasins)})`);
  console.log(`bhumikas a sannyasin is shown: ${Object.entries(shown).map(([k, c]) => `${k}: ${pct(c / sannyasins)}`).join(" · ")}`);
  const b = summarise(freed);
  console.log(`the 99 → 61 snake taken twice or more: ${pct(looped / lives)}; a square landed on four times or more: ${pct(told4 / lives)}; the same moment told four times or more: ${pct(said4 / lives)}; years sat out: ${(sits / lives).toFixed(2)} a life`);
  const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length, med = xs => summarise(xs).median;
  console.log(`liberated: ${pct(freed.length / lives)}; situations met: ${(met / lives).toFixed(2)} a life, the least worth option taken in ${met ? pct(crooked / met) : "—"} of them`);
  console.log(`on the board: square at fifty median ${med(at50)} (mean ${mean(at50).toFixed(1)}), at seventy median ${med(at70)} (mean ${mean(at70).toFixed(1)})`);
  console.log(`the ledger at the end: sattva ${mean(sat).toFixed(3)}, tamas ${mean(tam).toFixed(3)}, dharma ${mean(dharma).toFixed(1)}, highest bhumika ${mean(peaks.filter(x => x >= 0)).toFixed(2)}`);
  console.log(`through the exit by ${AT} years: ${pct(freed.filter(y => y <= AT).length / lives)}; age at the exit: p5 ${b.p5}, median ${b.median}, p95 ${b.p95}`);
}
