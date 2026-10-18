// Phase 1 and 2 checks in a real browser, served over HTTP under /moksha-patam/ as on the live site.
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
async function check(name, fn, { limit = 90, persistent = false, named = true } = {}) {
  // install checks need a real profile: Chrome will not report installability in incognito
  const ctx = persistent
    ? await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "mp-smoke-")), { channel: "chrome", viewport: { width: 1200, height: 900 } })
    : await browser.newContext({ viewport: { width: 1200, height: 900 } });
  // someone who has been named before goes straight to the board (docs/NARRATIVE.md §3)
  if (named) await ctx.addInitScript(() => { try { localStorage.setItem("mp-self", JSON.stringify({ name: "", gender: "f" })); } catch {} });
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
  window.claude = { hot: { data: { setup: { count: 2, rows: [cpu, cpu, cpu, cpu], rules: { six: true } } } } };
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

await check("Phase 2: at the default depth every square shows two schools disagreeing, in both languages", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const lang of ["en", "hi"]) {
    await page.goto(BASE + `?seed=1&debug&lang=${lang}`); // no ?depth: what a new player sees
    const thin = await page.evaluate(async () => {
      const out = [];
      for (let n = 1; n <= 110; n++) {
        mp.open(n);
        const voices = document.querySelectorAll("#leaf .chips li, #leaf .views li");
        if (voices.length < 2 || [...voices].some(v => !v.querySelector(".chip"))) out.push(n);
      }
      await mp.close({ instant: true });
      return out;
    });
    assert(!thin.length, `${lang}: squares without two named voices: ${thin.join(", ")}`);
  }
});

// Emoji code points, so a check can tell a drawn square from an emoji fallback.
const EMOJI = /\p{Extended_Pictographic}/u;
await check("Phase 2: the board draws every square from the sprite sheet, with no emoji", async page => {
  await page.goto(BASE + "?seed=1");
  const bad = await page.evaluate(src => {
    const emoji = new RegExp(src, "u"), out = [];
    for (const el of document.querySelectorAll("#cells .pic, #labels .ic")) if (!el.querySelector("svg.spr use") || emoji.test(el.textContent)) out.push(el.outerHTML.slice(0, 60));
    if (document.querySelectorAll("#cells .pic").length + document.querySelectorAll("#labels .ic").length !== 109) out.push("expected a picture on all 109 squares below Moksha");
    return out;
  }, EMOJI.source);
  assert(!bad.length, bad.slice(0, 3).join(" | "));
  await page.click('#labels .lab[data-n="50"]');
  await page.waitForFunction(() => document.getElementById("folio").open);
  assert(await page.evaluate(() => !!document.querySelector("#leaf .glyph svg.spr")), "the card does not draw its square's sprite");
});

await check("Phase 2: without the sprite sheet every square falls back to its emoji, none blank", async page => {
  // serve the page with the inlined sheet cut out, as if assets/sprites.svg had been deleted before the build
  await page.route(/\/moksha-patam\/(\?.*)?$/, async route => {
    const res = await route.fetch();
    route.fulfill({ response: res, body: (await res.text()).replace(/<svg class="sprites"[\s\S]*?<\/svg>\n/, "") });
  });
  await page.goto(BASE + "?seed=1");
  const bad = await page.evaluate(src => {
    const emoji = new RegExp(src, "u"), out = [];
    if (document.querySelector("svg.sprites")) out.push("the sheet was not removed");
    for (const el of document.querySelectorAll("#cells .pic, #labels .ic")) if (el.querySelector("svg") || !emoji.test(el.textContent)) out.push(el.outerHTML.slice(0, 60));
    return out;
  }, EMOJI.source);
  assert(!bad.length, bad.slice(0, 3).join(" | "));
  await page.click('#labels .lab[data-n="79"]');
  await page.waitForFunction(() => document.getElementById("folio").open);
  assert(await page.evaluate(() => document.querySelector("#leaf .glyph").textContent.trim() === "🙋‍♀️"), "the card did not fall back to its emoji");
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

await check("Phase 4: the squares a move passed are named in the log, and each opens its card", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=5&debug");
  await page.evaluate(async () => { mp.jump(20); mp.roll(4); });   // 21, 22, 23, landing on 24
  // a landing card waits for its reader before the move is logged, so read and close it
  await page.waitForFunction(() => { if (document.getElementById("folio").open) mp.close({ instant: true }); return document.querySelectorAll("#log li.passed .logbtn").length === 3; }, null, { timeout: 15000, polling: 200 });
  const names = await page.evaluate(() => [...document.querySelectorAll("#log li.passed .logbtn")].map(b => +b.dataset.sq));
  assert(names.join() === "21,22,23", `passed ${names}`);
  await page.evaluate(() => document.querySelector('#log li.passed .logbtn[data-sq="22"]').click());
  await page.waitForFunction(() => location.hash === "#sq/22" && document.getElementById("folio").open);
  // 22 is a snake tail one step below Guru-bhakti, and says so
  assert(await page.evaluate(() => /Guru-bhakti/.test(document.querySelector("#leaf .story p.remedy")?.textContent || "")), "square 22 does not name its remedy");
});

await check("Phase 4: a roll past 110 bounces back, and 109 is Shiva's card with the merit snake after it", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=5&debug");
  await page.evaluate(() => { mp.jump(107); mp.roll(5); });       // up to 110, back down to 108
  await page.waitForFunction(() => { if (document.getElementById("folio").open) mp.close({ instant: true }); return mp.state.log.some(e => e.k === "lBounce"); }, null, { timeout: 15000, polling: 200 });
  assert(await page.evaluate(() => mp.state.players[0].pos) === 108, "the bounce did not land on 108");
  await page.evaluate(() => { mp.open(109); });   // the card's promise settles on close, so don't wait on it
  await page.waitForFunction(() => document.getElementById("leafTitle")?.textContent === "Shiva");
  const card = await page.evaluate(() => ({
    title: document.getElementById("leafTitle")?.textContent,
    snake: document.querySelector("#leaf .snake-on .snake-title")?.textContent,
    gita: !!document.querySelector('#leaf .snake-on a.src[data-entry="gita"]'),
    foot: document.querySelector("#leaf .leaf-foot .ft")?.textContent,
  }));
  assert(card.title === "Shiva" && card.snake === "Merit spent" && card.gita && /101/.test(card.foot), JSON.stringify(card));
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
  // the moment and the mirror, each followed by its Hindi
  assert(await page.evaluate(() => document.querySelectorAll("#leaf .story p.moment.second[lang=hi], #leaf .story p.mirror.second[lang=hi]").length === 2), "both-languages mode shows one language");
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

await check("Phase 3: the naming comes first, needs a gender, and the cards agree with it", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug&lang=hi");
  assert(await page.evaluate(() => document.getElementById("naming").open), "the naming is not open on a first visit");
  await page.fill("#namingName", "Meera");
  await page.click("#namingBegin");
  assert(await page.evaluate(() => document.getElementById("naming").open), "the naming closed without a gender");
  await page.click('#namingGenders input[value="f"]');
  await page.click("#namingBegin");
  await page.waitForFunction(() => !document.getElementById("naming").open);
  const p = await page.evaluate(() => mp.state.players[0]);
  assert(p.name === "Meera" && p.gender === "f", `player 0 is ${JSON.stringify(p)}`);
  assert(await page.evaluate(() => mp.state.players[1].alias?.hi?.length > 0), "the computer was not given a name");
  await page.reload();
  assert(!(await page.evaluate(() => document.getElementById("naming").open)), "the naming asked again after a name was given");
}, { named: false });

await check("Phase 3: every moment agrees with a female player in Hindi, and with no moments the cards are Phase 2's", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { try { localStorage.setItem("mp-self", JSON.stringify({ name: "Meera", gender: "f" })); } catch {} });
  await page.goto(BASE + "?seed=1&debug&lang=hi");
  const bad = await page.evaluate(async () => {
    const out = [];
    for (let n = 1; n <= 109; n++) {
      mp.open(n);
      const m = document.querySelector("#leaf .story p.moment")?.textContent || "";
      if (!m.includes("Meera")) out.push(`${n}: no moment naming Meera`);
      // a masculine form straight after her name: "Meera सात बरस का है", "Meera … खड़ा है"
      if (/Meera (?!ने|की|के|को|से)[^।,]*?(?<![\p{L}\p{M}])(का है|खड़ा है|झुका है|देखता|जागता रहा|निकल गया|हो सकता था|फिरता है|सह लेगा)(?![\p{L}\p{M}])/u.test(m)) out.push(`${n}: ${m}`);
      if (n <= 100 && !document.querySelector("#leaf .leaf-margin .age")) out.push(`${n}: no age`);
    }
    // strip every moment: the card is the Phase 2 card, with no moment and no age
    for (const t of ["SQ", "LADDERS", "SNAKES", "HEAVEN"]) for (const q of Object.values(mp.data[t])) delete q.moment;
    for (const n of [3, 59, 102]) {
      mp.open(n);
      if (document.querySelector("#leaf .moment, #leaf .age")) out.push(`${n}: still shows a moment or an age without one`);
    }
    await mp.close({ instant: true });
    return out;
  });
  assert(!bad.length, bad.slice(0, 4).join(" | "));
});

await check("Phase 3: a finished game reads as a life, in both languages, and can be copied", async (page, ctx) => {
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await twoCpus(page);
  await page.addInitScript(() => { const st = window.setTimeout; window.setTimeout = (f, ms, ...r) => st(f, Math.min(ms, 30), ...r); });
  await page.goto(BASE + "?seed=6&debug");
  await page.waitForFunction(() => !document.getElementById("win").hidden, null, { timeout: 120000 });
  await page.click("#readLife");
  await page.waitForFunction(() => document.getElementById("lifeDlg").open);
  for (const lang of ["en", "hi"]) {
    await page.evaluate(l => mp.setLang(l), lang);
    const text = await page.evaluate(() => document.getElementById("lifeLeaf").textContent);
    assert(/\S/.test(text) && !/undefined|null|\{name\}|\[object/.test(text), `the ${lang} life reads: ${text.slice(0, 120)}`);
  }
  await page.click('#lifeLeaf [data-act="copy"]');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert(copied.length > 10, "nothing was copied");
}, { limit: 150 });

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
