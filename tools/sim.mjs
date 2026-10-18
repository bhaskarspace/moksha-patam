// Plays N games headless with the real rules and reports how long they take.
//   node tools/sim.mjs [games=20000] [players=1] [firstSeed=1]
// With one player this is the time a single life takes to reach Moksha.
// With more it is a race, and the game ends when the first player arrives.
import { pathToFileURL } from "node:url";
import { createGame, playTurn } from "../src/engine/turn.js";
import { SNAKES } from "../src/content.js";

export const SIM_RULES = { six: true, brahmaloka: false, cards: "off" };

// One game from a seed, every player a computer. Returns the full log, oldest entry first,
// plus the number of turns each player took.
export function playGame(seed, { players = 2, rules = SIM_RULES } = {}) {
  const state = createGame({ players: Array.from({ length: players }, () => ({ name: "", type: "cpu" })), rules, seed });
  const log = [...state.log], turns = Array(players).fill(0);
  while (state.winner == null) {
    turns[state.turn]++;
    const before = state.log[0];
    playTurn(state);
    log.push(...state.log.slice(0, state.log.indexOf(before)).reverse());
  }
  return { log, turns, winner: state.winner };
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
  const rules = { ...SIM_RULES, ...(flags.rules === "brahmaloka" ? { brahmaloka: true } : {}) };
  // --snake=none drops the rebirth snake, to measure bounce-back on its own
  if (flags.snake) {
    for (const [h, sn] of Object.entries(SNAKES)) if (sn.rebirth) delete SNAKES[h];
    if (flags.snake !== "none") {
      const [head, tail] = flags.snake.split(":").map(Number);
      SNAKES[head] = { ...(SNAKES[head] || {}), to: tail, rebirth: true };
    }
  }
  let rolls = 0;
  const lengths = [];
  for (let s = first; s < first + games; s++) {
    const { turns } = playGame(s, { players, rules });
    lengths.push(Math.max(...turns));
    rolls += turns.reduce((a, b) => a + b, 0);
  }
  const r = summarise(lengths);
  console.log(`${games} games, ${players} players, seeds ${first}–${first + games - 1}${flags.rules ? `, rules ${flags.rules}` : ""}${flags.snake ? `, snake ${flags.snake}` : ""}`);
  console.log(`turns per player until the game ends: median ${r.median}, p5 ${r.p5}, p95 ${r.p95}, mean ${r.mean.toFixed(1)}, max ${r.max}, over 100: ${(r.over100 * 100).toFixed(1)}%`);
  console.log(`rolls per game: mean ${(rolls / games).toFixed(1)}`);
}
