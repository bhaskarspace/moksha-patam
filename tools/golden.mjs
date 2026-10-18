// Equivalence check: the built index.html?seed=seed, played in a real browser, and sim.mjs must
// produce the same move log, so the page and the headless engine never drift apart.
// Until Phase 4 it also replayed the Phase 0 build (commit fb0bc2a) and required the same log. Phase 4
// changed the rules on purpose (bounce-back, the merit snake on 109, the log of passed squares), so
// that leg was retired; `git show fb0bc2a:tools/golden.mjs` has it.
//   node tools/golden.mjs [seeds=20]
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { playGame } from "./sim.mjs";

const root = path.resolve(import.meta.dirname, "..");
const seeds = +(process.argv[2] ?? 20);
const newUrl = pathToFileURL(path.join(root, "index.html")).href;

// Runs before the page's own script: seeded Math.random, every log entry recorded as it is made,
// timers collapsed to zero so a whole game plays in seconds, and a two-computer setup.
function harness({ seed, cards }) {
  let a = seed;
  Math.random = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  window.__log = [];
  const unshift = Array.prototype.unshift;
  Array.prototype.unshift = function (...xs) {
    if (xs.length === 1 && xs[0] && typeof xs[0] === "object" && "k" in xs[0] && "kind" in xs[0]) window.__log.push(JSON.parse(JSON.stringify(xs[0])));
    return unshift.apply(this, xs);
  };
  const st = window.setTimeout;
  window.setTimeout = (f, ms, ...r) => st(f, 0, ...r);
  // The baseline build can freeze under reduced motion when a frame time comes before an animation's start
  // (fixed in src/render/tokens.js), so every frame gets the current time.
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = cb => raf(() => cb(performance.now()));
  const cpu = { name: "", type: "cpu" };
  window.claude = { hot: { data: { setup: { count: 2, rows: [cpu, cpu, cpu, cpu], rules: { six: true, brahmaloka: false, cards } } } } };
}

async function run(url, seed, cards) {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => m.type() === "error" && errors.push(m.text()));
  await page.addInitScript(harness, { seed, cards });
  await page.goto(url);
  try {
    await page.waitForFunction(() => !document.getElementById("win").hidden, null, { timeout: 30000, polling: 250 });
  } catch (e) {
    const where = await page.evaluate(() => ({ entries: window.__log.length, last: window.__log.at(-1), roll: document.getElementById("roll").textContent, card: !document.getElementById("sqcard").hidden, vis: document.visibilityState }));
    await ctx.close();
    throw new Error(`${url} seed ${seed} stalled: ${JSON.stringify(where)} errors: ${errors.join("; ")}`);
  }
  const log = await page.evaluate(() => window.__log);
  await ctx.close();
  if (errors.length) throw new Error(`${url}: ${errors.join("; ")}`);
  return log;
}

const browser = await chromium.launch({ channel: "chrome" });
let failed = 0;
const jobs = [];
for (let seed = 1; seed <= seeds; seed++) jobs.push({ seed, cards: seed % 4 === 0 ? "all" : "off" });
async function worker() {
  for (let job; (job = jobs.shift());) {
    const { seed, cards } = job;
    const after = await run(`${newUrl}?seed=${seed}`, seed, cards);
    const sim = playGame(seed).log.slice(1);
    const same = JSON.stringify(after) === JSON.stringify(sim);
    if (!same) failed++;
    console.log(`seed ${String(seed).padStart(3)}  cards ${cards.padEnd(3)}  ${after.length} entries  ${same ? "identical" : "DIFFERENT"}`);
  }
}
await Promise.all([worker(), worker(), worker()]);
await browser.close();
console.log(failed ? `${failed} of ${seeds} seeds differ` : `all ${seeds} seeds identical across the page and sim`);
process.exit(failed ? 1 : 0);
