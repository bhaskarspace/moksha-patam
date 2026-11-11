// Frame times of the board's animations in a real browser, on a throttled phone-sized page (REDESIGN.md §4 Phase 5).
//   node tools/perf.mjs [--rate=4] [--runs=3] [--query=quality=low] [--board=72]
// Reports p50 and p95 frame time and the longest animation frame for a walk, a climb and a swallow.
// It reports and never fails: the budget lives in the Phase 5 plan, and a laptop is only a proxy for a phone.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const arg = (k, d) => +(process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const RATE = arg("rate", 4), RUNS = arg("runs", 3);
const QUERY = process.argv.find(a => a.startsWith("--query="))?.slice(8) ?? "";

const root = path.resolve(import.meta.dirname, "..");
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let file = path.join(root, decodeURIComponent(url.pathname.slice("/moksha-patam/".length)) || "index.html");
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
  res.writeHead(200, { "content-type": file.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/moksha-patam/`;

// [name, square to stand on, roll]: 5 + 1 lands on the ladder at 6, 13 + 1 on the snake at 14, 40 + 6 walks six squares
// on the 72 (Phase 18), 30 + 5 walks five plain squares, 53 + 1 climbs bhakti's ladder at 54, 51 + 1 meets the snake at 52
const BOARD = process.argv.find(a => a.startsWith("--board="))?.slice(8) ?? "110";
// on the 84, 30 + 5 walks five squares, 7 + 1 climbs the ladder at its foot on the 1, 12 + 1 meets the snake at 13
const MOVES = {
  72: [["walk", 30, 5], ["climb", 53, 1], ["swallow", 51, 1]],
  84: [["walk", 30, 5], ["climb", 7, 1], ["swallow", 12, 1]],
}[BOARD] ?? [["walk", 40, 6], ["climb", 5, 1], ["swallow", 13, 1]];
// squares the repaint jumps to, all on the board in play
const REPAINT = BOARD === "110" ? [20, 45, 70, 95, 30, 60] : [20, 45, 70, 25, 30, 60];

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  try { localStorage.setItem("mp-self", JSON.stringify({ name: "", gender: "f" })); localStorage.setItem("mp-prefs", JSON.stringify({ mute: true })); } catch {}
  // every card that opens closes again, so a move runs straight through
  setInterval(() => { if (document.getElementById("folio")?.open) window.mp?.close({ instant: true }); }, 50);
  // four computers at the table, for the lives side by side
  if (location.search.includes("perf4")) { const cpu = { name: "", type: "cpu" }; window.claude = { hot: { data: { setup: { count: 4, rows: [cpu, cpu, cpu, cpu], rules: { six: true, mode: "together" } } } } }; }
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);

const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; };
const repaint = [], compare = [];
const results = Object.fromEntries(MOVES.map(([n]) => [n, { frames: [], longest: 0 }]));

for (let run = 0; run < RUNS; run++) {
  await page.goto(BASE + "?debug&seed=1" + (QUERY ? "&" + QUERY : ""));
  await page.waitForFunction(() => window.mp && !document.getElementById("roll").disabled);
  if (BOARD !== "110") { await page.evaluate(id => mp.board(id), BOARD); await page.waitForFunction(id => mp.board() === id && !mp.busy, BOARD); }
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  for (const [name, from, roll] of MOVES) {
    const r = await page.evaluate(async ([from, roll]) => {
      mp.jump(from);
      await new Promise(res => setTimeout(res, 300));
      const frames = [], loaf = [];
      const obs = "PerformanceObserver" in window && PerformanceObserver.supportedEntryTypes.includes("long-animation-frame")
        ? new PerformanceObserver(l => l.getEntries().forEach(e => loaf.push(e.duration))) : null;
      obs?.observe({ type: "long-animation-frame" });
      let last = performance.now(), on = true;
      const tick = now => { frames.push(now - last); last = now; if (on) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      await mp.roll(roll);
      on = false; obs?.disconnect();
      return { frames: frames.slice(1), longest: Math.max(0, ...loaf) };
    }, [from, roll]);
    results[name].frames.push(...r.frames);
    results[name].longest = Math.max(results[name].longest, r.longest);
  }
  // the end of a turn: everything mp.jump redraws, which includes repainting the age of every square
  repaint.push(...await page.evaluate(ns => ns.map(n => { const t = performance.now(); mp.jump(n); return performance.now() - t; }), REPAINT));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
}

// the lives side by side (Phase 19): four computers played together a hundred and sixty turns, then the screen opened,
// which plays the game again, and its picture drawn
for (let run = 0; run < RUNS; run++) if (BOARD === "110" && await page.evaluate(() => !!mp.compareOpen)) {
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await page.goto(BASE + "?debug&seed=4&perf4" + (QUERY ? "&" + QUERY : ""));
  await page.waitForFunction(() => window.mp && mp.state.players.length === 4);
  await page.evaluate(() => mp.play(160));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  compare.push(await page.evaluate(() => { let t = performance.now(); mp.compareOpen(); const open = performance.now() - t; t = performance.now(); mp.compareImage(); return [open, performance.now() - t]; }));
  await page.evaluate(() => document.querySelector(".cmp-close").click());
}

console.log(`board ${BOARD}, CPU throttle ${RATE}x, 390x844 at DPR 3, ${RUNS} runs`);
console.log("move      frames   p50 ms   p95 ms   longest frame ms");
for (const [name, { frames, longest }] of Object.entries(results)) {
  console.log(`${name.padEnd(9)} ${String(frames.length).padStart(6)} ${q(frames, 0.5).toFixed(1).padStart(8)} ${q(frames, 0.95).toFixed(1).padStart(8)} ${longest.toFixed(0).padStart(12)}`);
}
if (repaint.length) console.log(`turn-end repaint (players, log and the age of every square): p50 ${q(repaint, 0.5).toFixed(1)} ms, max ${Math.max(...repaint).toFixed(1)} ms`);
if (compare.length) console.log(`the lives side by side: open p50 ${q(compare.map(x => x[0]), 0.5).toFixed(0)} ms, max ${Math.max(...compare.map(x => x[0])).toFixed(0)} ms; its picture p50 ${q(compare.map(x => x[1]), 0.5).toFixed(0)} ms`);
else console.log("the lives side by side: n/a");
await browser.close();
server.close();
