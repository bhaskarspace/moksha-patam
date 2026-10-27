// Plays N games headless with the real rules and reports how long they take.
//   node tools/sim.mjs [games=20000] [players=1] [firstSeed=1] [--span=110] [--spans=100,105,110,115,120]
//     [--practice=off] [--endgame=94] [--pick=plain|phase9|bigger|first]
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
// Phase 12 adds the fall: nothing above the exit turns back, and the throw past the top ends the life. The report adds
// how lives end, lives per liberation, the turns spent in 106–110, and a square at or above 94 landed on four times or
// more. --pick=phase9 plays the endgame by Phase 9's choice, which walks past the exit when the bigger die does.
// Phase 10 B adds the situations: --policy=honest|dishonest|mixed is how every computer chooses (mixed, any open
// option, is the game's own), and the report adds where a life is on the board at fifty and seventy and what it
// became: the guna mix, dharma and the highest bhumika. --situations=off takes them away.
// Phase 14 adds the door as an examination, Śiva's snake and the curse: the fall split into the throw past 110 and the
// landing on it, refusals a life and the share of refused arrivals who could sit (sannyāsins), years spent at the door,
// questions the book answered and debts paid in penance, deaths at the door, liberations through it, and curses closed
// by landing or not. --curse=off takes the curses away, which must leave every other number as it was.
// Phase 15 adds the witness: the ego's throws and rebellions a life, the share of lives that rebelled, and both by the
// band of the gunas the faces came from (sattva, mixed, rajas or tamas, none). --ego=off takes the throw away.
// Phase 16 makes the top tier death: deaths by cause (the ledger, years on earth, years at the door), the ledger death's
// age and form. --death=off reports the tier only, as before it; --penance=N is the years a unit of weight costs at the
// door (2; 1 before Phase 16); --unpaid=N the weight from which only the book can answer a debt (3; 4 is none).
// --lives=N plays each seed as one soul's lives instead (src/engine/samskara.js): a single computer, each life born of
// the last (soulOf, bornOf) until one is liberated or N have been lived; life k > 0 plays on the seed hash(seed, k). It
// reports liberation by life, lives per liberation, the rebirth rate and deaths by cause, and the turns of each life.
import { pathToFileURL } from "node:url";
import { createGame, playTurn, moveFor, movesFor, planTurn, rollDice, diceFor, setEndgame, ENDGAME, canSit } from "../src/engine/turn.js";
import { SQ, SITUATIONS, CURSES } from "../src/content.js";
import { curseIn } from "../src/engine/curse.js";
import { setPolicy, setEgo, worthOf, optionOf } from "../src/engine/qbn.js";
import { SPAN, setSpan, yearsAlong, BHUMIKA_AT, TURYA, setPractice } from "../src/engine/self.js";
import { setDeath, setPenance, setUnpaid, FORMS } from "../src/engine/karma.js";
import { soulOf, bornOf } from "../src/engine/samskara.js";

// Phase 9's choice, before Phase 12 made the fall the heavens' snake: the exit, else the bigger die that is not a
// snake, else sitting. Kept to show what the new choice is worth.
function phase9(state, dice) {
  const moves = movesFor(state, dice), plans = moves.filter(Boolean).map(v => planTurn(state, v, dice));
  const win = plans.find(pl => pl.win);
  if (win) return win.v;
  const safe = plans.filter(pl => pl.jump?.kind !== "snake").sort((a, b) => b.v - a.v);
  if (safe.length) return safe[0].v;
  return moves.includes(0) ? 0 : Math.max(...dice);
}
// how a computer chooses between the endgame's dice: the game's own way, Phase 9's, or carelessly
const PICKS = { plain: moveFor, phase9, bigger: (s, d) => Math.max(...d), first: (s, d) => d[0] };

export const SIM_RULES = { six: true, cards: "off" };

// One game from a seed, every player a computer. Returns the full log, oldest entry first,
// plus the number of turns each player took.
export function playGame(seed, { players = 2, rules = SIM_RULES, pick = moveFor, born = null } = {}) {
  const state = createGame({ players: Array.from({ length: players }, (_, i) => ({ name: "", type: "cpu", ...(born && !i ? { born } : {}) })), rules, seed });
  const log = [...state.log], turns = Array(players).fill(0), heaven = Array(players).fill(0), seen = state.players.map(() => new Set());
  // Phase 12, the ledger: per player, the omens, the reckonings and the door
  const karma = state.players.map(() => ({ planted: 0, eligible: 0, fired: 0, bands: {}, tiers: [], dies: [], arrivals: 0, refused: [], couldSit: 0, doorYears: 0, throughDoor: 0 }));
  while (!state.over) {
    turns[state.turn]++;
    // a turn begun on 106–110 is a turn spent in the heavens (REDESIGN.md Phase 12)
    if (state.players[state.turn].pos > 105) heaven[state.turn]++;
    const before = state.log[0];
    const plan = playTurn(state, rollDice(state.rng, diceFor(state.players[state.turn])), pick), p = state.players[plan.idx];
    if (p.bhumika != null) seen[plan.idx].add(p.bhumika);
    const k = karma[plan.idx];
    if (plan.plant) k.planted++;
    if (plan.omen) {
      const band = plan.reckon?.from ?? plan.final, b = band >= 105 ? "105" : `${Math.floor((band - 1) / 20) * 20 + 1}–${Math.floor((band - 1) / 20) * 20 + 20}`;
      k.eligible++; (k.bands[b] ||= [0, 0])[0]++;
      if (plan.reckon) { k.fired++; k.bands[b][1]++; k.tiers.push(plan.reckon.tier); if (plan.reckon.wouldDie) k.dies.push(plan.reckon.age); }
    }
    if (!plan.sit && !plan.fell && plan.target === 105) { k.arrivals++; if (plan.refused) { k.refused.push(plan.refused.aim ?? "debt"); k.couldSit += canSit(p); } }
    // Phase 14: a year sat at the door, and the door opening on one
    if (plan.sit && plan.from === 105) { k.doorYears++; k.throughDoor += !!plan.win; }
    log.push(...state.log.slice(0, state.log.indexOf(before)).reverse());
  }
  return { log, turns, heaven, karma, winner: state.winner, players: state.players, seen, state };
}

// The seed of a soul's life k: the seed itself for the first, then a hash of the two, so a chain is fixed by its seed.
export const lifeSeed = (seed, k) => (k ? (Math.imul(seed ^ 0x85ebca6b, 0x27d4eb2d) + Math.imul(k, 0x165667b1)) >>> 0 : seed);
// One soul's lives from a seed: each a single computer's game, born of the last, until a liberation or n lives.
export function playLives(seed, n, { rules = SIM_RULES, pick = moveFor } = {}) {
  const out = [];
  let born = null;
  for (let k = 0; k < n; k++) {
    const g = playGame(lifeSeed(seed, k), { players: 1, rules, pick, born });
    out.push(g);
    if (g.winner === 0) break;
    born = bornOf(soulOf(g.state, 0));
  }
  return out;
}

// Turn counts summarised the way docs/BOARDCRAFT.md §5 asks: the distribution is right-skewed, so the
// median and the 95th percentile matter more than the mean, and so does the share of very long games.
export function summarise(lengths) {
  const xs = [...lengths].sort((a, b) => a - b), n = xs.length;
  const q = f => xs[Math.floor(f * (n - 1))];
  return { games: n, mean: xs.reduce((a, b) => a + b, 0) / n, median: q(0.5), p5: q(0.05), p95: q(0.95), max: xs[n - 1], over100: xs.filter(x => x > 100).length / n };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), flags = Object.fromEntries(args.filter(a => a.startsWith("--")).map(a => a.slice(2).split("=")));
  const [games = 20000, players = 1, first = 1] = args.filter(a => !a.startsWith("--")).map(Number);
  if (flags.span) setSpan(+flags.span);
  if (flags.practice === "off") setPractice(0);
  if (flags.endgame) setEndgame(+flags.endgame);
  if (flags.roll === "off") for (const q of Object.values(SQ)) delete q.roll;
  if (flags.situations === "off") for (const k of Object.keys(SITUATIONS)) delete SITUATIONS[k];
  if (flags.policy) setPolicy(flags.policy);
  if (flags.curse === "off") CURSES.list = null;
  if (flags.ego === "off") setEgo(false);
  if (flags.death === "off") setDeath(false);
  if (flags.penance) setPenance(+flags.penance);
  if (flags.unpaid) setUnpaid(+flags.unpaid);
  const pick = PICKS[flags.pick || "plain"];
  const rules = SIM_RULES;
  const pct = x => `${(x * 100).toFixed(1)}%`;
  // --lives: one soul's lives a seed (Phase 16)
  if (flags.lives) {
    const n = +flags.lives, byLife = Array.from({ length: n }, () => ({ lives: 0, freed: 0, ledger: 0, years: 0, door: 0, fell: 0, turns: [] }));
    let lived = 0, freed = 0, reborn = 0;
    for (let s = first; s < first + games; s++) {
      const chain = playLives(s, n, { rules, pick });
      chain.forEach((g, k) => {
        const p = g.players[0], b = byLife[k];
        lived++; b.lives++; b.turns.push(g.turns[0]);
        if (g.winner === 0) { freed++; b.freed++; } else if (k < n - 1) reborn++;
        if (p.death) b[p.death.by]++;
        b.fell += p.fell;
      });
    }
    console.log(`${games} souls, up to ${n} lives each, seeds ${first}–${first + games - 1}${flags.policy ? `, policy ${flags.policy}` : ""}${flags.penance ? `, penance ${flags.penance}` : ""}`);
    console.log(`lives lived ${lived}; liberated ${pct(freed / games)} of souls within ${n} lives; liberation per life ${pct(freed / lived)}; lives per liberation ${(lived / Math.max(1, freed)).toFixed(2)}; reborn ${pct(reborn / lived)} of lives`);
    for (const [k, b] of byLife.entries()) {
      if (!b.lives) continue;
      const t = summarise(b.turns);
      console.log(`  life ${k + 1}: ${b.lives} lived, liberated ${pct(b.freed / b.lives)}; died by the ledger ${pct(b.ledger / b.lives)}, years on earth ${pct(b.years / b.lives)}, at the door ${pct(b.door / b.lives)}; fell ${pct(b.fell / b.lives)}; turns median ${t.median}, p95 ${t.p95}`);
    }
    process.exit(0);
  }
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
  let rolls = 0;
  const lengths = [], spans = [], finals = Array(BHUMIKA_AT.length).fill(0), shown = {};
  let died = 0, lives = 0, sannyasins = 0, looped = 0, told4 = 0, said4 = 0, sits = 0;
  // the age a life goes through the exit at, the spread choosing makes (REDESIGN.md Phase 9)
  const AT = 90, freed = [];
  // Phase 10 B: the board at fifty and seventy, and the ledger at the end of each life
  const at50 = [], at70 = [], sat = [], tam = [], dharma = [], peaks = [];
  let met = 0, crooked = 0;
  // Phase 12: how lives end, the turns spent in the heavens, and the divine row repeated
  let falls12 = 0, divine4 = 0, open = 0;
  const heavenTurns = [];
  // Phase 12, the ledger
  let planted = 0, eligible = 0, fired = 0, reckoned = 0, arrivals = 0, refusedLives = 0, dyingLives = 0, carriedEnd = 0;
  const bands = {}, tiers = Array(5).fill(0), refusals = {}, dieAges = {};
  // Phase 14
  let fellPast = 0, fellSnake = 0, refusedAll = 0, couldSit = 0, doorDeaths = 0, throughDoor = 0, passed = 0, penanced = 0, cursed = 0, cursedLanded = 0, cursedOpen = 0;
  const doorYears = [];
  // Phase 15: the ego's throws, by the faces it owned: [6] sattva, [5,6] mixed, [4,5,6] rajas or tamas, [] none
  const BANDS = ["none", "sattva", "mixed", "rajas/tamas"], egoBands = BANDS.map(() => [0, 0]);
  let throws = 0, rebellions = 0, rebelLives = 0;
  // Phase 16: deaths by cause, and the ledger's by age and form
  const causes = { ledger: 0, years: 0, door: 0 }, ledgerAges = {}, forms = Object.fromEntries(FORMS.map(f => [f, 0]));
  for (let s = first; s < first + games; s++) {
    const g = playGame(s, { players, rules, pick }), { turns, heaven, karma, log, players: ps, seen } = g;
    lengths.push(Math.max(...turns));
    rolls += turns.reduce((a, b) => a + b, 0);
    // Phase 8: each life's end, length in years, and the bhumikas it was in
    for (const [i, p] of ps.entries()) {
      lives++; died += p.dead;
      // a life that fell from the heavens, which ends it (REDESIGN.md Phase 12)
      falls12 += p.fell;
      open += g.winner !== i && !p.dead && !p.fell;
      heavenTurns.push(heaven[i]);
      const k = karma[i];
      planted += k.planted; eligible += k.eligible; fired += k.fired; reckoned += k.fired > 0; arrivals += k.arrivals;
      for (const [b, [e, f]] of Object.entries(k.bands)) { (bands[b] ||= [0, 0])[0] += e; bands[b][1] += f; }
      k.tiers.forEach(t => tiers[t]++);
      refusedLives += k.refused.length > 0; k.refused.forEach(r => { refusals[r] = (refusals[r] || 0) + 1; });
      dyingLives += k.dies.length > 0;
      if (k.dies.length) { const a = k.dies[0], band = a < 40 ? "under 40" : a < 60 ? "40–59" : a < 80 ? "60–79" : "80+"; dieAges[band] = (dieAges[band] || 0) + 1; }
      carriedEnd += (p.karma?.sancita?.length ?? 0) > 0;
      fellPast += p.fellBy === "past"; fellSnake += p.fellBy === "snake";
      refusedAll += k.refused.length; couldSit += k.couldSit; throughDoor += k.throughDoor;
      if (k.doorYears) doorYears.push(k.doorYears);
      doorDeaths += !!p.dead && p.pos === 105;
      if (p.death) {
        causes[p.death.by]++;
        if (p.death.by === "ledger") { const a = p.death.age, band = a < 40 ? "under 40" : a < 60 ? "40–59" : a < 80 ? "60–79" : "80+"; ledgerAges[band] = (ledgerAges[band] || 0) + 1; forms[p.death.form]++; }
      }
      for (const x of p.sittings ?? []) { passed += x.pass; penanced += !x.pass && x.cleared; }
      const thrown = (p.witness ?? []).filter(w => w.faces), overruled = thrown.filter(w => w.chose !== w.took);
      throws += thrown.length; rebellions += overruled.length; rebelLives += overruled.length > 0;
      for (const w of thrown) { const b = egoBands[Math.min(w.faces.length, 3)]; b[0]++; b[1] += w.chose !== w.took; }
      const cu = curseIn(p);
      if (cu) { cursed++; if (cu.closedAt != null) cursedLanded++; else if (g.winner !== i && !p.dead && !p.fell) cursedOpen++; }
      const along = yearsAlong(p.life).filter(e => e.n <= 100);
      if (along.length) spans.push(Math.max(...along.map(e => e.years)));
      // the 99 → 61 loop taken twice or more, a square landed on four times or more, and years sat out
      const life = p.life, count = new Map();
      looped += life.filter((n, k) => n === 61 && life[k - 1] === 99).length >= 2;
      life.forEach((n, k) => { if (p.told?.[k] !== "stay") count.set(n, (count.get(n) || 0) + 1); });
      told4 += Math.max(0, ...count.values()) >= 4;
      divine4 += [...count].some(([n, c]) => n >= 94 && c >= 4);
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
  console.log(`${games} games, ${players} players, seeds ${first}–${first + games - 1}, span ${SPAN}, two dice from ${ENDGAME}${flags.pick ? `, pick ${flags.pick}` : ""}${flags.practice ? `, practice ${flags.practice}` : ""}${flags.roll ? `, roll ${flags.roll}` : ""}${flags.policy ? `, policy ${flags.policy}` : ""}${flags.situations ? `, situations ${flags.situations}` : ""}${flags.death ? `, death ${flags.death}` : ""}${flags.penance ? `, penance ${flags.penance}` : ""}${flags.unpaid ? `, unpaid from weight ${flags.unpaid}` : ""}`);
  console.log(`turns per player until the game ends: median ${r.median}, p5 ${r.p5}, p95 ${r.p95}, mean ${r.mean.toFixed(1)}, max ${r.max}, over 100: ${pct(r.over100)}`);
  console.log(`rolls per game: mean ${(rolls / games).toFixed(1)}`);
  console.log(`lives that end in death: ${pct(died / lives)}; years lived: median ${y.median}, p5 ${y.p5}, p95 ${y.p95}, max ${y.max}`);
  console.log(`highest bhumika reached, of ${sannyasins} sannyasins: ${finals.map((c, b) => `${b + 1}: ${pct(c / sannyasins)}`).join(" · ")} (turya ${pct(finals[TURYA] / sannyasins)})`);
  console.log(`bhumikas a sannyasin is shown: ${Object.entries(shown).map(([k, c]) => `${k}: ${pct(c / sannyasins)}`).join(" · ")}`);
  const b = summarise(freed);
  console.log(`the 99 → 61 snake taken twice or more: ${pct(looped / lives)}; a square landed on four times or more: ${pct(told4 / lives)}; the same moment told four times or more: ${pct(said4 / lives)}; years sat out: ${(sits / lives).toFixed(2)} a life`);
  const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length, med = xs => summarise(xs).median;
  console.log(`liberated: ${pct(freed.length / lives)}; situations met: ${(met / lives).toFixed(2)} a life, the least worth option taken in ${met ? pct(crooked / met) : "—"} of them`);
  console.log(`on the board: square at fifty median ${med(at50)} (mean ${mean(at50).toFixed(1)}), at seventy median ${med(at70)} (mean ${mean(at70).toFixed(1)})`);
  console.log(`the ledger at the end: sattva ${mean(sat).toFixed(3)}, tamas ${mean(tam).toFixed(3)}, dharma ${mean(dharma).toFixed(1)}, highest bhumika ${mean(peaks.filter(x => x >= 0)).toFixed(2)}`);
  const h = summarise(heavenTurns);
  console.log(`how lives end: liberated ${pct(freed.length / lives)}, died ${pct(died / lives)}, fell from the heavens ${pct(falls12 / lives)}, still playing when the game ended ${pct(open / lives)}; lives per liberation ${(lives / freed.length).toFixed(2)}`);
  console.log(`turns in 106–110: mean ${h.mean.toFixed(2)}, median ${h.median}, p95 ${h.p95}, max ${h.max}; in those that went there ${(heavenTurns.reduce((a, b) => a + b, 0) / Math.max(1, heavenTurns.filter(Boolean).length)).toFixed(2)}; a square at or above 94 landed on four times or more: ${pct(divine4 / lives)}`);
  const all = tiers.reduce((a, b) => a + b, 0) || 1, nref = Object.values(refusals).reduce((a, b) => a + b, 0);
  console.log(`the ledger: debts planted ${(planted / lives).toFixed(2)} a life; lives ending with a debt never met ${pct(carriedEnd / lives)}`);
  console.log(`the omen: a 6 with a ripe debt ${(eligible / lives).toFixed(2)} a life, a reckoning ${(fired / lives).toFixed(2)} a life, in ${pct(reckoned / lives)} of lives; fired, by where it fell: ${Object.keys(bands).sort((a, b) => parseInt(a) - parseInt(b)).map(b => `${b} ${bands[b][0] ? pct(bands[b][1] / bands[b][0]) : "—"} of ${bands[b][0]}`).join(" · ")}`);
  console.log(`severity of ${fired} reckonings: ${tiers.map((c, t) => `${["floor only", "years", "+ holding", "+ sent back", flags.death === "off" ? "death (reported only)" : "death"][t]} ${pct(c / all)}`).join(" · ")}; lives in which the death tier came ${pct(dyingLives / lives)}${dyingLives ? ` (at ${Object.entries(dieAges).map(([b, c]) => `${b}: ${c}`).join(", ")})` : ""}`);
  console.log(`death: ${pct((causes.ledger + causes.years + causes.door) / lives)} of lives, by the ledger ${pct(causes.ledger / lives)}, years on earth ${pct(causes.years / lives)}, years at the door ${pct(causes.door / lives)}; the ledger's by age ${Object.entries(ledgerAges).map(([b, c]) => `${b}: ${c}`).join(", ") || "none"}; by form ${FORMS.map(f => `${f} ${forms[f]}`).join(", ")}`);
  console.log(`the door: arrivals at 105 ${(arrivals / lives).toFixed(2)} a life, refused ${arrivals ? pct(nref / arrivals) : "—"} of them (${Object.entries(refusals).map(([r, c]) => `${r} ${c}`).join(", ") || "none"}); lives refused at least once ${pct(refusedLives / lives)}`);
  const dy = summarise(doorYears.length ? doorYears : [0]);
  console.log(`the fall: past 110 ${pct(fellPast / lives)}, Śiva's snake on 110 ${pct(fellSnake / lives)}; refusals ${(refusedAll / lives).toFixed(3)} a life, of which a sannyāsin who could sit ${refusedAll ? pct(couldSit / refusedAll) : "—"}`);
  console.log(`the examination: lives that sat at the door ${pct(doorYears.length / lives)}, years there median ${dy.median}, p95 ${dy.p95}, max ${dy.max} (mean ${(doorYears.reduce((a, b) => a + b, 0) / lives).toFixed(3)} a life); debts the book answered ${passed}, paid in penance ${penanced}; through the door ${pct(throughDoor / lives)} of lives; deaths at the door ${pct(doorDeaths / lives)}`);
  console.log(`the curse: spoken in ${pct(cursed / lives)} of lives; closed by landing ${cursed ? pct(cursedLanded / cursed) : "—"}, the other way ${cursed ? pct((cursed - cursedLanded - cursedOpen) / cursed) : "—"}`);
  console.log(`the witness: ego throws ${(throws / lives).toFixed(3)} a life, rebellions ${(rebellions / lives).toFixed(3)} a life (${throws ? pct(rebellions / throws) : "—"} of throws); lives that rebelled ${pct(rebelLives / lives)}`);
  console.log(`  by the gunas: ${BANDS.map((b, k) => `${b} ${throws ? pct(egoBands[k][0] / throws) : "—"} of throws, rebelled ${egoBands[k][0] ? pct(egoBands[k][1] / egoBands[k][0]) : "—"}`).join("; ")}`);
  console.log(`through the exit by ${AT} years: ${pct(freed.filter(y => y <= AT).length / lives)}; age at the exit: p5 ${b.p5}, median ${b.median}, p95 ${b.p95}`);
}
