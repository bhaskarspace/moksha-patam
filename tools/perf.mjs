// Frame times of the board's animations in a real browser, on a throttled phone-sized page (REDESIGN.md §4 Phase 5).
//   node tools/perf.mjs [--rate=4] [--runs=3] [--query=quality=low]
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
const MOVES = [["walk", 40, 6], ["climb", 5, 1], ["swallow", 13, 1]];

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  try { localStorage.setItem("mp-self", JSON.stringify({ name: "", gender: "f" })); localStorage.setItem("mp-prefs", JSON.stringify({ mute: true })); } catch {}
  // every card that opens closes again, so a move runs straight through
  setInterval(() => { if (document.getElementById("folio")?.open) window.mp?.close({ instant: true }); }, 50);
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);

const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; };
const repaint = [];
const results = Object.fromEntries(MOVES.map(([n]) => [n, { frames: [], longest: 0 }]));

for (let run = 0; run < RUNS; run++) {
  await page.goto(BASE + "?debug&seed=1" + (QUERY ? "&" + QUERY : ""));
  await page.waitForFunction(() => window.mp && !document.getElementById("roll").disabled);
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
  repaint.push(...await page.evaluate(() => [20, 45, 70, 95, 30, 60].map(n => { const t = performance.now(); mp.jump(n); return performance.now() - t; })));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
}

console.log(`CPU throttle ${RATE}x, 390x844 at DPR 3, ${RUNS} runs`);
console.log("move      frames   p50 ms   p95 ms   longest frame ms");
for (const [name, { frames, longest }] of Object.entries(results)) {
  console.log(`${name.padEnd(9)} ${String(frames.length).padStart(6)} ${q(frames, 0.5).toFixed(1).padStart(8)} ${q(frames, 0.95).toFixed(1).padStart(8)} ${longest.toFixed(0).padStart(12)}`);
}
if (repaint.length) console.log(`turn-end repaint (players, log and the age of every square): p50 ${q(repaint, 0.5).toFixed(1)} ms, max ${Math.max(...repaint).toFixed(1)} ms`);
await browser.close();
server.close();
