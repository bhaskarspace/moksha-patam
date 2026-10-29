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
// Phase 17 ends the throw past 110 (no die is offered that would pass it; with none the life stays) and makes Śiva's
// snake rebirth in the seat: a game is now one or more lives a seat (p.past, then the life in it), and every number a
// life is per life. The report adds rebirths a game, and a safety net on the turns of a game (CAP), with how often it
// was hit, which should be never. --law=id plays every computer under that law. The heavens last as long as the merit (p.merit, one to four turns by the guṇas): the
// fall is split into the exact throw onto 110 and the merit spent, with the merit lives entered the heavens with.
import { pathToFileURL } from "node:url";
import { createGame, playTurn, moveFor, movesFor, planTurn, rollDice, diceFor, setEndgame, ENDGAME, canSit, spentOf, inHeaven } from "../src/engine/turn.js";
import { SQ, SITUATIONS, CURSES } from "../src/content.js";
import { curseIn } from "../src/engine/curse.js";
import { setPolicy, setEgo, worthOf, optionOf } from "../src/engine/qbn.js";
import { SPAN, setSpan, yearsAlong, BHUMIKA_AT, TURYA, setPractice } from "../src/engine/self.js";
import { setDeath, setPenance, setUnpaid, FORMS } from "../src/engine/karma.js";
import { soulOf, bornOf } from "../src/engine/samskara.js";
import { animalRules, afterAnimal } from "../src/engine/animal.js";
import { LAWS, lawOf } from "../src/engine/laws/index.js";

// Phase 9's choice, before Phase 12 made the fall the heavens' snake: the exit, else the bigger die that is not a
// snake, else sitting. Kept to show what the new choice is worth.
function phase9(state, dice) {
  const moves = movesFor(state, dice), plans = moves.filter(Boolean).map(v => planTurn(state, v, dice));
  const win = plans.find(pl => pl.win);
  if (win) return win.v;
  const safe = plans.filter(pl => pl.jump?.kind !== "snake").sort((a, b) => b.v - a.v);
  if (safe.length) return safe[0].v;
  return moves.includes(0) ? 0 : moves.length ? Math.max(...moves) : null;
}
// how a computer chooses between the endgame's dice: the game's own way, Phase 9's, or carelessly; never a die that is
// not offered (Phase 17: none past the top), and none at all when nothing is
const offered = (s, d) => movesFor(s, d).filter(Boolean);
const PICKS = { plain: moveFor, phase9, bigger: (s, d) => (offered(s, d).length ? Math.max(...offered(s, d)) : null), first: (s, d) => offered(s, d)[0] ?? null };

export const SIM_RULES = { six: true, cards: "off" };
export const CAP = 5000;
// Every life of a game, in seat order: the lives Śiva's snake closed (p.past), then the one in the seat. k is which of
// the seat's lives it is, and won whether it was the winner.
export const livesOf = g => g.players.flatMap((p, i) => [...(p.past ?? []), p].map((q, k, all) => ({ p: q, i, k, won: g.winner === i && k === all.length - 1 })));

// One game from a seed, every player a computer. Returns the full log, oldest entry first,
// plus the number of turns each player took.
export function playGame(seed, { players = 2, rules = SIM_RULES, pick = moveFor, born = null } = {}) {
  const state = createGame({ players: Array.from({ length: players }, (_, i) => ({ name: "", type: "cpu", ...(born && !i ? { born } : {}) })), rules, seed });
  const log = [...state.log], turns = Array(players).fill(0);
  // per seat, per life (Phase 17: a seat's lives are p.past and then the one in it): turns, turns in the heavens, the
  // bhumikas a sannyasin was in, and Phase 12's ledger, the omens, the reckonings and the door
  const fresh = () => ({ turns: 0, heaven: 0, seen: new Set(), karma: { planted: 0, eligible: 0, fired: 0, bands: {}, tiers: [], dies: [], arrivals: 0, refused: [], couldSit: 0, doorYears: 0, throughDoor: 0 } });
  const per = state.players.map(() => [fresh()]), now = i => { const a = per[i], k = state.players[i].rebirths ?? 0; while (a.length <= k) a.push(fresh()); return a[k]; };
  let played = 0;
  while (!state.over && played++ < CAP) {
    turns[state.turn]++;
    const w = now(state.turn);
    w.turns++;
    // a turn begun above the exit is a turn spent in the heavens (REDESIGN.md Phase 12): since Phase 17, 106–109, and
    // not the turn the snake takes a life whose merit is spent, so the count never passes the merit
    if (inHeaven(state.players[state.turn].pos) && !spentOf(state.players[state.turn])) w.heaven++;
    const before = state.log[0];
    const q = state.players[state.turn], plan = playTurn(state, spentOf(q) ? [] : rollDice(state.rng, diceFor(q)), pick), p = state.players[plan.idx];
    if (p.bhumika != null && !plan.fell) w.seen.add(p.bhumika);
    const k = w.karma;
    if (plan.plant) k.planted++;
    if (plan.omen) {
      const band = plan.reckon?.from ?? plan.final, b = band >= 105 ? "105" : `${Math.floor((band - 1) / 20) * 20 + 1}–${Math.floor((band - 1) / 20) * 20 + 20}`;
      k.eligible++; (k.bands[b] ||= [0, 0])[0]++;
      if (plan.reckon) { k.fired++; k.bands[b][1]++; k.tiers.push(plan.reckon.tier); if (plan.reckon.wouldDie) k.dies.push(plan.reckon.age); }
    }
    if (!plan.sit && !plan.fell && !plan.stay && plan.target === 105) { k.arrivals++; if (plan.refused) { k.refused.push(plan.refused.aim ?? "debt"); k.couldSit += canSit(p); } }
    // Phase 14: a year sat at the door, and the door opening on one
    if (plan.sit && plan.from === 105) { k.doorYears++; k.throughDoor += !!plan.win; }
    log.push(...state.log.slice(0, state.log.indexOf(before)).reverse());
  }
  return { log, turns, per, capped: !state.over, winner: state.winner, players: state.players, state };
}

// The seed of a soul's life k: the seed itself for the first, then a hash of the two, so a chain is fixed by its seed.
export const lifeSeed = (seed, k) => (k ? (Math.imul(seed ^ 0x85ebca6b, 0x27d4eb2d) + Math.imul(k, 0x165667b1)) >>> 0 : seed);
// One soul's lives from a seed: each a single computer's game, born of the last, until a liberation or n lives.
// A death by ledger is followed by its animal interlude (src/engine/animal.js) before the next human life: each is kept
// on the life it follows, as interludes [{ kind, round, earned, throws }].
export function playLives(seed, n, { rules = SIM_RULES, pick = moveFor } = {}) {
  const out = [];
  let born = null;
  for (let k = 0; k < n; k++) {
    const g = playGame(lifeSeed(seed, k), { players: 1, rules, pick, born });
    out.push(g);
    // the law's win ends the soul's count, as liberation does (svarga's return is the page's, not the measure's); a law
    // with no next life (Cārvāka) ends it too
    if (g.winner === 0 || !lawOf(g.state, 0).rebirth) break;
    let soul = soulOf(g.state, 0);
    g.interludes = [];
    for (let r = 0; soul?.animal; r++) {
      const a = playGame((lifeSeed(seed, k + 1) ^ Math.imul(r + 1, 0x9e3779b1)) >>> 0, { players: 1, rules: animalRules(soul.animal, rules), pick });
      const p = a.players[0];
      g.interludes.push({ kind: soul.animal.kind, round: soul.animal.round, earned: !!p.earned, throws: p.throws });
      soul = afterAnimal(soul, !!p.earned);
    }
    born = bornOf(soul);
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
  // --law: every computer plays under that law (Phase 17, src/engine/laws/index.js); --policy still says how it chooses
  if (flags.law && !LAWS[flags.law]) throw new Error(`no law ${flags.law}: ${Object.keys(LAWS).join(", ")}`);
  const rules = flags.law ? { ...SIM_RULES, law: flags.law } : SIM_RULES;
  const pct = x => `${(x * 100).toFixed(1)}%`;
  // the words for a law's win and its Śiva's snake (Phase 17): mokṣa is "liberated", Mīmāṃsā's svarga is the law's own,
  // and under Cārvāka nothing is won and the snake is the end
  const LAW = LAWS[flags.law ?? "board"], KIND = LAW.exit()?.kind, WON = KIND === "moksha" ? "liberated" : KIND ? `won (${KIND})` : "won (no exit under this law)";
  const SNAKE = LAW.rebirth ? "born again" : "the end";
  // --lives: one soul's lives a seed (Phase 16)
  if (flags.lives) {
    const n = +flags.lives, byLife = Array.from({ length: n }, () => ({ lives: 0, freed: 0, ledger: 0, years: 0, door: 0, fell: 0, turns: [] }));
    let capped = 0;
    let lived = 0, freed = 0, reborn = 0;
    // the animal interludes: how many, by round, earned, their throws, and by kind
    const beasts = { n: 0, earned: 0, second: 0, throws: [], kinds: {} };
    const all = [];
    for (let s = first; s < first + games; s++) {
      const chain = playLives(s, n, { rules, pick });
      // a game may hold several lives since Phase 17 (Śiva's snake is rebirth in the seat): the soul's lives are every
      // one of them in order, and only the first n count
      const lives = chain.flatMap(g => livesOf(g).map(x => ({ ...x, turns: g.per[0][x.k].turns })));
      chain.forEach(g => { capped += g.capped; for (const x of g.interludes ?? []) { beasts.n++; beasts.earned += x.earned; beasts.second += x.round === 2; beasts.throws.push(x.throws); beasts.kinds[x.kind] = (beasts.kinds[x.kind] || 0) + 1; } });
      lives.slice(0, n).forEach(({ p, won, turns }, k) => {
        const b = byLife[k];
        all.push(turns);
        lived++; b.lives++; b.turns.push(turns);
        // born again: a next life follows (none after the last counted, nor under a law with no next life)
        if (won) { freed++; b.freed++; } else if (k < Math.min(n, lives.length) - 1) reborn++;
        if (p.death) b[p.death.by]++;
        b.fell += p.fell;
      });
    }
    console.log(`${games} souls, up to ${n} lives each, seeds ${first}–${first + games - 1}${flags.policy ? `, policy ${flags.policy}` : ""}${flags.penance ? `, penance ${flags.penance}` : ""}`);
    console.log(`lives lived ${lived}; ${WON} ${pct(freed / games)} of souls within ${n} lives; per life ${pct(freed / lived)}; lives per win ${freed ? (lived / freed).toFixed(2) : "—"}; reborn ${pct(reborn / lived)} of lives`);
    const at = summarise(all), bt = summarise(beasts.throws.length ? beasts.throws : [0]);
    console.log(`turns a life: median ${at.median}, p95 ${at.p95}; games that hit the cap of ${CAP} turns ${capped}; animal interludes ${(100 * beasts.n / lived).toFixed(1)} per hundred lives, a second round in ${beasts.n ? pct(beasts.second / beasts.n) : "—"}, the human birth earned in ${beasts.n ? pct(beasts.earned / beasts.n) : "—"}, throws median ${bt.median}, p95 ${bt.p95}; by kind ${Object.entries(beasts.kinds).map(([k, c]) => `${k} ${c}`).join(", ") || "none"}`);
    for (const [k, b] of byLife.entries()) {
      if (!b.lives) continue;
      const t = summarise(b.turns);
      console.log(`  life ${k + 1}: ${b.lives} lived, ${WON} ${pct(b.freed / b.lives)}; died by the ledger ${pct(b.ledger / b.lives)}, years on earth ${pct(b.years / b.lives)}, at the door ${pct(b.door / b.lives)}; Śiva's snake ${pct(b.fell / b.lives)}; turns median ${t.median}, p95 ${t.p95}`);
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
  let fellSnake = 0, fellSpent = 0, refusedAll = 0, couldSit = 0, doorDeaths = 0, throughDoor = 0, passed = 0, penanced = 0, cursed = 0, cursedLanded = 0, cursedOpen = 0;
  const doorYears = [];
  // Phase 15: the ego's throws, by the faces it owned: [6] sattva, [5,6] mixed, [4,5,6] rajas or tamas, [] none
  const BANDS = ["none", "sattva", "mixed", "rajas/tamas"], egoBands = BANDS.map(() => [0, 0]);
  let throws = 0, rebellions = 0, rebelLives = 0;
  // Phase 16: deaths by cause, and the ledger's by age and form
  const causes = { ledger: 0, years: 0, door: 0 }, ledgerAges = {}, forms = Object.fromEntries(FORMS.map(f => [f, 0]));
  // Phase 17: the turns of each life, rebirths through Śiva's snake a game, and games that hit the cap
  const lifeTurns = [], merits = {};
  let rebirths = 0, capped = 0;
  for (let s = first; s < first + games; s++) {
    const g = playGame(s, { players, rules, pick }), { turns, per, players: ps } = g;
    lengths.push(Math.max(...turns));
    rolls += turns.reduce((a, b) => a + b, 0);
    capped += g.capped;
    rebirths += ps.reduce((a, p) => a + (p.rebirths ?? 0), 0);
    // Phase 8: each life's end, length in years, and the bhumikas it was in; since Phase 17 every life of every seat
    for (const { p, i, k: nth, won } of livesOf(g)) {
      const w = per[i][nth], seen = w.seen;
      lives++; died += p.dead;
      lifeTurns.push(w.turns);
      // a life that Śiva's snake closed (REDESIGN.md Phases 12, 17)
      falls12 += p.fell;
      open += !won && !p.dead && !p.fell;
      heavenTurns.push(w.heaven);
      const k = w.karma;
      planted += k.planted; eligible += k.eligible; fired += k.fired; reckoned += k.fired > 0; arrivals += k.arrivals;
      for (const [b, [e, f]] of Object.entries(k.bands)) { (bands[b] ||= [0, 0])[0] += e; bands[b][1] += f; }
      k.tiers.forEach(t => tiers[t]++);
      refusedLives += k.refused.length > 0; k.refused.forEach(r => { refusals[r] = (refusals[r] || 0) + 1; });
      dyingLives += k.dies.length > 0;
      if (k.dies.length) { const a = k.dies[0], band = a < 40 ? "under 40" : a < 60 ? "40–59" : a < 80 ? "60–79" : "80+"; dieAges[band] = (dieAges[band] || 0) + 1; }
      carriedEnd += (p.karma?.sancita?.length ?? 0) > 0;
      fellSnake += p.fellBy === "snake"; fellSpent += p.fellBy === "spent";
      if (p.merit != null) (merits[p.merit] = (merits[p.merit] || 0) + 1);
      refusedAll += k.refused.length; couldSit += k.couldSit; throughDoor += k.throughDoor;
      if (k.doorYears) doorYears.push(k.doorYears);
      doorDeaths += !!p.dead && p.pos === 105;
      if (p.death) {
        causes[p.death.by]++;
        if (p.death.by === "ledger") { const a = p.death.age, band = a <= 50 ? "to 50" : a <= 68 ? "51–68" : "69+"; ledgerAges[band] = (ledgerAges[band] || 0) + 1; forms[p.death.form]++; }
      }
      for (const x of p.sittings ?? []) { passed += x.pass; penanced += !x.pass && x.cleared; }
      const thrown = (p.witness ?? []).filter(w => w.faces), overruled = thrown.filter(w => w.chose !== w.took);
      throws += thrown.length; rebellions += overruled.length; rebelLives += overruled.length > 0;
      for (const w of thrown) { const b = egoBands[Math.min(w.faces.length, 3)]; b[0]++; b[1] += w.chose !== w.took; }
      const cu = curseIn(p);
      if (cu) { cursed++; if (cu.closedAt != null) cursedLanded++; else if (!won && !p.dead && !p.fell) cursedOpen++; }
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
      if (won) freed.push(p.years);
      const lived = yearsAlong(life, p.told || []), where = y => lived.filter(e => e.years <= y && e.n <= 100).at(-1)?.n ?? 0;
      at50.push(where(50)); at70.push(where(70));
      sat.push(p.gunas.s); tam.push(p.gunas.t); dharma.push(p.aims.dharma); peaks.push(p.peak ?? -1);
      // a choice is the least worth one of its situation when no option there is worth less
      life.forEach((n, k) => { const o = optionOf(n, p.told?.[k]); if (!o) return; met++; crooked += SITUATIONS[n].options.every(x => worthOf(x) >= worthOf(o)); });
      if (seen.size) { sannyasins++; finals[Math.max(...seen)]++; shown[seen.size] = (shown[seen.size] || 0) + 1; }
    }
  }
  const r = summarise(lengths), y = summarise(spans);
  console.log(`${games} games, ${players} players, seeds ${first}–${first + games - 1}, span ${SPAN}, two dice from ${ENDGAME}${flags.pick ? `, pick ${flags.pick}` : ""}${flags.practice ? `, practice ${flags.practice}` : ""}${flags.roll ? `, roll ${flags.roll}` : ""}${flags.policy ? `, policy ${flags.policy}` : ""}${flags.situations ? `, situations ${flags.situations}` : ""}${flags.death ? `, death ${flags.death}` : ""}${flags.penance ? `, penance ${flags.penance}` : ""}${flags.unpaid ? `, unpaid from weight ${flags.unpaid}` : ""}${flags.law ? `, law ${flags.law}` : ""}`);
  console.log(`turns per player until the game ends: median ${r.median}, p5 ${r.p5}, p95 ${r.p95}, mean ${r.mean.toFixed(1)}, max ${r.max}, over 100: ${pct(r.over100)}`);
  console.log(`rolls per game: mean ${(rolls / games).toFixed(1)}`);
  const lt = summarise(lifeTurns);
  console.log(`turns per life: median ${lt.median}, p5 ${lt.p5}, p95 ${lt.p95}, max ${lt.max}; lives ${lives} in ${games * players} seats; rebirths through Śiva's snake ${(rebirths / games).toFixed(3)} a game; games that hit the cap of ${CAP} turns ${capped}`);
  console.log(`lives that end in death: ${pct(died / lives)}; years lived: median ${y.median}, p5 ${y.p5}, p95 ${y.p95}, max ${y.max}`);
  console.log(`highest bhumika reached, of ${sannyasins} sannyasins: ${finals.map((c, b) => `${b + 1}: ${pct(c / sannyasins)}`).join(" · ")} (turya ${pct(finals[TURYA] / sannyasins)})`);
  console.log(`bhumikas a sannyasin is shown: ${Object.entries(shown).map(([k, c]) => `${k}: ${pct(c / sannyasins)}`).join(" · ")}`);
  const b = summarise(freed);
  console.log(`the 99 → 61 snake taken twice or more: ${pct(looped / lives)}; a square landed on four times or more: ${pct(told4 / lives)}; the same moment told four times or more: ${pct(said4 / lives)}; years sat out: ${(sits / lives).toFixed(2)} a life`);
  const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length, med = xs => summarise(xs).median;
  console.log(`${WON}: ${pct(freed.length / lives)}; situations met: ${(met / lives).toFixed(2)} a life, the least worth option taken in ${met ? pct(crooked / met) : "—"} of them`);
  console.log(`on the board: square at fifty median ${med(at50)} (mean ${mean(at50).toFixed(1)}), at seventy median ${med(at70)} (mean ${mean(at70).toFixed(1)})`);
  console.log(`the ledger at the end: sattva ${mean(sat).toFixed(3)}, tamas ${mean(tam).toFixed(3)}, dharma ${mean(dharma).toFixed(1)}, highest bhumika ${mean(peaks.filter(x => x >= 0)).toFixed(2)}`);
  const h = summarise(heavenTurns);
  console.log(`how lives end: ${WON} ${pct(freed.length / lives)}, died ${pct(died / lives)}, Śiva's snake (${SNAKE}) ${pct(falls12 / lives)}, still playing when the game ended ${pct(open / lives)}; lives per ${KIND === "moksha" ? "liberation" : "win"} ${freed.length ? (lives / freed.length).toFixed(2) : "—"}`);
  console.log(`turns in 106–109: mean ${h.mean.toFixed(2)}, median ${h.median}, p95 ${h.p95}, max ${h.max}; in those that went there ${(heavenTurns.reduce((a, b) => a + b, 0) / Math.max(1, heavenTurns.filter(Boolean).length)).toFixed(2)}; a square at or above 94 landed on four times or more: ${pct(divine4 / lives)}`);
  const all = tiers.reduce((a, b) => a + b, 0) || 1, nref = Object.values(refusals).reduce((a, b) => a + b, 0);
  console.log(`the ledger: debts planted ${(planted / lives).toFixed(2)} a life; lives ending with a debt never met ${pct(carriedEnd / lives)}`);
  console.log(`the omen: a 6 with a ripe debt ${(eligible / lives).toFixed(2)} a life, a reckoning ${(fired / lives).toFixed(2)} a life, in ${pct(reckoned / lives)} of lives; fired, by where it fell: ${Object.keys(bands).sort((a, b) => parseInt(a) - parseInt(b)).map(b => `${b} ${bands[b][0] ? pct(bands[b][1] / bands[b][0]) : "—"} of ${bands[b][0]}`).join(" · ")}`);
  console.log(`severity of ${fired} reckonings: ${tiers.map((c, t) => `${["floor only", "years", "+ holding", "+ sent back", flags.death === "off" ? "death (reported only)" : "death"][t]} ${pct(c / all)}`).join(" · ")}; lives in which the death tier came ${pct(dyingLives / lives)}${dyingLives ? ` (at ${Object.entries(dieAges).map(([b, c]) => `${b}: ${c}`).join(", ")})` : ""}`);
  console.log(`death: ${pct((causes.ledger + causes.years + causes.door) / lives)} of lives, by the ledger ${pct(causes.ledger / lives)}, years on earth ${pct(causes.years / lives)}, years at the door ${pct(causes.door / lives)}; the ledger's by age ${Object.entries(ledgerAges).map(([b, c]) => `${b}: ${c}`).join(", ") || "none"}; by form ${FORMS.map(f => `${f} ${forms[f]}`).join(", ")}`);
  console.log(`the door: arrivals at 105 ${(arrivals / lives).toFixed(2)} a life, refused ${arrivals ? pct(nref / arrivals) : "—"} of them (${Object.entries(refusals).map(([r, c]) => `${r} ${c}`).join(", ") || "none"}); lives refused at least once ${pct(refusedLives / lives)}`);
  const dy = summarise(doorYears.length ? doorYears : [0]);
  const entered = Object.values(merits).reduce((a, b) => a + b, 0);
  console.log(`the fall: Śiva's snake by the exact throw ${pct(fellSnake / lives)}, the merit spent ${pct(fellSpent / lives)}; merit on entering the heavens, of ${entered} lives: ${[1, 2, 3, 4].map(n => `${n} turn${n > 1 ? "s" : ""} ${pct((merits[n] || 0) / Math.max(1, entered))}`).join(", ")}; refusals ${(refusedAll / lives).toFixed(3)} a life, of which a sannyāsin who could sit ${refusedAll ? pct(couldSit / refusedAll) : "—"}`);
  console.log(`the examination: lives that sat at the door ${pct(doorYears.length / lives)}, years there median ${dy.median}, p95 ${dy.p95}, max ${dy.max} (mean ${(doorYears.reduce((a, b) => a + b, 0) / lives).toFixed(3)} a life); debts the book answered ${passed}, paid in penance ${penanced}; through the door ${pct(throughDoor / lives)} of lives; deaths at the door ${pct(doorDeaths / lives)}`);
  console.log(`the curse: spoken in ${pct(cursed / lives)} of lives; closed by landing ${cursed ? pct(cursedLanded / cursed) : "—"}, the other way ${cursed ? pct((cursed - cursedLanded - cursedOpen) / cursed) : "—"}`);
  console.log(`the witness: ego throws ${(throws / lives).toFixed(3)} a life, rebellions ${(rebellions / lives).toFixed(3)} a life (${throws ? pct(rebellions / throws) : "—"} of throws); lives that rebelled ${pct(rebelLives / lives)}`);
  console.log(`  by the gunas: ${BANDS.map((b, k) => `${b} ${throws ? pct(egoBands[k][0] / throws) : "—"} of throws, rebelled ${egoBands[k][0] ? pct(egoBands[k][1] / egoBands[k][0]) : "—"}`).join("; ")}`);
  console.log(`through the exit by ${AT} years: ${pct(freed.filter(y => y <= AT).length / lives)}; age at the exit: p5 ${b.p5}, median ${b.median}, p95 ${b.p95}`);
}
