// Phase 1 checks in a real browser, served over HTTP under /moksha-patam/ as on the live site.
//   node tools/smoke.mjs
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (!url.pathname.startsWith("/moksha-patam/")) { res.writeHead(404); return res.end(); }
  let file = path.join(root, decodeURIComponent(url.pathname.slice("/moksha-patam/".length)) || "index.html");
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/moksha-patam/`;

const browser = await chromium.launch({ channel: "chrome" });
let failures = 0;
async function check(name, fn, { limit = 90, persistent = false } = {}) {
  // install checks need a real profile: Chrome will not report installability in incognito
  const ctx = persistent
    ? await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "mp-smoke-")), { channel: "chrome", viewport: { width: 1200, height: 900 } })
    : await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => m.type() === "error" && errors.push(m.text()));
  try {
    await Promise.race([fn(page, ctx), new Promise((_, no) => setTimeout(() => no(new Error(`took over ${limit}s`)), limit * 1000))]);
    if (errors.length) throw new Error("page errors: " + errors.join("; "));
    console.log(`ok    ${name}`);
  } catch (e) {
    failures++;
    console.log(`FAIL  ${name}\n      ${e.message.split("\n")[0]}`);
  } finally {
    await ctx.close();
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const folioOpen = page => page.evaluate(() => document.getElementById("folio").open);
const title = page => page.evaluate(() => document.getElementById("leafTitle")?.textContent.trim());
const twoCpus = page => page.addInitScript(() => {
  const cpu = { name: "", type: "cpu" };
  window.claude = { hot: { data: { setup: { count: 2, rows: [cpu, cpu, cpu, cpu], rules: { exact: true, six: true } } } } };
});

await check("every square 1–110 opens from the board, and closes", async page => {
  await page.goto(BASE + "?seed=1");
  for (let n = 1; n <= 110; n++) {
    await page.click(`#labels .lab[data-n="${n}"]`);
    await page.waitForFunction(() => document.getElementById("folio").open);
    await page.waitForTimeout(400); // the view transition
    assert((await title(page))?.length, `square ${n} has no title`);
    assert(await page.evaluate(n => location.hash === `#sq/${n}`, n), `square ${n} is not in the address`);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.getElementById("folio").open);
  }
}, { limit: 400 });

await check("every depth, in both languages, has no blank or undefined text", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // so each card draws at once
  for (const lang of ["en", "hi"]) for (const depth of ["story", "school", "scholar"]) {
    await page.goto(BASE + `?seed=1&debug&lang=${lang}&depth=${depth}`);
    const bad = await page.evaluate(async () => {
      const out = [];
      for (let n = 1; n <= 110; n++) {
        mp.open(n);
        const leaf = document.getElementById("leaf"), text = leaf.textContent;
        if (/undefined|null|\[object/.test(text)) out.push(`${n}: ${text.match(/undefined|null|\[object/)[0]}`);
        if (!leaf.querySelector(".story p")?.textContent.trim()) out.push(`${n}: empty story`);
        for (const p of leaf.querySelectorAll(".leaf-text p, .leaf-text li")) if (!p.textContent.trim()) out.push(`${n}: empty ${p.className || p.tagName}`);
      }
      await mp.close({ instant: true });
      return out;
    });
    assert(!bad.length, `${lang}/${depth}: ${bad.slice(0, 4).join(", ")}`);
  }
});

await check("every Codex entry opens, from a link, in both languages", async page => {
  for (const lang of ["en", "hi"]) {
    await page.goto(BASE + `?lang=${lang}#codex/nyaya`);
    await page.waitForFunction(() => document.getElementById("folio").open);
    assert((await title(page)) === (lang === "hi" ? "न्याय" : "Nyaya"), "the #codex/nyaya link did not open Nyaya");
    const bad = await page.evaluate(() => {
      const out = [];
      for (let i = 0; i < 60 && document.querySelector('#leaf [data-act="next"]'); i++) {
        document.querySelector('#leaf [data-act="next"]').click();
        const text = document.getElementById("leaf").textContent;
        if (/undefined|null/.test(text)) out.push(document.getElementById("leafTitle").textContent);
      }
      return out;
    });
    assert(!bad.length, `bad entries: ${bad.join(", ")}`);
  }
});

await check("a square's school chip opens the Codex, and Back returns to the square", async page => {
  await page.goto(BASE + "?depth=school");
  await page.click('#labels .lab[data-n="33"]');
  await page.waitForFunction(() => document.getElementById("folio").open);
  await page.click('#leaf .chip[data-entry="samkhya"]');
  assert((await title(page)) === "Samkhya", "chip did not open Samkhya");
  await page.click('#leaf [data-act="back"]');
  assert((await title(page)) === "Banyan seed", "Back did not return to 33");
  const met = await page.evaluate(() => JSON.parse(localStorage.getItem("mp-codex")));
  assert(met.includes("samkhya") && met.includes("vaisheshika") && met.includes("chandogya"), "Codex did not record what was met");
});

await check("a human's landing card stays open; Space then rolls", async page => {
  await page.goto(BASE + "?seed=4");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => document.getElementById("folio").open, null, { timeout: 15000 });
  await page.waitForTimeout(10000);
  assert(await folioOpen(page), "the landing card closed by itself");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => !document.getElementById("folio").open);
});

await check("the computer waits while a card is open, then carries on", async page => {
  await twoCpus(page);
  await page.goto(BASE + "?seed=2&debug");
  await page.evaluate(() => { mp.open(50); }); // open() settles only when the card closes
  const before = await page.evaluate(() => mp.state.log.length);
  await page.waitForTimeout(4000);
  assert((await page.evaluate(() => mp.state.log.length)) === before, "a computer moved while a card was open");
  await page.evaluate(() => mp.close());
  await page.waitForFunction(n => mp.state.log.length > n, before, { timeout: 20000 });
});

await check("a computer's landing card closes itself, unless someone is reading", async page => {
  await twoCpus(page);
  await page.goto(BASE + "?seed=2&debug");
  await page.waitForFunction(() => document.getElementById("folio").open, null, { timeout: 15000 });
  await page.waitForFunction(() => !document.getElementById("folio").open, null, { timeout: 8000 });
  await page.waitForFunction(() => document.getElementById("folio").open, null, { timeout: 15000 });
  await page.mouse.move(600, 450); await page.mouse.move(610, 460);
  await page.waitForTimeout(6000);
  assert(await folioOpen(page), "the card closed while being read");
});

await check("each log entry reopens its square", async page => {
  // you against the computer: roll, read, close, and wait for your turn to come back
  await page.goto(BASE + "?seed=5&debug");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => document.getElementById("folio").open, null, { timeout: 15000 });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.getElementById("roll").disabled && !document.getElementById("folio").open && document.querySelectorAll("#log .logbtn").length >= 2, null, { timeout: 30000 });
  const sq = await page.evaluate(() => { const b = document.querySelector("#log .logbtn"); b.click(); return +b.dataset.sq; });
  await page.waitForFunction(() => document.getElementById("folio").open);
  assert(await page.evaluate(sq => location.hash === `#sq/${sq}`, sq), "log entry opened the wrong square");
});

await check("keyboard: arrows move across the board, Enter opens, arrows page the card", async page => {
  await page.goto(BASE);
  await page.focus('#labels .lab[data-n="1"]');
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  assert(await page.evaluate(() => document.activeElement.dataset.n) === "19", "arrows did not land on 19");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("folio").open);
  await page.keyboard.press("ArrowRight");
  assert((await page.evaluate(() => location.hash)) === "#sq/20", "ArrowRight did not page to 20");
});

await check("card language toggles without changing the page language; both-languages option shows both", async page => {
  await page.goto(BASE + "#sq/59");
  await page.waitForFunction(() => document.getElementById("folio").open);
  await page.click('#leaf [data-cl="hi"]');
  assert((await title(page)) === "क्रोध", "card did not switch to Hindi");
  assert(await page.evaluate(() => document.documentElement.lang) === "en", "page language changed");
  await page.evaluate(() => { localStorage.setItem("mp-prefs", JSON.stringify({ both: true })); });
  await page.goto(BASE + "?both#sq/59"); // a new query, so the page really reloads
  await page.waitForFunction(() => document.getElementById("folio").open);
  assert(await page.evaluate(() => document.querySelectorAll("#leaf .story p.second[lang=hi]").length === 1), "both-languages mode shows one language");
});

await check("mute persists across reloads", async page => {
  await page.goto(BASE);
  await page.click("#mute");
  await page.reload();
  assert(await page.evaluate(() => document.getElementById("mute").getAttribute("aria-pressed")) === "false", "mute did not persist");
});

await check("reduced motion: a whole computer game plays through with cards", async (page, ctx) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await twoCpus(page);
  await page.addInitScript(() => { const st = window.setTimeout; window.setTimeout = (f, ms, ...r) => st(f, Math.min(ms, 30), ...r); });
  await page.goto(BASE + "?seed=6");
  await page.waitForFunction(() => !document.getElementById("win").hidden, null, { timeout: 60000 });
});

await check("installable: manifest and service worker pass Chrome's check", async page => {
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  assert(!installabilityErrors.length, JSON.stringify(installabilityErrors));
  const { url, errors } = await cdp.send("Page.getAppManifest");
  assert(url.endsWith("manifest.webmanifest") && !errors.length, "manifest errors: " + JSON.stringify(errors));
}, { persistent: true });

await check("offline: after one visit the game reloads and plays with no network", async (page, ctx) => {
  await page.goto(BASE + "?seed=3");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await ctx.setOffline(true);
  await page.reload();
  assert(await page.evaluate(() => document.querySelectorAll("#labels .lab").length) === 110, "board did not render offline");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => document.getElementById("folio").open, null, { timeout: 15000 });
  const loaded = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === "loaded").map(f => f.family.replace(/"/g, "")); });
  assert(loaded.includes("Crimson Pro"), "card font not available offline: " + loaded.join(", "));
  await ctx.setOffline(false);
});

await browser.close();
server.close();
console.log(failures ? `${failures} check(s) failed` : "all checks passed");
process.exit(failures ? 1 : 0);
