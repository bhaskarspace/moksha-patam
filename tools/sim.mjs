// Plays N games headless with the real rules and reports how long they take.
//   node tools/sim.mjs [games=20000] [players=1] [firstSeed=1]
// With one player this is the time a single life takes to reach Moksha (the README's "about 42 turns").
// With more it is a race, and the game ends when the first player arrives.
import { pathToFileURL } from "node:url";
import { createGame, playTurn } from "../src/engine/turn.js";

export const SIM_RULES = { exact: true, six: true, cards: "off" };

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [games = 20000, players = 1, first = 1] = process.argv.slice(2).map(Number);
  let total = 0, rolls = 0;
  const lengths = [];
  for (let s = first; s < first + games; s++) {
    const { turns } = playGame(s, { players });
    const perPlayer = Math.max(...turns);
    lengths.push(perPlayer);
    total += perPlayer; rolls += turns.reduce((a, b) => a + b, 0);
  }
  lengths.sort((a, b) => a - b);
  const q = f => lengths[Math.floor(f * (lengths.length - 1))];
  console.log(`${games} games, ${players} players, seeds ${first}–${first + games - 1}`);
  console.log(`turns per player until the game ends: mean ${(total / games).toFixed(1)}, median ${q(0.5)}, p10 ${q(0.1)}, p90 ${q(0.9)}`);
  console.log(`rolls per game: mean ${(rolls / games).toFixed(1)}`);
}
