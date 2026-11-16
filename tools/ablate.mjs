// Ablation of the 110's snakes and ladders (Phase 20 step 5), after the method of arXiv:2304.14486: take one element
// away, play the same seeds, and read what moved. Report only: nothing here changes the board.
//   node tools/ablate.mjs [games=2000] [firstSeed=1] [--policy=mixed,careful] [--boot=1000]
// Each seed is one seat's game (every life until one is liberated, as tools/sim.mjs plays it). Throws are keyed by the
// seed, the lane, the life and the throw (src/engine/throws.js), so the base game and the game without the element throw
// the same dice throw for throw: the pairs differ only by the board. For every ladder and snake it reports the change in
// the game's median and p95 turns, in liberation a life and in deaths a life, each with a paired bootstrap 95% interval
// over seeds. A situation whose option climbs or slides by the removed element stays instead (destOf in
// src/engine/qbn.js), and the report names it. Śiva's snake at 110 is a rule of the board (the exact throw onto TOP), not
// an entry in SNAKES, and is not ablated.
import { pathToFileURL } from "node:url";
import { LADDERS, SNAKES, SITUATIONS } from "../src/content.js";
import { setPolicy } from "../src/engine/qbn.js";
import { makeRng, next } from "../src/rng.js";
import { playGame, livesOf, SIM_RULES } from "./sim.mjs";

// one seed's game, as the numbers the report reads
function measure(seed) {
  const g = playGame(seed, { players: 1, rules: SIM_RULES });
  const ls = livesOf(g);
  return { turns: g.turns[0], lives: ls.length, won: ls.filter(x => x.won).length, died: ls.filter(x => x.p.death).length };
}
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(0.5 * (s.length - 1))]; };
const p95 = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(0.95 * (s.length - 1))]; };
const STATS = {
  median: rs => median(rs.map(r => r.turns)),
  p95: rs => p95(rs.map(r => r.turns)),
  lib: rs => rs.reduce((a, r) => a + r.won, 0) / rs.reduce((a, r) => a + r.lives, 0),
  deaths: rs => rs.reduce((a, r) => a + r.died, 0) / rs.reduce((a, r) => a + r.lives, 0),
};
// the paired bootstrap: the same resampled seeds on both sides, the difference taken each time
function paired(base, cut, boot, salt) {
  const n = base.length, rng = makeRng((0x5bd1e995 ^ salt) >>> 0), out = {};
  const d = Object.fromEntries(Object.keys(STATS).map(k => [k, []]));
  for (let b = 0; b < boot; b++) {
    const ix = Array.from({ length: n }, () => Math.floor(next(rng) * n));
    const B = ix.map(i => base[i]), C = ix.map(i => cut[i]);
    for (const [k, f] of Object.entries(STATS)) d[k].push(f(C) - f(B));
  }
  for (const [k, f] of Object.entries(STATS)) {
    const s = d[k].sort((a, b) => a - b);
    out[k] = { d: f(cut) - f(base), lo: s[Math.floor(0.025 * (boot - 1))], hi: s[Math.ceil(0.975 * (boot - 1))] };
  }
  return out;
}
// the situations whose option goes by an element: they stay when it is taken away
const reliant = (n, move) => Object.keys(SITUATIONS).filter(k => +k === +n && SITUATIONS[k].options?.some(o => o.move === move));

export function ablate(games, first, policy, boot) {
  setPolicy(policy);
  const seeds = Array.from({ length: games }, (_, i) => first + i), base = seeds.map(measure), rows = [];
  for (const [kind, map, move] of [["ladder", LADDERS, "ladder"], ["snake", SNAKES, "snake"]]) {
    for (const n of Object.keys(map)) {
      const keep = map[n];
      delete map[n];
      try {
        const cut = seeds.map(measure);
        rows.push({ kind, from: +n, to: keep.to, stays: reliant(n, move), ...paired(base, cut, boot, +n * (kind === "ladder" ? 1 : 7)) });
      } finally { map[n] = keep; }
    }
  }
  setPolicy(null);
  return { base: Object.fromEntries(Object.entries(STATS).map(([k, f]) => [k, f(base)])), rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), flags = Object.fromEntries(args.filter(a => a.startsWith("--")).map(a => a.slice(2).split("=")));
  const [games = 2000, first = 1] = args.filter(a => !a.startsWith("--")).map(Number);
  const boot = +(flags.boot ?? 1000), md = "md" in flags;
  const pt = x => (100 * x).toFixed(1), sg = (x, f) => { const a = f(Math.abs(x)); return (+a === 0 ? "±" : x > 0 ? "+" : "−") + a; };
  const ci = (o, f) => `${sg(o.d, f)} [${sg(o.lo, f)}, ${sg(o.hi, f)}]`;
  for (const policy of (flags.policy ?? "mixed,careful").split(",")) {
    const { base, rows } = ablate(games, first, policy, boot);
    rows.sort((a, b) => Math.abs(b.lib.d) - Math.abs(a.lib.d));
    console.log(`\n${policy}: ${games} one-seat games, seeds ${first}–${first + games - 1}, ${boot} paired bootstrap resamples`);
    console.log(`base: game median ${base.median}, p95 ${base.p95}; liberated ${pt(base.lib)}% a life; deaths ${pt(base.deaths)}% a life`);
    const cells = r => [`${r.kind} ${r.from}→${r.to}`, ci(r.median, x => x.toFixed(0)), ci(r.p95, x => x.toFixed(0)), ci(r.lib, x => pt(x)), ci(r.deaths, x => pt(x)), r.stays.length ? `situation ${r.stays.join(", ")} stays` : ""];
    if (md) {
      console.log("| removed | Δ median turns | Δ p95 turns | Δ liberated a life (pts) | Δ deaths a life (pts) | note |\n|---|---|---|---|---|---|");
      for (const r of rows) console.log(`| ${cells(r).join(" | ")} |`);
    } else for (const r of rows) console.log(cells(r).map((c, i) => c.padEnd([14, 22, 24, 26, 26, 0][i])).join(""));
  }
}
