// Phase 1 and 2 checks in a real browser, served over HTTP under /moksha-patam/ as on the live site.
//   node tools/smoke.mjs [--only=text]   (--only runs just the checks whose names contain the text)
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
const failed = [];
const ONLY = process.argv.find(a => a.startsWith("--only="))?.slice(7);
async function check(name, fn, { limit = 90, persistent = false, named = true, phone = null } = {}) {
  if (ONLY && !name.includes(ONLY)) return;
  // install checks need a real profile: Chrome will not report installability in incognito
  const ctx = persistent
    ? await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "mp-smoke-")), { channel: "chrome", viewport: { width: 1200, height: 900 } })
    : await browser.newContext(phone ? { viewport: { width: phone[0], height: phone[1] }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1200, height: 900 } });
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
    failed.push(name);
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
// waits for a condition, closing any landing card that would hold the turn up
const until = (page, fn) => page.waitForFunction(fn => {
  if (document.getElementById("folio").open) mp.close({ instant: true });
  return new Function(`return (${fn})()`)();
}, fn.toString(), { timeout: 30000, polling: 100 });

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
  assert(await page.evaluate(() => !!document.querySelector('#leaf .glyph svg.ill use[href="#sq-50"]')), "the card does not draw its square's sprite in its frame");
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
  await page.waitForTimeout(400); // the view transition, which takes no clicks
  await page.click("#leaf .more-btn"); // the voices wait behind one tap (Phase 6)
  await page.click('#leaf .chip[data-entry="samkhya"]');
  assert((await title(page)) === "Samkhya", "chip did not open Samkhya");
  await page.click('#leaf [data-act="back"]:visible'); // drawn in the footer here, in the top strip on a phone
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

await check("Phase 11: a card does not hold the game up: the computers play on under it, and it stays open", async page => {
  await twoCpus(page);
  await page.goto(BASE + "?seed=2&debug");
  await page.evaluate(() => { mp.open(50); });
  await page.waitForFunction(() => document.getElementById("folio").open);
  const before = await page.evaluate(() => mp.state.log.length);
  await page.waitForFunction(n => mp.state.log.length > n + 2, before, { timeout: 20000 });
  assert(await folioOpen(page), "the card closed when a computer moved");
  assert(await page.evaluate(() => location.hash === "#sq/50"), "a computer's move turned the reader's card");
});

// Phase 14 makes the one exception: the door at 105 is public, so a computer refused or examined there writes the line
// (checked below); nowhere else does a computer's landing.
await check("Phase 11: a computer's turn opens no card, and never writes the line under the board", async page => {
  await twoCpus(page);
  await page.goto(BASE + "?seed=2&debug");
  await page.evaluate(() => { window.opened = 0; new MutationObserver(() => { if (document.getElementById("folio").open) opened++; }).observe(document.getElementById("folio"), { attributes: true }); });
  await page.waitForFunction(() => mp.state.log.length >= 8, null, { timeout: 30000 });
  const r = await page.evaluate(() => ({ opened, landed: mp.landed() }));
  assert(r.opened === 0, `${r.opened} cards opened for the computers`);
  assert(!r.landed, `a computer's turn wrote the line under the board: ${r.landed}`);
});

await check("Phase 11: the person's line holds through the computer's turn, until their next roll", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.jump(30); mp.roll(2); });
  await page.waitForFunction(() => !mp.busy && mp.landed(), null, { timeout: 15000 });
  const mine = await page.evaluate(() => mp.landed());
  // the computer walks and lands; the line is still the person's
  await page.waitForFunction(() => mp.state.log.some(e => e.who === 1) && !mp.busy && mp.state.turn === 0, null, { timeout: 20000 });
  const r = await page.evaluate(() => ({ line: mp.landed(), sq: document.getElementById("landed").dataset.sq }));
  assert(r.line === mine && r.sq === "32", `the line changed under the computer's turn: ${JSON.stringify({ mine, ...r })}`);
  // the person's own roll takes it away
  await page.evaluate(() => document.getElementById("roll").click());
  await page.waitForFunction(m => mp.landed() !== m, mine, { timeout: 5000 });
}, { phone: [375, 812] });

await check("Phase 11: a computer's move writes nothing into an open card", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.jump(30); mp.roll(2); });
  await page.waitForFunction(() => !mp.busy && mp.state.turn === 1);
  await page.evaluate(() => mp.open(20));
  await page.waitForFunction(() => document.getElementById("folio").open);
  const before = await page.evaluate(() => document.querySelector("#folio .leaf-top").textContent);
  await page.waitForFunction(() => mp.state.log.some(e => e.who === 1) && !mp.busy && mp.state.turn === 0, null, { timeout: 20000 });
  const r = await page.evaluate(() => ({ top: document.querySelector("#folio .leaf-top").textContent, name: mp.state.players[1].alias?.en || mp.state.players[1].name }));
  assert(r.top === before && !r.top.includes(r.name), `the card's header took the computer's move: ${r.top}`);
}, { phone: [375, 812] });

for (const phone of [[375, 812], null]) {
  await check(`Phase 11: nothing under the board moves as the line comes and goes (${phone ? "phone" : "desktop"})`, async page => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(BASE + "?seed=1&debug");
    const at = () => page.evaluate(() => {
      const y = id => Math.round(document.getElementById(id).getBoundingClientRect().top + scrollY);
      return { roll: y("roll"), tray: Math.round(document.querySelector(".tray").getBoundingClientRect().top + scrollY), line: !!mp.landed() };
    });
    const empty = await at();
    // an ordinary landing: the curse already said (Phase 14), since the landing it is said at tells it too, and grows
    await page.evaluate(() => { mp.state.players[0].curse = { id: "well", i: 0, age: 8 }; mp.jump(30); mp.roll(2); });
    await page.waitForFunction(() => !mp.busy && mp.landed(), null, { timeout: 15000 });
    const full = await at();
    assert(!empty.line && full.line, JSON.stringify({ empty, full }));
    assert(empty.roll === full.roll && empty.tray === full.tray, `the roll moved when the line appeared: ${JSON.stringify({ empty, full })}`);
  }, { phone });
}

await check("each log entry reopens its square", async page => {
  // you against the computer: roll, read, close, and wait for your turn to come back
  await page.goto(BASE + "?seed=5&debug");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => { if (document.getElementById("folio").open) mp.close({ instant: true }); return !document.getElementById("roll").disabled && document.querySelectorAll("#log .logbtn").length >= 2; }, null, { timeout: 30000, polling: 200 });
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

await check("Phase 7: Moksha is 105, Brahma at 108 is only his realm, and 110 is Shiva, past the exit, with the fall on his card", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=5&debug");
  const card = n => page.evaluate(n => {
    mp.open(n);   // the card's promise settles on close, so don't wait on it
    const r = {
      title: document.getElementById("leafTitle")?.textContent,
      views: document.querySelectorAll("#leaf .views.side li").length,
      snake: document.querySelector("#leaf .snake-on .snake-title")?.textContent,
      gita: !!document.querySelector('#leaf .snake-on a.src[data-entry="gita"]'),
      foot: document.querySelector("#leaf .leaf-foot .ft")?.textContent,
      above: document.querySelector("#leaf .story p.remedy.above")?.textContent || "",
      art: !!document.querySelector("#leaf .glyph svg.ill"),
    };
    mp.close({ instant: true });
    return r;
  }, n);
  const goal = await card(105), brahma = await card(108), shiva = await card(110), ganesha = await card(104);
  assert(goal.title === "Moksha" && goal.views === 6, `105: ${JSON.stringify(goal)}`);
  assert(brahma.title === "Brahma" && !brahma.snake && !brahma.foot && /nothing up here turns back/i.test(brahma.above), `108: ${JSON.stringify(brahma)}`);
  assert(shiva.title === "Shiva" && shiva.art && /105/.test(shiva.above) && shiva.snake === "Merit spent" && shiva.gita && /the fall$/.test(shiva.foot), `110: ${JSON.stringify(shiva)}`);
  assert(!ganesha.above, "104 is below the exit and should not say Moksha is behind");
  // the board: 105 is the goal cell and keeps ॐ (its vignette is the card's alone), and Shiva's picture sits on 110, in his
  // label's roundel or, since Phase 13, as his vignette in the cell
  assert(await page.evaluate(() => document.querySelector('#labels .lab.goal')?.dataset.n === "105" && !!document.querySelector('#labels .lab.goal .om') && !document.querySelector('#cells use[href="#sq-105"]') &&
    !!document.querySelector('#labels .lab[data-n="110"] svg.spr use[href="#sq-110"], #cells .pic.vg use[href="#sq-110"]')), "the board does not show the exit at 105");
  // #sq/110 is a square like any other
  await page.evaluate(() => { location.hash = "#sq/110"; });
  await page.waitForFunction(() => document.getElementById("folio").open && document.getElementById("leafTitle")?.textContent === "Shiva");
  await page.evaluate(() => mp.close({ instant: true }));
});

await check("Phase 12: past 105 the heavens are walked, and the throw past 110 ends the life on its own line, counted as a life", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=5&debug");
  const settle = k => page.waitForFunction(k => { if (document.getElementById("folio").open) mp.close({ instant: true }); return mp.state.log.some(e => e.k === k) && !mp.busy; }, k, { timeout: 15000, polling: 200 });
  await page.evaluate(() => { mp.jump(106); mp.roll(2); });     // 107, 108: Brahma's realm, and nothing falls
  await settle("lHeaven");
  assert(await page.evaluate(() => mp.state.players[0].pos === 108 && !mp.state.players[0].fell), "108 is not just a realm");
  await page.goto(BASE + "?seed=5&debug");
  // as a new viewer: the fall is their first life ended, counted in mp-lives as a death is
  const before = 0;
  await page.evaluate(() => { mp.first(); mp.jump(107); mp.roll(6); });     // 108, 109, 110, and past it: the fall
  await settle("lFell");
  const r = await page.evaluate(() => ({ fell: mp.state.players[0].fell, pos: mp.state.players[0].pos, over: mp.state.over, winner: mp.state.winner,
    win: !document.getElementById("win").hidden, text: document.getElementById("winText").textContent, end: mp.lifeText(0, "en"), lives: +(localStorage.getItem("mp-lives") || 0) }));
  assert(r.fell && r.pos === 0 && r.over && r.winner === null && r.win, `the fall did not end the life: ${JSON.stringify(r)}`);
  assert(/merit ran out in the heavens/i.test(r.text), `end screen: ${r.text}`);
  assert(/rose as far as the realm of/.test(r.end), `the account does not close on the fall: ${r.end}`);
  assert(r.lives === before + 1, `mp-lives ${before} → ${r.lives}`);
});

await check("Phase 12: a debt comes due on its own card, which holds the game until it is read, and the ledger keeps it", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { Object.assign(mp.state.players[0], { pos: 30, years: 40, life: [30], told: [null] }); mp.plant(12, "lie"); mp.fire(); mp.roll(2); });
  await page.waitForFunction(() => document.getElementById("folio").open && /floor is not there/.test(document.getElementById("leaf").textContent), null, { timeout: 15000 });
  const card = await page.evaluate(() => ({ text: document.getElementById("leaf").textContent, busy: mp.busy, hash: location.hash }));
  assert(/square 12/.test(card.text) && /the teacher who was coming, at forty/.test(card.text), `the card does not name the debt: ${card.text.slice(0, 300)}`);
  assert(card.busy && card.hash === "#sq/12", `the reckoning does not hold the game: ${JSON.stringify({ busy: card.busy, hash: card.hash })}`);
  assert(!/\b(weight|fuse|prārabdha|āgāmi)\b/i.test(card.text), "the card shows the ledger's workings");
  await page.evaluate(() => mp.close());
  await until(page, () => !mp.busy && mp.state.players[0].reckonings?.length === 1);
  const k = await page.evaluate(() => mp.dumpKarma(0));
  assert(!k.karma.agami.length && !k.karma.prarabdha.length && k.reckonings[0].src === 12, JSON.stringify(k));
  assert(await page.evaluate(() => mp.state.log.some(e => e.k === "lReckon" && e.v.src === 12)), "no lReckon in the log");
});

await check("Phase 12: the door refuses a life still carrying a debt, says which in words, and the scholar's ledger lists it", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { Object.assign(mp.state.players[0], { pos: 103, years: 80, life: [103], told: [null] }); mp.plant(55, "keep"); mp.roll(2, 1); });
  await page.waitForFunction(() => mp.choosing, null, { timeout: 15000 });
  await page.evaluate(() => mp.pick(2));
  await until(page, () => !mp.busy && mp.state.log.some(e => e.k === "lRefused"));
  const r = await page.evaluate(() => ({ pos: mp.state.players[0].pos, winner: mp.state.winner, over: mp.state.over, win: !document.getElementById("win").hidden }));
  assert(r.pos === 105 && r.winner === null && !r.over && !r.win, `the door opened: ${JSON.stringify(r)}`);
  await page.evaluate(() => mp.open(105));
  await page.waitForFunction(() => document.getElementById("folio").open && document.getElementById("leafTitle"), null, { timeout: 15000 });
  const door = await page.evaluate(() => document.getElementById("leaf").textContent);
  // a sannyāsin may sit there and be asked (Phase 14), and is told so
  assert(/The door does not open\. .* is still carrying the extra change pocketed at eighty/.test(door) && /may sit here, a year at a time, and be asked/.test(door), `door: ${door.slice(0, 400)}`);
  // and the card is headed as the door that did not open, not the end of the journey
  assert(/The door that did not open/.test(door) && !/The end of the journey/.test(door), `the refused card's header: ${door.slice(0, 200)}`);
  await page.evaluate(() => mp.close({ instant: true }));
  // the ledger is the scholar's alone
  const shown = () => page.evaluate(() => { const c = document.getElementById("ledgerCard"); return { hidden: c.hidden, text: c.textContent }; });
  assert((await shown()).hidden, "the ledger shows below scholar depth");
  await page.evaluate(() => { const s = document.getElementById("prefDepth"); s.value = "scholar"; s.dispatchEvent(new Event("change")); });
  const sch = await shown();
  assert(!sch.hidden && /the extra change pocketed at eighty/.test(sch.text) && /āgāmi/.test(sch.text) && /deterministic dynamical system/.test(sch.text), `ledger: ${sch.text.slice(0, 300)}`);
  assert(!/\d/.test(sch.text.replace(/eighty|forty/g, "")), `the ledger shows a number: ${sch.text}`);
  await page.evaluate(() => { const s = document.getElementById("prefDepth"); s.value = "story"; s.dispatchEvent(new Event("change")); });
  assert((await shown()).hidden, "the ledger stays at story depth");
});

await check("Phase 12: a forced roll is for one throw: mp.roll while a throw is under way leaves nothing behind", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.jump(40); mp.roll(3); });
  // a second forced roll while the first throw is still being played is refused, and is not kept for the next throw
  const refused = await page.evaluate(() => mp.busy && mp.roll(2, 4) === false);
  assert(refused, "mp.roll was accepted while a throw was under way");
  await until(page, () => !mp.busy);
  assert((await page.evaluate(() => mp.state.dice)).join() === "3", "the first throw was not the forced 3");
  // from 94 two dice: the throw after a refused mp.roll(2, 4) is the dice's own, and a forced one is used once
  await page.goto(BASE + "?seed=1&debug");
  const twice = await page.evaluate(() => { mp.jump(94); mp.roll(2, 4); return mp.roll(2, 4); });
  assert(twice === false, "a second mp.roll during the first was accepted");
  await page.waitForFunction(() => mp.choosing || !mp.busy, null, { timeout: 15000 });
  if (await page.evaluate(() => !!mp.choosing)) await page.evaluate(() => mp.pick(mp.choosing[0].v ?? mp.choosing[0]));
  await until(page, () => !mp.busy);
  assert(await page.evaluate(() => mp.state.dice.join() === "2,4"), "the forced 2,4 was not thrown");
});

await check("Phase 7: muted, nothing in the divine row starts audio; unmuted, the Shepard tone follows the walk", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { try { localStorage.setItem("mp-prefs", JSON.stringify({ mute: true })); } catch {} });
  await page.goto(BASE + "?seed=5&debug");
  if (!(await page.evaluate(() => mp.audio().muted))) await page.click("#mute");
  await page.evaluate(() => { mp.jump(102); mp.roll(5); });
  await page.waitForFunction(() => { if (document.getElementById("folio").open) mp.close({ instant: true }); return mp.state.players[0].pos !== 102 && !mp.busy; }, null, { timeout: 15000, polling: 200 });
  assert(await page.evaluate(() => mp.audio().ctx === null), `muted, yet audio started: ${JSON.stringify(await page.evaluate(() => mp.audio()))}`);
  await page.click("#mute");   // unmuting is the gesture that makes the context
  await page.evaluate(() => { mp.jump(103); });
  await page.evaluate(() => { mp.roll(1); });
  await page.waitForFunction(() => { if (document.getElementById("folio").open) mp.close({ instant: true }); return (mp.audio().shepard?.voices || 0) > 0; }, null, { timeout: 15000, polling: 200 });
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

await check("Phase 11: the naming asks who is playing, a computer by default, and names each person in turn", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.waitForFunction(() => document.getElementById("naming").open);
  assert(await page.evaluate(() => document.querySelector('#namingWhoOpts input[value="cpu"]').checked), "me and a computer is not the default");
  await page.check('#namingWhoOpts input[value="3"]');
  assert(/Next/.test(await page.textContent("#namingBegin")), "the first of three is not asked for the next");
  const name = async (who, g) => { await page.fill("#namingName", who); await page.check(`#namingGenders input[value="${g}"]`); await page.click("#namingBegin"); };
  await name("Asha", "f");
  const step = await page.evaluate(() => ({ step: document.getElementById("namingStep").textContent, who: document.getElementById("namingWho").hidden, name: document.getElementById("namingName").value, open: document.getElementById("naming").open }));
  assert(step.open && /Player 2 of 3/.test(step.step) && step.who && step.name === "", JSON.stringify(step));
  // back to the first, kept as given, and on again
  await page.click("#namingBack");
  assert(await page.inputValue("#namingName") === "Asha", "Back lost the first person's name");
  await page.click("#namingBegin");
  await name("Ravi", "m");
  // the third is a person too: no gender, no game
  await page.fill("#namingName", "Kiran");
  await page.click("#namingBegin");
  assert(await page.evaluate(() => document.getElementById("naming").open), "the naming closed without the third person's gender");
  await page.check('#namingGenders input[value="n"]');
  await page.click("#namingBegin");
  await page.waitForFunction(() => !document.getElementById("naming").open);
  const r = await page.evaluate(() => ({ players: mp.state.players.map(p => [p.name, p.type, p.gender]), panel: document.querySelector('#count [aria-pressed="true"]')?.dataset.n }));
  assert(JSON.stringify(r.players) === JSON.stringify([["Asha", "human", "f"], ["Ravi", "human", "m"], ["Kiran", "human", "n"]]) && r.panel === "3", JSON.stringify(r));
}, { named: false });

await check("Phase 11: just me is a table of one, and plays", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.waitForFunction(() => document.getElementById("naming").open);
  await page.check('#namingWhoOpts input[value="1"]');
  await page.fill("#namingName", "Meera");
  await page.check('#namingGenders input[value="f"]');
  await page.click("#namingBegin");
  await page.waitForFunction(() => !document.getElementById("naming").open);
  assert(await page.evaluate(() => mp.state.players.length === 1 && mp.state.players[0].name === "Meera"), "not a table of one");
  for (let i = 0; i < 3; i++) {
    const n = await page.evaluate(() => mp.state.players[0].life.length);
    await page.waitForFunction(() => !mp.busy && !document.getElementById("roll").disabled && !mp.deciding);
    await page.evaluate(() => { if (document.getElementById("folio").open) mp.close({ instant: true }); document.getElementById("roll").click(); });
    await page.waitForFunction(k => mp.state.players[0].life.length > k || mp.deciding, n, { timeout: 15000 });
    if (await page.evaluate(() => mp.deciding)) await page.evaluate(() => mp.choose(mp.deciding.find(o => o.open).id));
  }
  assert(await page.evaluate(() => mp.state.turn === 0 && mp.state.log.every(e => e.who == null || e.who === 0)), "someone else played");
}, { named: false });

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
    for (let n = 1; n <= mp.data.TOP; n++) {
      if (n === mp.data.GOAL) continue;
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

await check("the life account's text fills the dialog, at 1440, 1024 and 375 wide", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=6&debug");
  const bad = [];
  for (const [w, h] of [[1440, 900], [1024, 768], [375, 812]]) {
    await page.setViewportSize({ width: w, height: h });
    const r = await page.evaluate(() => {
      mp.state.players[0].life = [1, 2, 4, 10, 15, 21, 25, 41, 45, 61, 72, 89, 100];
      mp.life(0);
      const leaf = document.getElementById("lifeLeaf"), text = leaf.querySelector(".leaf-text"), cs = getComputedStyle(leaf.querySelector(".leaf-main"));
      const inner = leaf.querySelector(".leaf-main").clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const out = { text: Math.round(text.getBoundingClientRect().width), inner: Math.round(inner) };
      document.getElementById("lifeDlg").close();
      return out;
    });
    if (r.text < 0.85 * r.inner) bad.push(`${w}px: the text is ${r.text}px of ${r.inner}px`);
  }
  assert(!bad.length, bad.join(" | "));
});

// ---- Phase 8: life state ----
// Two people and a computer, so one of them can run out of years while the game goes on.
const twoPeople = page => page.addInitScript(() => {
  const rows = [{ name: "Asha", type: "human", gender: "f" }, { name: "Ravi", type: "human", gender: "m" }, { name: "", type: "cpu" }, { name: "", type: "cpu" }];
  window.claude = { hot: { data: { setup: { count: 3, rows, rules: { six: true } } } } };
});

await check("Phase 8: a sannyasin's card names the bhumika they are in, at the years they have lived", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  const read = (gunas, years) => page.evaluate(([gunas, years]) => {
    const p = mp.state.players[0];
    Object.assign(p, { pos: 90, years, life: [90], gunas });
    mp.open(90, { who: 0 });
    const leaf = document.getElementById("leaf"), out = { eb: leaf.querySelector(".eb").textContent, moment: leaf.querySelector(".moment")?.textContent };
    mp.close({ instant: true });
    return out;
  }, [gunas, years]);
  const deep = await read({ s: 0.8, r: 0.1, t: 0.1 }, 95), plain = await read({ s: 0.2, r: 0.5, t: 0.3 }, 78);
  assert(deep.eb.includes("Padārthābhāvanā") && deep.eb.includes("95"), `eyebrow: ${deep.eb}`);
  assert(/is ninety-five and wakes in the dark/.test(deep.moment), `moment: ${deep.moment}`);
  assert(plain.eb.includes("Śubhecchā") && plain.eb.includes("78"), `eyebrow: ${plain.eb}`);
  // a square the player is not on keeps its own stage and age
  const other = await page.evaluate(() => { mp.open(85, { who: 0 }); const eb = document.querySelector("#leaf .eb").textContent; mp.close({ instant: true }); return eb; });
  assert(other.includes("Sannyasa") && other.includes("73"), `square 85: ${other}`);
});

await check("Phase 8: after the 99 → 61 snake the account says the years undone, and that the player is still the same age", async page => {
  await page.goto(BASE + "?seed=1&debug");
  const text = await page.evaluate(() => {
    Object.assign(mp.state.players[0], { name: "Asha", gender: "f", life: [95, 99, 61], pos: 61, years: 89 });
    mp.life(0);
    const t = document.getElementById("lifeLeaf").textContent;
    document.getElementById("lifeDlg").close();
    return t;
  });
  assert(/thirty-eight years came undone, and Asha is still eighty-nine and starts again/.test(text), text.slice(0, 300));
  assert(!/Afterwards|fifty-one/.test(text), "the account still runs the years backwards");
});

await check("Phase 10: a square that tells two moments shows on the card the one its landing told, by the face", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  // 43: a slow arrival (a 3, from 40) eats the mango in time; a fast one (a 5, from 38) finds it gone soft
  const land = (from, v) => page.evaluate(([from, v]) => { Object.assign(mp.state.players[0], { pos: from, life: [from], told: [null] }); mp.roll(v); }, [from, v]);
  const read = () => page.evaluate(() => { mp.open(43, { who: 0 }); const t = document.querySelector("#leaf .moment").textContent; mp.close({ instant: true }); return t; });
  await land(40, 3);
  await until(page, () => mp.state.players[0].life.at(-1) === 43 && mp.state.turn === 0);
  const slow = await read();
  assert(/eats it standing at the window/.test(slow), `slow: ${slow}`);
  await land(38, 5);
  await until(page, () => mp.state.players[0].life.at(-1) === 43 && mp.state.players[0].life.length === 2);
  const fast = await read();
  assert(/saves the last mango for tomorrow/.test(fast), `fast: ${fast}`);
  // a square the player is not standing on tells its own moment
  const browsed = await page.evaluate(() => { mp.state.players[0].pos = 44; mp.open(43, { who: 0 }); const t = document.querySelector("#leaf .moment").textContent; mp.close({ instant: true }); return t; });
  assert(/saves the last mango/.test(browsed), `browsed: ${browsed}`);
});

await check("Phase 10C: the card meets the friend by name, calls them by it after, and the life closes on their fate", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  const card = (n, life, years) => page.evaluate(([n, life, years]) => {
    Object.assign(mp.state.players[0], { name: "Asha", gender: "f", pos: life.at(-1), life, told: life.map(() => null), years });
    mp.open(n, { who: 0 });
    const t = document.querySelector("#leaf .moment").textContent;
    mp.close({ instant: true });
    return t;
  }, [n, life, years]);
  const met = await card(6, [6], 3), name = met.match(/(?:His|Her) name is (\S+)\./)?.[1];
  assert(name && /has found a friend/.test(met), `square 6: ${met}`);
  const after = await card(15, [6, 15], 8);
  assert(after.includes(`something ${name} did too. ${name} owns up`) && !/name is/.test(after), `square 15: ${after}`);
  // a square browsed names who the life has met, and meets nobody
  const browsed = await card(48, [6, 15], 8);
  assert(browsed.includes(`borrows from ${name} for food`) && !/name is/.test(browsed), `square 48: ${browsed}`);
  const text = await page.evaluate(() => {
    Object.assign(mp.state.players[0], { life: [6, 15, 20, 48, 100], told: [null, null, null, null, null], pos: 100, years: 92, dead: true });
    mp.life(0);
    const t = document.querySelector("#lifeLeaf .life-fates")?.textContent || "";
    document.getElementById("lifeDlg").close();
    return t;
  });
  assert(text.startsWith(`${name}, whom Asha last saw at thirty-three, died at `), `fates: ${text}`);
});

await check("Phase 10: a situation's card asks, takes the choice on the card, and tells what was chosen", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  // 52 + 3 is Greed: the card opens on the prompt with its options, and nothing moves until one is taken. The ego takes
  // no face, so the choice holds (Phase 15 is its own check)
  await page.evaluate(() => { Object.assign(mp.state.players[0], { pos: 52, life: [52], told: [null], years: 40 }); mp.ego([]); mp.roll(3); });
  await page.waitForFunction(() => mp.deciding && document.querySelector("#leaf .options"), null, { timeout: 30000 });
  const asked = await page.evaluate(() => ({ moment: document.querySelector("#leaf .moment").textContent, opts: [...document.querySelectorAll("#leaf .opt")].map(b => b.textContent), mirror: !!document.querySelector("#leaf .mirror") }));
  assert(/too much change by mistake, and has already turned/.test(asked.moment), `prompt: ${asked.moment}`);
  assert(asked.opts.length === 2 && /Pocket it/.test(asked.opts[0]) && /down to 43/.test(asked.opts[0]) && /stays on 55 · 7 years/.test(asked.opts[1]), `options: ${asked.opts}`);
  assert(!asked.mirror, "the mirror waits until the choice is made");
  await page.click('#leaf .opt[data-id="return"]');
  // the card turns to the outcome, without the options, and the line under the board tells it too (Phase 11)
  await page.waitForFunction(() => !mp.deciding && /goes back to the counter/.test(document.querySelector("#leaf .moment")?.textContent || ""), null, { timeout: 30000 });
  assert(await page.evaluate(() => !document.querySelector("#leaf .options") && /goes back to the counter/.test(mp.landed() || "")), "the outcome is not on the card alone, or not in the line");
  await page.evaluate(() => mp.close());
  await page.waitForFunction(() => mp.state.players[0].life.length > 1 && !mp.busy, null, { timeout: 30000 });
  const p = await page.evaluate(() => ({ pos: mp.state.players[0].pos, years: mp.state.players[0].years }));
  assert(p.pos === 55 && p.years === 49, `kept to 55 at 49: ${JSON.stringify(p)}`);
});

await check("Phase 10: an option a gate withholds is shown, says why, and cannot be taken; keys choose", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  // restless enough that looking first is withheld at Anger
  await page.evaluate(() => { Object.assign(mp.state.players[0], { pos: 56, life: [56], told: [null], years: 43, gunas: { s: 0.2, r: 0.6, t: 0.2 } }); mp.roll(3); });
  await page.waitForFunction(() => mp.deciding && document.querySelector("#leaf .options"), null, { timeout: 30000 });
  const look = await page.evaluate(() => { const b = document.querySelector('#leaf .opt[data-id="look"]'); return { disabled: b.getAttribute("aria-disabled"), why: b.querySelector(".opt-why")?.textContent }; });
  assert(look.disabled === "true" && /Too restless to stop the hand in time/.test(look.why), JSON.stringify(look));
  await page.click('#leaf .opt[data-id="look"]', { force: true });
  assert(await page.evaluate(() => !!mp.deciding), "a withheld option was taken");
  await page.keyboard.press("2");
  assert(await page.evaluate(() => !!mp.deciding), "key 2 took the withheld option");
  await page.keyboard.press("1");
  await page.waitForFunction(() => !mp.deciding, null, { timeout: 30000 });
  await page.evaluate(() => mp.close());
  await page.waitForFunction(() => !mp.busy && mp.state.players[0].pos === 50, null, { timeout: 30000 });
  // a square with no situation is its story card, as before: no options
  const plain = await page.evaluate(() => { mp.open(44, { who: 0 }); const o = !!document.querySelector("#leaf .options"); mp.close({ instant: true }); return o; });
  assert(!plain, "a square without a situation shows options");
});

await check("Phase 8: a person whose years run out reads their life at once, while the race plays on", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await twoPeople(page);
  await page.goto(BASE + "?seed=1&debug");
  // Asha is on 91 having lived the whole span: one more year, to 92, is past it (below the endgame's two dice)
  await page.evaluate(() => { const p = mp.state.players[0]; Object.assign(p, { pos: 91, life: [91] }); mp.years(110); mp.roll(1); });
  await until(page, () => document.getElementById("lifeDlg").open);
  const r = await page.evaluate(() => ({ title: document.getElementById("lifeTitle").textContent, end: document.querySelector("#lifeLeaf .life-end").textContent,
    over: mp.state.over, turn: mp.state.turn, dead: mp.state.players[0].dead, win: document.getElementById("win").hidden }));
  assert(r.dead && r.title.includes("Asha"), JSON.stringify(r));
  assert(/years ran out at a hundred and eleven, on ground already walked once/.test(r.end), r.end);
  assert(!r.over && r.turn === 1 && r.win, `the race should go on with Ravi: ${JSON.stringify(r)}`);
  await page.evaluate(() => document.getElementById("lifeDlg").close());
  // Ravi's years run out too: with nobody left the game ends, and its result is the race's
  await page.evaluate(() => { const p = mp.state.players[1]; Object.assign(p, { pos: 91, life: [91] }); mp.years(110); mp.roll(1); });
  await until(page, () => mp.state.over && !document.getElementById("win").hidden);
  const end = await page.evaluate(() => ({ title: document.getElementById("winTitle").textContent }));
  assert(end.title === "No one reached Moksha.", end.title);
}, { limit: 120 });

await check("Phase 8: a game of one person ends on their own account, not on a race nobody won", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { const p = mp.state.players[0]; Object.assign(p, { name: "Asha", pos: 91, life: [91] }); mp.years(110); mp.roll(1); });
  await until(page, () => document.getElementById("lifeDlg").open && !document.getElementById("win").hidden);
  const r = await page.evaluate(() => ({ title: document.getElementById("winTitle").textContent, text: document.getElementById("winText").textContent, over: mp.state.over }));
  assert(r.over && r.title === "The life of Asha" && !/no one|nobody/i.test(r.title + r.text), JSON.stringify(r));
});

// ---- Phase 9: dice as currency ----
await check("Phase 9: from 94 a person sees two dice and moves by either; 2 picks the second", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { Object.assign(mp.state.players[0], { pos: 96, years: 86, life: [96] }); mp.roll(3, 5); });
  await page.waitForFunction(() => mp.choosing, null, { timeout: 15000 });
  const r = await page.evaluate(() => ({ moves: mp.choosing, buttons: [...document.querySelectorAll("#pick button")].map(b => b.textContent),
    two: !document.getElementById("die2").hidden, hint: document.getElementById("hint").textContent, rollHidden: document.getElementById("roll").hidden }));
  assert(JSON.stringify(r.moves) === "[3,5,0]" && r.buttons.join("|") === "Move 3|Move 5|Sit" && r.two && r.rollHidden, JSON.stringify(r));
  assert(/Rolled 3 and 5\. Move by either, or sit/.test(r.hint), r.hint);
  await page.keyboard.press("2");
  await until(page, () => mp.state.players[0].pos === 101 && !mp.busy);
  const log = await page.evaluate(() => mp.state.log.find(e => e.k === "lDice")?.v);
  assert(log?.v === 5 && log.a === 3 && log.b === 5, JSON.stringify(log));
  assert(await page.evaluate(() => !mp.choosing && document.getElementById("pick").hidden && !document.getElementById("roll").hidden), "the choice did not clear");
});

await check("Phase 9: rolled from the card on a phone, the choice is on the card, and sitting keeps the square and spends a year", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { Object.assign(mp.state.players[0], { pos: 96, years: 86, life: [96] }); mp.open(96); });
  await page.waitForFunction(() => document.getElementById("folio").open);
  assert(await page.evaluate(() => mp.rollFromCard([1, 3])), "the card had no Roll");
  await page.waitForFunction(() => document.querySelectorAll("#leaf .pick-c:not([hidden]) button").length === 3, null, { timeout: 15000 });
  const labels = await page.evaluate(() => [...document.querySelectorAll("#leaf .pick-c button")].map(b => b.textContent));
  assert(labels.join("|") === "Move 1|Move 3|Sit", labels.join("|"));
  await page.click('#leaf .pick-c button[data-v="0"]');
  await page.waitForFunction(() => mp.state.log.some(e => e.k === "lSit") && !mp.busy, null, { timeout: 15000 });
  // the card stayed for the choice, and went once it was made (REDESIGN.md Phase 11)
  const r = await page.evaluate(() => ({ p: mp.state.players[0].pos, y: mp.state.players[0].years, practised: mp.practised(0), open: document.getElementById("folio").open }));
  assert(r.p === 96 && r.y === 87 && r.practised === 2 && !r.open, JSON.stringify(r));
}, { phone: [375, 812] });

await check("Phase 9: the account tells a year sat out, and a life let go names what it put down", async page => {
  await page.goto(BASE + "?seed=1&debug");
  const text = await page.evaluate(() => {
    Object.assign(mp.state.players[0], { name: "Asha", gender: "f", life: [94, 95, 95, 99, 61], pos: 61, years: 84 });
    mp.life(0);
    const t = document.getElementById("lifeLeaf").textContent;
    document.getElementById("lifeDlg").close();
    return t;
  });
  assert(/Asha sat the year out in practice, at eighty-four\./.test(text), text.slice(0, 400));
});

// ---- Phase 5: the painted board ----
const settle = page => page.waitForFunction(() => {
  if (document.getElementById("folio").open) mp.close({ instant: true });
  // from 94 the dice wait for a choice (Phase 9): these checks move by the first
  if (mp.choosing) mp.pick(mp.choosing[0]);
  return !document.getElementById("roll").disabled;
}, null, { timeout: 30000, polling: 100 });

await check("Phase 5: no sound before a gesture or while muted; mute survives a reload, and unmuting starts the drone", async page => {
  const warnings = [];
  page.on("console", m => m.type() === "warning" && /audio/i.test(m.text()) && warnings.push(m.text()));
  await page.goto(BASE + "?seed=1&debug");
  assert((await page.evaluate(() => mp.audio())).ctx === null, "an audio context exists before any gesture");
  await page.click("#roll");
  await settle(page);
  let a = await page.evaluate(() => mp.audio());
  assert(a.ctx === "running" && a.stage === 0, `after the first roll: ${JSON.stringify(a)}`);
  await page.click("#mute");
  await page.waitForTimeout(400);
  a = await page.evaluate(() => mp.audio());
  assert(a.muted && a.stage === null && a.ctx === "suspended", `after muting: ${JSON.stringify(a)}`);
  await page.reload();
  await page.click("#roll");
  await settle(page);
  a = await page.evaluate(() => mp.audio());
  assert(a.muted && a.ctx === null, `muted after a reload, yet: ${JSON.stringify(a)}`);
  await page.click("#mute");
  a = await page.evaluate(() => mp.audio());
  assert(!a.muted && a.ctx === "running" && a.stage === 0, `after unmuting: ${JSON.stringify(a)}`);
  assert(!warnings.length, "audio warnings: " + warnings.join("; "));
});

await check("Phase 5: the drone changes at every ashrama boundary", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.click("#roll");
  await settle(page);
  // stand on each stage's last square, then step over into the next (21, 41, 61, 81 and 101 are plain squares)
  for (const [i, b] of [20, 40, 60, 80, 100].entries()) {
    await page.evaluate(b => mp.jump(b), b);
    assert((await page.evaluate(() => mp.audio().stage)) === i, `at ${b} the drone is not stage ${i}`);
    await page.evaluate(() => { mp.roll(1); });
    await settle(page);
    assert((await page.evaluate(() => mp.audio().stage)) === i + 1, `past ${b} the drone did not move to stage ${i + 1}`);
  }
});

await check("Phase 5: squares ahead are dimmed, yet every one still opens its card", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // a look whose ageing begins at once (Phase 13: the default shows the whole cloth until the first throw)
  await page.goto(BASE + "?seed=1&debug&look=veil");
  await page.evaluate(() => { mp.state.players.forEach(p => (p.pos = 40)); mp.jump(40); });
  const ahead = await page.evaluate(() => [...document.querySelectorAll("#labels .lab.ahead")].map(l => +l.dataset.n));
  assert(ahead.length && Math.min(...ahead) > 40, `ahead: ${ahead.slice(0, 5)}`);
  for (const n of [5, 72, 107]) {
    await page.click(`#labels .lab[data-n="${n}"]`);
    await page.waitForFunction(n => document.getElementById("folio").open && location.hash === `#sq/${n}`, n);
    await page.evaluate(() => mp.close({ instant: true }));
  }
});

await check("Phase 13: the first screen is the cloth under the veil, half the dimness; ?look is read only under ?debug", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?first&seed=1&look=first");
  assert((await page.evaluate(() => typeof mp)) === "undefined", "mp is exposed without ?debug");
  const veil = await page.evaluate(() => document.querySelectorAll("#labels .lab.ahead").length);
  assert(veil > 0, "?look=first was honoured without ?debug");
  await page.goto(BASE + "?first&seed=1&debug&look=first");
  const before = await page.evaluate(() => document.querySelectorAll("#labels .lab.ahead").length);
  assert(before === 0, `${before} squares dimmed before the first throw under ?look=first`);
  await page.goto(BASE + "?first&seed=1&debug");
  assert((await page.evaluate(() => mp.look())) === "veil", "the default look is not the veil");
  for (const look of ["first", "veil", "asrama"]) {
    await page.goto(BASE + `?seed=1&debug&look=${look}`);
    await page.evaluate(() => mp.roll(3));
    await until(page, () => !mp.busy);
    const n = await page.evaluate(() => document.querySelectorAll("#labels .lab.ahead").length);
    assert(n > 0 && (await page.evaluate(() => mp.look())) === look, `${look}: ${n} squares dimmed after a throw`);
  }
  // the 34 priority squares and the nine fables carry vignettes: 42 on the board, and Moksha's on its card alone (the
  // board keeps ॐ)
  const vg = await page.evaluate(() => [...document.querySelectorAll("#cells .pic.vg")].length);
  assert(vg === 42, `${vg} vignettes on the board`);
  assert(await page.evaluate(() => { mp.open(105); return !!document.querySelector('#leaf svg.ill use[href="#sq-105"]'); }), "Moksha's card has no vignette");
});

await check("Phase 5: the camera follows a climb, and shows the whole board before the card opens", async page => {
  await page.goto(BASE + "?seed=1&debug");
  const seen = await page.evaluate(async () => {
    const cam = document.getElementById("cam"), out = { zoomed: false, atOpen: null };
    new MutationObserver(() => { if (document.getElementById("folio").open && out.atOpen == null) out.atOpen = getComputedStyle(cam).transform; })
      .observe(document.getElementById("folio"), { attributes: true });
    const iv = setInterval(() => { if (getComputedStyle(cam).transform !== "none") out.zoomed = true; }, 50);
    mp.jump(5);
    const done = mp.roll(1);   // the ladder at 6; its landing card opens first
    await new Promise(r => setTimeout(r, 1500));
    mp.close({ instant: true });
    await done;
    clearInterval(iv);
    return out;
  });
  assert(seen.zoomed, "the camera never moved");
  assert(seen.atOpen === "none", `the card opened on a zoomed board: ${seen.atOpen}`);
});

await check("Phase 5: under reduced motion the camera never moves", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => {
    window.moved = false;
    setInterval(() => { if (getComputedStyle(document.getElementById("cam")).transform !== "none") window.moved = true; }, 20);
  });
  // a walk, a climb and a swallow, each on the human's own turn
  for (const [from, v] of [[40, 6], [5, 1], [13, 1]]) {
    await settle(page);
    await page.evaluate(([from, v]) => { mp.jump(from); mp.roll(v); }, [from, v]);
    await page.waitForFunction(() => document.getElementById("roll").disabled);
  }
  await settle(page);
  assert(!(await page.evaluate(() => window.moved)), "the camera moved under reduced motion");
});

// ---- Phase 6: the card in hand ----
// Everything a card says can be read: scrolled to its end, the last line clears the footer; while there is more
// below, the text fades at its lower edge; nothing runs off to the side. Run on main, square 34 failed this.
const unclipped = () => {
  const leaf = document.getElementById("leaf"), dlg = document.getElementById("folio"), out = [];
  const m = leaf.querySelector(".leaf-main"), foot = leaf.querySelector(".leaf-foot").getBoundingClientRect();
  const d = dlg.getBoundingClientRect(), L = leaf.getBoundingClientRect();
  if (d.top < -0.5 || d.bottom > innerHeight + 0.5) out.push(`the card runs off the screen (${Math.round(d.top)}..${Math.round(d.bottom)})`);
  m.scrollTop = 0; m.dispatchEvent(new Event("scroll"));
  if (m.classList.contains("more-below") !== m.scrollHeight - m.clientHeight > 2) out.push("the fade does not match whether there is more below");
  m.scrollTop = 1e6; m.dispatchEvent(new Event("scroll"));
  const shown = [...leaf.querySelectorAll(".leaf-text h2, .leaf-text p, .leaf-text li, .leaf-text .more-btn")].filter(e => e.getClientRects().length);
  const last = shown.at(-1)?.getBoundingClientRect(), mb = m.getBoundingClientRect();
  if (last && last.bottom > mb.bottom + 0.5) out.push(`the last line ends at ${Math.round(last.bottom)}, below the text's edge at ${Math.round(mb.bottom)}`);
  if (mb.bottom > foot.top + 0.5) out.push("the text runs under the footer");
  if (m.classList.contains("more-below")) out.push("still fading at the end");
  for (const e of leaf.querySelectorAll(".leaf-top *, .leaf-main *, .leaf-foot *")) {
    const r = e.getBoundingClientRect();
    if (r.width && r.right > L.right + 1 && !e.closest(".nav, .roll-c")) { out.push(`${e.className || e.tagName} runs off the side`); break; }
  }
  m.scrollTop = 0;
  return out;
};
const VIEWS = [[375, 812], [375, 667], [812, 375]];
for (const [w, h] of VIEWS) {
  await check(`Phase 6: no card clips what it says at ${w}x${h}, collapsed or opened, at any depth, in either language`, async page => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const lang of ["en", "hi"]) for (const both of w === 375 && h === 812 ? [false, true] : [false]) for (const depth of ["story", "school", "scholar"]) {
      await page.evaluate(([both, depth]) => localStorage.setItem("mp-prefs", JSON.stringify({ mute: true, both, depth })), [both, depth]).catch(() => {});
      await page.goto(BASE + `?seed=1&debug&lang=${lang}&depth=${depth}&v=${both}`);
      await page.evaluate(([both, depth]) => localStorage.setItem("mp-prefs", JSON.stringify({ mute: true, both, depth })), [both, depth]);
      await page.reload();
      await page.waitForFunction(() => window.mp);
      const bad = await page.evaluate(src => {
        const unclipped = eval(src), out = [];
        for (let n = 1; n <= 110; n++) {
          mp.close({ instant: true });
          mp.open(n);
          out.push(...unclipped().map(x => `${n}: ${x}`));
          const more = document.querySelector("#leaf .more-btn");
          if (more) { more.click(); out.push(...unclipped().map(x => `${n} opened: ${x}`)); }
        }
        mp.close({ instant: true });
        return out;
      }, `(${unclipped})`);
      assert(!bad.length, `${lang}/${depth}${both ? "/both" : ""}: ${bad.slice(0, 3).join(" | ")}`);
    }
  }, { phone: [w, h], limit: 300 });
}

await check("Phase 6: a card opens with its story, and one tap shows the voices; at story depth there is nothing to open", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug&depth=school");
  const r = await page.evaluate(() => {
    const seen = s => [...document.querySelectorAll(s)].filter(e => e.getClientRects().length).length;
    mp.open(34);
    const before = { voices: seen("#leaf .chips li"), story: seen("#leaf .story p"), frame: seen("#leaf .glyph svg.ill") };
    document.querySelector("#leaf .more-btn").click();
    const after = seen("#leaf .chips li"), expanded = mp.sheet().expanded;
    mp.open(35);   // turning the page keeps it opened
    const kept = seen("#leaf .chips li");
    mp.close({ instant: true });
    mp.open(36);   // and closing collapses it again
    const again = seen("#leaf .chips li");
    mp.close({ instant: true });
    mp.open(105);  // the six views are the point of the exit, so they show at once
    const goal = seen("#leaf .views.side li");
    mp.close({ instant: true });
    return { before, after, expanded, kept, again, goal };
  });
  assert(r.before.voices === 0 && r.before.story >= 2 && r.before.frame === 1, `collapsed: ${JSON.stringify(r.before)}`);
  assert(r.after >= 2 && r.expanded && r.kept >= 2 && r.again === 0, JSON.stringify(r));
  assert(r.goal === 6, `105 shows ${r.goal} views`);
  await page.goto(BASE + "?seed=1&debug&depth=story");
  assert(await page.evaluate(() => { mp.open(34); return !document.querySelector("#leaf .more-btn"); }), "story depth has a toggle");
});

// one finger dragged through the page, by CDP touch events
async function drag(page, x, y0, y1, ms = 200) {
  const cdp = await page.context().newCDPSession(page), steps = 10;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / steps }] });
    await page.waitForTimeout(ms / steps);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(300);
}
const rect = (page, s) => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, x: r.left + r.width / 2 }; }, s);
const openOn = async (page, n) => { await page.evaluate(n => { mp.open(n); }, n); await page.waitForFunction(() => document.getElementById("folio").open); await page.waitForTimeout(400); };

await check("Phase 6: on a phone the card is a sheet below the whole board, with a grip, and the × at the bottom", async page => {
  for (const [w, h] of [[375, 812], [375, 667]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(BASE + "?seed=1&debug&depth=scholar");
    await openOn(page, 34);
    const board = await rect(page, ".board-wrap"), sheet = await rect(page, "#folio"), x = await rect(page, "#leaf .x-foot");
    const s = await page.evaluate(() => mp.sheet());
    if (h === 812) assert(board.top >= 0 && board.bottom <= sheet.top + 1, `the board (${board.top}..${board.bottom}) is not above the sheet at ${sheet.top}`);
    assert(s.sheet?.detent === "half" && Math.abs(sheet.bottom - h) < 1, `${w}x${h}: ${JSON.stringify(s)}`);
    assert(x.bottom > h - 70 && x.left < w / 2, `the × is at ${JSON.stringify(x)}`);
    assert(await page.evaluate(() => !document.querySelector("#leaf .x-top").getClientRects().length), "the top × still shows on a phone");
    await page.click("#leaf .grip");
    await page.waitForTimeout(300);
    assert((await page.evaluate(() => mp.sheet().sheet.detent)) === "full", "the grip did not raise the sheet");
    await page.click("#leaf .grip");
    await page.waitForTimeout(300);
    assert((await page.evaluate(() => mp.sheet().sheet.detent)) === "half", "the grip did not lower the sheet");
  }
}, { phone: [375, 812] });

await check("Phase 6: the sheet goes by swipe, backdrop, × and Escape; a scroll never throws it away", async page => {
  await page.goto(BASE + "?seed=1&debug&depth=scholar");
  const top = async () => (await rect(page, "#leaf .leaf-top")).top;
  // a swipe down from the top strip
  await openOn(page, 34);
  await drag(page, 120, (await top()) + 30, 760);
  assert(!(await folioOpen(page)), "a swipe down from the top did not close the card");
  // a short drag snaps back
  await openOn(page, 34);
  await drag(page, 120, (await top()) + 30, (await top()) + 70);
  assert(await folioOpen(page), "a short drag closed the card");
  assert(await page.evaluate(() => !document.getElementById("folio").style.transform), "the sheet did not settle back");
  // scrolled into the voices, a drag down scrolls back up and leaves the card open, even past the top
  await page.click("#leaf .more-btn");
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelector("#leaf .leaf-main").scrollTop = 160; });
  const mid = await rect(page, "#leaf .leaf-main");
  await drag(page, 200, mid.top + 40, mid.top + 500, 150);
  assert(await folioOpen(page), "scrolling back up the text closed the card");
  assert(await page.evaluate(() => document.querySelector("#leaf .leaf-main").scrollTop) < 160, "the text did not scroll");
  // at the top of the text, a drag down is the sheet's
  await page.evaluate(() => { document.querySelector("#leaf .leaf-main").scrollTop = 0; });
  await drag(page, 200, mid.top + 40, 800);
  assert(!(await folioOpen(page)), "a drag down from the top of the text did not close the card");
  // the page around it (Phase 11: there is no backdrop, the board stays live), the × and Escape
  await openOn(page, 34);
  await page.mouse.click(3, 200);
  await page.waitForFunction(() => !document.getElementById("folio").open);
  await openOn(page, 34);
  await page.click("#leaf .x-foot");
  await page.waitForFunction(() => !document.getElementById("folio").open);
  await openOn(page, 34);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.getElementById("folio").open);
}, { phone: [375, 812] });

await check("Phase 6: under reduced motion the sheet comes and goes without moving", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  const moving = await page.evaluate(() => { mp.open(34); const d = document.getElementById("folio"); return d.getAnimations({ subtree: true }).length; });
  assert(moving === 0, `${moving} animations on the sheet`);
}, { phone: [375, 812] });

await check("Phase 11: on a phone, rolling from the card takes it away, and each of your landings tells its own, never the computer's", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { const st = window.setTimeout; window.setTimeout = (f, ms, ...r) => st(f, Math.min(ms, 30), ...r); });
  await page.goto(BASE + "?seed=5&debug");
  await openOn(page, 34);
  // every square a card or the line under the board shows from here on
  await page.evaluate(() => {
    window.shown = []; window.lines = [];
    new MutationObserver(() => document.getElementById("folio").open && shown.push(location.hash)).observe(document.getElementById("leaf"), { childList: true });
    new MutationObserver(() => mp.landed() && lines.push([+document.getElementById("landed").dataset.sq, mp.state.turn])).observe(document.getElementById("landed"), { childList: true, attributes: true });
  });
  assert(await page.evaluate(() => mp.rollFromCard()), "the card had no Roll");
  await page.waitForFunction(() => !document.getElementById("folio").open, null, { timeout: 5000 });
  for (let i = 0; i < 4; i++) {
    const before = await page.evaluate(() => mp.state.players[0].life?.length ?? 0);
    await page.waitForFunction(n => (mp.state.players[0].life?.length ?? 0) > n && !mp.busy && mp.state.turn === 0 && !document.getElementById("roll").disabled, before, { timeout: 20000 });
    const told = await page.evaluate(() => ({ card: document.getElementById("folio").open ? location.hash : null, line: mp.landed(), pos: mp.state.players[0].life.at(-1) }));
    assert(told.card || told.line, `landing ${i + 1} on ${told.pos} told nothing`);
    if (i < 3) { await page.evaluate(() => document.getElementById("roll").click()); }
  }
  const r = await page.evaluate(() => ({ shown: [...new Set(shown)], mine: mp.state.players[0].life, carried: mp.sheet().carried, cpu: mp.state.log.filter(e => e.who === 1).length }));
  assert(r.cpu > 0, JSON.stringify(r));
  const strays = r.shown.filter(h => h !== "#sq/34" && !r.mine.includes(+h.split("/")[1]));
  assert(!strays.length, `a card showed squares that were not yours: ${strays} (yours: ${r.mine})`);
}, { phone: [375, 812] });

await check("Phase 6: rolled from the card onto a snake, the card stays on the snake and the token still falls", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.jump(13); mp.open(13); });
  await page.waitForFunction(() => document.getElementById("folio").open);
  // nothing can be rolled while the token is still on its way down
  await page.evaluate(() => { window.early = false; setInterval(() => { if (mp.state.players[0].pos === 14 && document.querySelector('#leaf .roll-c[aria-disabled="false"]')) early = true; }, 20); });
  assert(await page.evaluate(() => mp.rollFromCard(1)), "the card had no Roll");
  await page.waitForFunction(() => mp.state.players[0].pos === 8 && mp.state.log.some(e => e.k === "lSnake"), null, { timeout: 15000 });
  const r = await page.evaluate(() => ({ open: document.getElementById("folio").open, hash: location.hash, early }));
  assert(r.open && r.hash === "#sq/14" && !r.early, JSON.stringify(r));
}, { phone: [375, 812] });

await check("Phase 6: a six rolled from the card offers to roll again", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.jump(40); mp.open(40); });
  await page.waitForFunction(() => document.getElementById("folio").open);
  await page.evaluate(() => mp.rollFromCard(6));
  await page.waitForFunction(() => mp.state.players[0].pos === 46 && !mp.busy, null, { timeout: 15000 });
  // the roll took the card away (Phase 11); any card opened now offers the roll again
  await page.evaluate(() => mp.open(46));
  await page.waitForFunction(() => document.querySelector('#leaf .roll-c[aria-disabled="false"]'), null, { timeout: 15000 });
  const label = await page.evaluate(() => document.querySelector("#leaf .roll-c").textContent);
  assert(label === "Roll again", `the card's Roll says ${label}`);
}, { phone: [375, 812] });

await check("Phase 13 follow-ups: a reckoning on a 6 takes the extra throw: the card says Roll, never Roll again", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { Object.assign(mp.state.players[0], { pos: 30, years: 40, life: [30], told: [null] }); mp.plant(12, "lie"); mp.fire(); mp.roll(6); });
  await page.waitForFunction(() => document.getElementById("folio").open && /floor is not there/.test(document.getElementById("leaf").textContent), null, { timeout: 15000 });
  const label = await page.evaluate(() => document.querySelector("#leaf .roll-c")?.textContent || "");
  assert(label !== "Roll again", `the reckoning's card says ${label}`);
  assert(await page.evaluate(() => !mp.state.log.some(e => e.k === "lSix")), "the log still gives the six its throw");
});

// ---- Phase 14: the door and the curse ----
await check("Phase 14: a refused sannyāsin sits at the door, is asked on a card that holds the game, and the door opens", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.door(); mp.roll(2, 3); });
  await page.waitForFunction(() => mp.choosing, null, { timeout: 15000 });
  await page.evaluate(() => mp.pick(0));
  await page.waitForFunction(() => document.getElementById("folio").open && /The door asks/.test(document.getElementById("leaf").textContent), null, { timeout: 15000 });
  const card = await page.evaluate(() => ({ text: document.getElementById("leaf").textContent, busy: mp.busy, hash: location.hash, line: mp.landed() }));
  assert(/heaven's highest refuge/.test(card.text) && /The answer is truth/.test(card.text) && /the teacher who was coming, at ten/.test(card.text), `the card: ${card.text.slice(0, 400)}`);
  // since Phase 16 penance is two years a weight: the lie is not yet paid after the first
  assert(/It is not yet paid/.test(card.text) && !/The door opens/.test(card.text), `the first year: ${card.text.slice(0, 400)}`);
  assert(card.busy && card.hash === "#sq/105", `the examination does not hold the game: ${JSON.stringify({ busy: card.busy, hash: card.hash })}`);
  assert(/heaven's highest refuge/.test(card.line || ""), `the line under the board: ${card.line}`);
  assert(!/\b(weight|penance count|prārabdha|āgāmi)\b/i.test(card.text), "the card shows the ledger's workings");
  await page.evaluate(() => mp.close());
  await until(page, () => !mp.busy && mp.state.turn === 0);
  await page.evaluate(() => { mp.roll(2, 3); });
  await page.waitForFunction(() => mp.choosing, null, { timeout: 15000 });
  await page.evaluate(() => mp.pick(0));
  await page.waitForFunction(() => document.getElementById("folio").open && /The door opens/.test(document.getElementById("leaf").textContent), null, { timeout: 15000 });
  await page.evaluate(() => mp.close());
  await page.waitForFunction(() => !mp.busy && mp.state.over, null, { timeout: 15000 });
  const r = await page.evaluate(() => ({ winner: mp.state.winner, open: mp.state.log.some(e => e.k === "lDoorOpen"), gate: document.getElementById("door").className, sittings: mp.examine(0).sittings.length }));
  assert(r.winner === 0 && r.open && /\bopen\b/.test(r.gate) && r.sittings === 2, JSON.stringify(r));
});

// ---- Phase 16: death by ledger ----
await check("Phase 16: mp.die(form) ends the life on the reckoning's card, in that form, and the account ends on what was carried", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.jump(40); mp.years(70); mp.die("illness"); mp.roll(2); });
  await page.waitForFunction(() => document.getElementById("folio").open && /It closes/.test(document.getElementById("leaf").textContent), null, { timeout: 15000 });
  const text = await page.evaluate(() => document.getElementById("leaf").textContent);
  assert(/of the bad chest, after a winter that did not end/.test(text), `the card: ${text.slice(0, 500)}`);
  await page.evaluate(() => mp.close());
  await page.waitForFunction(() => mp.state.over && document.getElementById("lifeDlg").open, null, { timeout: 15000 });
  const r = await page.evaluate(() => ({ death: mp.state.players[0].death, life: document.getElementById("lifeLeaf").textContent, win: document.getElementById("winText").textContent }));
  assert(r.death?.by === "ledger" && r.death.form === "illness", JSON.stringify(r.death));
  assert(/died at seventy-one, of the bad chest, after a winter that did not end, still carrying the hand that fell/.test(r.life), `the account: ${r.life.slice(-400)}`);
  assert(/A debt came due that the life could not pay/.test(r.win), r.win);
});

await check("Phase 16: the end of a life is read three ways, the book, the path and the mirror, as tabs the keys move between", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.jump(40); mp.years(70); mp.die(); mp.roll(2); });
  await page.waitForFunction(() => document.getElementById("folio").open, null, { timeout: 15000 });
  await page.evaluate(() => mp.close());
  await page.waitForFunction(() => document.getElementById("lifeDlg").open, null, { timeout: 15000 });
  const tabs = () => page.evaluate(() => {
    const d = document.getElementById("lifeDlg"), list = d.querySelector('[role="tablist"]'), panel = d.querySelector('[role="tabpanel"]');
    return { modal: d.matches(":modal"), tabs: [...list.querySelectorAll('[role="tab"]')].map(b => [b.textContent, b.getAttribute("aria-selected"), b.tabIndex]),
      labelled: panel.getAttribute("aria-labelledby"), focus: document.activeElement?.id, text: panel.textContent.replace(/\s+/g, " "), items: panel.querySelectorAll("li").length };
  });
  const book = await tabs();
  assert(book.modal && book.tabs.map(t => t[0]).join() === "The book,The path,The mirror" && book.tabs[0][1] === "true" && book.labelled === "lifeTab-book", JSON.stringify(book));
  assert(/Citragupta reads from the book\./.test(book.text) && /died at seventy-one/.test(book.text), book.text.slice(0, 300));
  // the arrow key moves to the path, and focus goes with it
  await page.focus("#lifeTab-book");
  await page.keyboard.press("ArrowRight");
  const path = await tabs();
  assert(path.tabs[1][1] === "true" && path.focus === "lifeTab-path" && path.labelled === "lifeTab-path" && path.items >= 1 && /Death/.test(path.text), JSON.stringify({ ...path, text: path.text.slice(0, 300) }));
  assert(!/\d/.test(path.text.replace(/Read the lives|×/g, "")), `a number on the path: ${path.text.slice(0, 300)}`);
  // End goes to the mirror: three questions, put to the player
  await page.keyboard.press("End");
  const mirror = await tabs();
  assert(mirror.tabs[2][1] === "true" && mirror.items === 3 && /These are for you, not for the book/.test(mirror.text), JSON.stringify({ ...mirror, text: mirror.text.slice(0, 400) }));
  // skippable: back to the book, and nothing kept
  const before = await page.evaluate(() => JSON.stringify(localStorage));
  await page.click('#lifeDlg [data-act="skip"]');
  const back = await tabs();
  assert(back.tabs[0][1] === "true" && /Citragupta/.test(back.text), JSON.stringify(back.tabs));
  assert((await page.evaluate(() => JSON.stringify(localStorage))) === before, "the mirror wrote something down");
});

// ---- Phase 16: a door that can never open ----
await check("Phase 16: at a door no penance opens, a person is told plainly they may sit on or throw on, and can do either", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  // the anger struck at forty-eight, weight three, never climbed out of: only the book could answer it
  await page.evaluate(() => { mp.plant(59, "strike"); mp.door(); mp.roll(2, 3); });
  await page.waitForFunction(() => mp.choosing, null, { timeout: 15000 });
  await page.evaluate(() => mp.pick(0));
  await page.waitForFunction(() => document.getElementById("folio").open && /The door asks/.test(document.getElementById("leaf").textContent), null, { timeout: 15000 });
  const text = await page.evaluate(() => document.getElementById("leaf").textContent);
  assert(/No penance pays this one/.test(text) && /may sit on here all the same, a year at a time, or throw on into the heavens/.test(text), `the card: ${text.slice(0, 500)}`);
  assert(!/The door opens/.test(text), "a door no penance opens opened");
  await page.evaluate(() => mp.close());
  // the computer at the table takes its turn; then the person's next year offers both, sitting and the dice
  await until(page, () => !mp.busy && mp.state.turn === 0);
  await page.evaluate(() => { mp.roll(2, 3); });
  await page.waitForFunction(() => mp.choosing, null, { timeout: 15000 });
  const offered = await page.evaluate(() => JSON.stringify(mp.choosing));
  assert(/0/.test(offered) && /2/.test(offered), `both are offered: ${offered}`);
  // and a die goes on into the heavens
  await page.evaluate(() => mp.pick(2));
  await until(page, () => !mp.busy && mp.state.players[0].pos !== 105);
  const r = await page.evaluate(() => ({ pos: mp.state.players[0].pos, over: mp.state.over }));
  assert(r.pos === 107 && !r.over, `going on: ${JSON.stringify(r)}`);
});

await check("Phase 14: a computer refused at the door is told on the line under the board, and the door is drawn", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  const who = await page.evaluate(() => mp.state.players.findIndex(p => p.type === "cpu"));
  assert(who > 0, "seed 1 has no computer");
  await page.evaluate(i => {
    Object.assign(mp.state.players[i], { pos: 103, years: 80, life: [103], told: [null], karma: { sancita: [], agami: [{ src: 55, opt: "keep", at: 80, fuse: 15, weight: 2, i: 0 }], prarabdha: [] } });
    // a double: the door is its one move (it would rather not arrive refused)
    mp.state.turn = i; mp.roll(2, 2);
  }, who);
  await page.waitForFunction(i => mp.state.log.some(e => e.k === "lRefused" && e.who === i) && !mp.busy, who, { timeout: 15000 });
  const r = await page.evaluate(() => ({ line: mp.landed(), opened: document.getElementById("folio").open, gate: !document.getElementById("door").hidden, spokes: document.querySelectorAll("#door .spoke").length }));
  assert(/The door does not open\. .* is still carrying the extra change pocketed at eighty/.test(r.line || ""), `the line: ${r.line}`);
  assert(!r.opened, "a computer's refusal opened the card");
  assert(r.gate && r.spokes === 1, `the door: ${JSON.stringify(r)}`);
});

await check("Phase 14: the wheel of time turns a step a year at the door, and under reduced motion it does not move", async page => {
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.plant(12, "lie"); mp.plant(59, "strike"); mp.door(); });
  const turning = () => page.evaluate(() => [...document.querySelectorAll("#door .spoke")].map(g => ({ t: g.style.transform, gold: g.classList.contains("gold"), dur: getComputedStyle(g).transitionDuration })));
  const before = await turning();
  assert(before.length === 2 && before.every(s => !s.gold && s.dur !== "0s"), JSON.stringify(before));
  // the wheel rises above the board into the vimāna's arches, outside the stage that clips the camera
  const rise = await page.evaluate(() => {
    const rim = document.querySelector("#door .rim").getBoundingClientRect(), board = document.getElementById("board").getBoundingClientRect();
    return { above: Math.round(board.top - rim.top), clipped: !!document.getElementById("door").closest("#stage") };
  });
  assert(rise.above > 0 && !rise.clipped, `the wheel is clipped at the board's top: ${JSON.stringify(rise)}`);
  await page.evaluate(() => { mp.roll(2, 3); });
  await page.waitForFunction(() => mp.choosing, null, { timeout: 15000 });
  await page.evaluate(() => mp.pick(0));
  await until(page, () => !mp.busy && mp.examine(0).sittings.length === 1);
  const after = await turning();
  // a year turns every spoke still owed: since Phase 16 the lie (weight one) takes two years, the anger no penance pays
  assert(after.every((s, k) => !s.gold && s.t !== before[k].t), JSON.stringify({ before, after }));
  // the second year pays the lie, which stops, gold; the anger turns on
  await until(page, () => !mp.busy && mp.state.turn === 0);
  await page.evaluate(() => { mp.roll(2, 3); });
  await page.waitForFunction(() => mp.choosing, null, { timeout: 15000 });
  await page.evaluate(() => mp.pick(0));
  await until(page, () => !mp.busy && mp.examine(0).sittings.length === 2);
  const paid = await turning();
  assert(paid[0].gold && paid[0].t === after[0].t && !paid[1].gold && paid[1].t !== after[1].t, JSON.stringify({ after, paid }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert((await turning()).every(s => s.dur === "0s"), "the wheel turns under reduced motion");
});

await check("Phase 14: the years running out at the door close it over the token, and the line says what was owed", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.plant(59, "strike"); mp.door(); mp.years(109.5); mp.roll(2, 3); });
  await page.waitForFunction(() => mp.choosing, null, { timeout: 15000 });
  await page.evaluate(() => mp.pick(0));
  await until(page, () => !mp.busy && mp.state.players[0].dead);
  const r = await page.evaluate(() => ({ line: mp.landed(), gate: document.getElementById("door").className, died: mp.state.log.some(e => e.k === "lDiedDoor"), end: mp.lifeText(0, "en") }));
  assert(r.died && /\bshut\b/.test(r.gate), JSON.stringify(r));
  assert(/years ran out at the door, still owing the hand that fell/.test(r.line || ""), `the line: ${r.line}`);
});

await check("Phase 14: a throw that lands on 110 is Śiva's snake, and ends the life", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=5&debug");
  await page.evaluate(() => mp.jump(107));
  assert(await page.evaluate(() => mp.siva()) === 3, "mp.siva did not set the throw to 110");
  await page.evaluate(() => document.getElementById("roll").click());
  await until(page, () => !mp.busy && mp.state.log.some(e => e.k === "lSiva"));
  const r = await page.evaluate(() => ({ p: mp.state.players[0], over: mp.state.over, text: mp.state.log.find(e => e.k === "lSiva") }));
  assert(r.p.fell && r.p.fellBy === "snake" && r.p.pos === 0 && r.over, JSON.stringify({ fell: r.p.fell, by: r.p.fellBy, pos: r.p.pos, over: r.over }));
});

await check("Phase 14: the curse is said on the person's line, on the landing it is spoken at", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.curse("barber"); Object.assign(mp.state.players[0], { pos: 30, years: 12, life: [30], told: [null] }); mp.roll(2); });
  await until(page, () => !mp.busy && mp.state.players[0].curse);
  const line = await page.evaluate(() => mp.landed());
  assert(/The barber, cutting .*'s hair/.test(line || ""), `the line: ${line}`);
});

await check("Phase 6: on a wide screen the card is the folio it was, over the board and clear of the dice, × top right, no grip, with the morph", async page => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { const vt = document.startViewTransition.bind(document); window.morphs = 0; document.startViewTransition = f => { morphs++; return vt(f); }; });
  await page.click('#labels .lab[data-n="14"]');
  await page.waitForFunction(() => document.getElementById("folio").open);
  await page.waitForTimeout(500);
  const leaf = await rect(page, "#leaf"), x = await rect(page, "#leaf .x-top"), col = await rect(page, ".board-col"), roll = await rect(page, "#roll");
  const r = await page.evaluate(() => ({ morphs, grip: document.querySelector("#leaf .grip").getClientRects().length, sheet: mp.sheet().sheet }));
  // Phase 11: not modal, so it sits over the board, centred on it, and the panel with the dice stays in reach
  assert(Math.round(leaf.right - leaf.left) <= 780 && Math.abs(leaf.x - col.x) < 2 && leaf.right <= roll.left, `the card is at ${JSON.stringify(leaf)}, the board at ${JSON.stringify(col)}, the Roll at ${JSON.stringify(roll)}`);
  assert(x.right > leaf.right - 60 && x.top < leaf.top + 40, `the × is at ${JSON.stringify(x)}`);
  assert(r.morphs === 1 && r.grip === 0 && r.sheet === null, JSON.stringify(r));
});

// ---- Phase 11: the first five minutes ----
// a first-time player, as ?first makes one: named in the naming, as anyone new is
const firstTime = async (page, q = "") => {
  await page.goto(BASE + "?first&debug&seed=1" + q);
  await page.waitForFunction(() => document.getElementById("naming").open);
  await page.fill("#namingName", "Asha");
  await page.check('#namingGenders input[value="f"]');
  await page.click('#namingForm button[type="submit"], #namingForm [type="submit"]');
  await page.waitForFunction(() => !document.getElementById("naming").open);
};

await check("Phase 11: the die is live under a card: a landing's card keeps the focus off it, and Space rolls it away", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  // the ladder at 6 opens the full card
  await page.evaluate(() => { mp.jump(5); mp.roll(1); });
  await page.waitForFunction(() => document.getElementById("folio").open && location.hash === "#sq/6", null, { timeout: 15000 });
  await page.waitForFunction(() => !mp.busy && mp.state.turn === 0 && !document.getElementById("roll").disabled, null, { timeout: 20000 });
  const r = await page.evaluate(() => ({ modal: document.getElementById("folio").matches(":modal"), focus: !!document.activeElement?.closest("#leaf"), life: mp.state.players[0].life.length }));
  assert(!r.modal && !r.focus, JSON.stringify(r));
  await page.keyboard.press("Space");
  await page.waitForFunction(n => mp.state.players[0].life.length > n, r.life, { timeout: 15000 });
  // and the panel's Roll is in reach under a card opened from the board
  await page.waitForFunction(() => !mp.busy && mp.state.turn === 0 && !document.getElementById("roll").disabled, null, { timeout: 20000 });
  await page.click('#labels .lab[data-n="50"]');
  await page.waitForFunction(() => document.getElementById("folio").open);
  const life = await page.evaluate(() => mp.state.players[0].life.length);
  await page.click("#roll");
  await page.waitForFunction(n => mp.state.players[0].life.length > n, life, { timeout: 15000 });
});

await check("Phase 11: a situation waits for its choice, modal, and Space does not roll past it; then the card tells the outcome, the die live on it", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { Object.assign(mp.state.players[0], { pos: 52, life: [52], told: [null], years: 40 }); mp.ego([]); mp.roll(3); });
  await page.waitForFunction(() => mp.deciding && document.querySelector("#leaf .options"), null, { timeout: 30000 });
  assert(await page.evaluate(() => document.getElementById("folio").matches(":modal")), "the situation's card is not modal");
  const before = await page.evaluate(() => mp.state.log.length);
  await page.keyboard.press("Space");
  await page.waitForTimeout(800);
  assert(await page.evaluate(n => mp.deciding && mp.state.log.length === n, before), "Space rolled past the choice");
  await page.keyboard.press("2");
  // the card is for the result of a choice too: it turns to the outcome, stops holding the game, and the line tells it
  await page.waitForFunction(() => !mp.deciding && /goes back to the counter/.test(document.querySelector("#leaf .moment")?.textContent || ""), null, { timeout: 30000 });
  const r = await page.evaluate(() => ({ open: document.getElementById("folio").open, modal: document.getElementById("folio").matches(":modal"), options: !!document.querySelector("#leaf .options"), line: mp.landed(), sq: document.getElementById("landed").dataset.sq }));
  assert(r.open && !r.modal && !r.options && r.sq === "55" && /goes back to the counter/.test(r.line || ""), JSON.stringify(r));
  // the die is live on it, and a roll takes the card away; the line holds until that roll
  await page.waitForFunction(() => !mp.busy && mp.state.turn === 0 && !document.getElementById("roll").disabled, null, { timeout: 30000 });
  assert(await page.evaluate(() => document.getElementById("folio").open && /goes back to the counter/.test(mp.landed() || "")), "the outcome did not stay until the next roll");
  assert(await page.evaluate(() => mp.rollFromCard()), "the outcome's card has no live die");
  await page.waitForFunction(() => !document.getElementById("folio").open, null, { timeout: 5000 });
});

await check("Phase 11: nothing in the line under the board is cut: every moment and every outcome shows whole", async page => {
  await page.goto(BASE + "?seed=1&debug");
  const cut = await page.evaluate(() => {
    const el = document.getElementById("landed"), out = [];
    for (const l of ["en", "hi"]) { mp.setLang(l);
      for (let n = 1; n <= 110; n++) {
        const s = mp.situation(n);
        for (const t of [...(s ? s.options.map(o => o.id) : [null]), ...(mp.data.SQ[n]?.roll ? ["else"] : [])]) {
          mp.land(n, t);
          if (el.scrollHeight > el.clientHeight + 1 || getComputedStyle(el.firstChild || el).webkitLineClamp !== "none") out.push(`${l} ${n}:${t}`);
        }
      }
    }
    return out;
  });
  assert(!cut.length, `cut: ${cut.join(", ")}`);
}, { phone: [375, 812] });

await check("Phase 11: an ordinary landing is a line under the board, with its moment, and opens its card", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.jump(30); mp.roll(2); });
  await page.waitForFunction(() => !mp.busy && mp.landed(), null, { timeout: 15000 });
  const r = await page.evaluate(() => ({ open: document.getElementById("folio").open, line: mp.landed(), sq: document.getElementById("landed").dataset.sq }));
  assert(!r.open && r.sq === "32" && r.line.length > 20, JSON.stringify(r));
  await page.click("#landed");
  await page.waitForFunction(() => document.getElementById("folio").open && location.hash === "#sq/32");
  // the same line in Hindi
  await page.evaluate(() => { mp.close({ instant: true }); mp.setLang("hi"); });
  assert(/[\u0900-\u097F]/.test(await page.evaluate(() => mp.landed())), "the line did not follow the language");
});

await check("Phase 11: with every card asked for, an ordinary landing opens the full card", async page => {
  await page.addInitScript(() => localStorage.setItem("mp-prefs", JSON.stringify({ everyCard: true })));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { mp.jump(30); mp.roll(2); });
  await page.waitForFunction(() => document.getElementById("folio").open && location.hash === "#sq/32", null, { timeout: 15000 });
  await page.waitForFunction(() => !mp.busy, null, { timeout: 15000 });
  assert(!(await page.evaluate(() => mp.landed())), "the line showed as well as the card");
  // the curse said at that landing (Phase 14) is on the card, not the line
  const card = await page.evaluate(() => document.getElementById("leaf").textContent);
  assert(/ says /.test(card) && /had said so|will /.test(card), `the curse is not on the card: ${card.slice(0, 300)}`);
});

await check("Phase 11: the first life shows the moment, with the story behind its bridge; opened once, it stays open", async page => {
  await firstTime(page);
  await page.evaluate(() => mp.open(28));
  await page.waitForFunction(() => document.getElementById("folio").open);
  let r = await page.evaluate(() => ({ more: document.querySelector("#leaf .story-more")?.textContent, mirror: !!document.querySelector("#leaf p.mirror"), voices: !!document.querySelector("#leaf .more-btn"), moment: !!document.querySelector("#leaf p.moment") }));
  assert(r.moment && !r.mirror && !r.voices && /An Upanishad story: Satyakāma/.test(r.more || ""), JSON.stringify(r));
  await page.click("#leaf .story-more");
  r = await page.evaluate(() => ({ bridge: document.querySelector("#leaf p.bridge")?.textContent, mirror: document.querySelector("#leaf p.mirror")?.textContent, voices: !!document.querySelector("#leaf .more-btn") }));
  assert(/Satyakāma/.test(r.bridge || "") && /Satyakama/.test(r.mirror || "") && r.voices, JSON.stringify(r));
  // the next card opens with its story showing, and a figure met before is not told again
  await page.evaluate(() => mp.open(32));
  await page.waitForFunction(() => location.hash === "#sq/32");
  r = await page.evaluate(() => ({ more: !!document.querySelector("#leaf .story-more"), bridge: document.querySelector("#leaf p.bridge")?.textContent, mirror: !!document.querySelector("#leaf p.mirror") }));
  assert(!r.more && r.mirror && /Śvetaketu/.test(r.bridge || ""), JSON.stringify(r));
  await page.evaluate(async () => { await mp.close({ instant: true }); await mp.open(45); });
  r = await page.evaluate(() => ({ bridge: !!document.querySelector("#leaf p.bridge"), mirror: !!document.querySelector("#leaf p.mirror") }));
  assert(!r.bridge && r.mirror, `Satyakāma told twice: ${JSON.stringify(r)}`);
  // ?first leaves what is stored alone
  assert(await page.evaluate(() => localStorage.getItem("mp-first") === null && localStorage.getItem("mp-who") === null), "?first wrote to storage");
});

await check("Phase 11: someone new is in their first life across a reload; a story already known reads 'The old story'", async page => {
  // no name kept: someone who has never played
  await page.goto(BASE + "?seed=1&debug");
  await page.waitForFunction(() => document.getElementById("naming").open);
  await page.fill("#namingName", "Asha");
  await page.check('#namingGenders input[value="f"]');
  await page.click('#namingForm [type="submit"]');
  await page.evaluate(() => mp.open(28));
  await page.waitForFunction(() => document.querySelector("#leaf .story-more"));
  await page.click("#leaf .story-more");
  const kept = await page.evaluate(() => ({ lives: localStorage.getItem("mp-lives"), first: localStorage.getItem("mp-first"), who: localStorage.getItem("mp-who") }));
  assert(kept.lives === "0" && kept.first === '"mirror"' && /Satyakama/.test(kept.who || ""), JSON.stringify(kept));
  // the story closed again, as it is at the start of a first life, and the page reloaded mid-life
  await page.evaluate(() => localStorage.setItem("mp-first", '"moment"'));
  await page.reload();
  await page.evaluate(() => mp.open(45));
  await page.waitForFunction(() => document.getElementById("folio").open);
  const en = await page.evaluate(() => document.querySelector("#leaf .story-more")?.textContent);
  await page.evaluate(() => mp.setLang("hi"));
  const hi = await page.evaluate(() => document.querySelector("#leaf .story-more")?.textContent);
  assert(en === "The old story" && hi === "पुरानी कथा", `${en} / ${hi}`);
}, { named: false });

await check("Phase 11: a returning player keeps the full card, and every mirror a card shows has its bridge", async page => {
  await page.goto(BASE + "?seed=1&debug");
  const missing = await page.evaluate(async () => {
    const out = [];
    for (let n = 1; n <= 110; n++) {
      await mp.open(n);
      if (document.querySelector("#leaf .story-more")) out.push(`${n}: hidden for a returning player`);
      if (!document.querySelector("#leaf .story p.mirror, #leaf .story p:not(.moment)")) out.push(`${n}: no mirror`);
      await mp.close({ instant: true });
    }
    return out;
  });
  assert(!missing.length, missing.slice(0, 5).join("; "));
});

await check("Phase 11: on a phone the sheet does not trap: a square tapped turns it, and a tap beside the board closes it", async page => {
  await page.goto(BASE + "?seed=1&debug");
  await openOn(page, 34);
  const lab = await rect(page, '#labels .lab[data-n="20"]');
  await page.mouse.click(lab.x, (lab.top + lab.bottom) / 2);
  await page.waitForFunction(() => location.hash === "#sq/20", null, { timeout: 5000 });
  assert(await folioOpen(page), "tapping a square closed the sheet");
  await page.mouse.click(3, 200);
  await page.waitForFunction(() => !document.getElementById("folio").open, null, { timeout: 5000 });
}, { phone: [375, 812] });

await check("Phase 15: the ego's faces are on the card before the choice; on one of them the life takes the lower option, and says so", async page => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(BASE + "?seed=1&debug");
  // rajas leads, so the ego owns 4, 5 and 6, shown as faces on the card and in the panel before anything is chosen
  await page.evaluate(() => { Object.assign(mp.state.players[0], { pos: 52, life: [52], told: [null], years: 40, gunas: { s: 0.2, r: 0.6, t: 0.2 } }); mp.roll(3); });
  await page.waitForFunction(() => mp.deciding && document.querySelector("#leaf .options"), null, { timeout: 30000 });
  const before = await page.evaluate(() => ({ ego: document.querySelector("#leaf .ego")?.textContent, hint: document.getElementById("hint").textContent }));
  assert(/The ego takes ⚃ ⚄ ⚅\./.test(before.ego || "") && /⚃ ⚄ ⚅/.test(before.hint), JSON.stringify(before));
  assert(!/\d/.test(before.ego), `a number about the player: ${before.ego}`);
  // every face the ego's: the witness gives the change back, and the life keeps it
  await page.evaluate(() => mp.ego());
  await page.click('#leaf .opt[data-id="return"]');
  await page.waitForFunction(() => !mp.deciding && /The ego's die/.test(document.querySelector("#leaf .ego")?.textContent || ""), null, { timeout: 30000 });
  const card = await page.evaluate(() => ({ text: document.getElementById("leaf").textContent, mirror: document.querySelector("#leaf .mirror")?.textContent, line: mp.landed(), live: document.getElementById("leaf").getAttribute("aria-live") }));
  assert(card.live === "polite", "the card is no longer aria-live");
  assert(/means to take the change back to the counter, and the queue moves/.test(card.text), `the rebellion: ${card.text.slice(0, 400)}`);
  assert(/by what is a person driven to wrong, even unwilling/.test(card.mirror || ""), `the mirror: ${card.mirror}`);
  assert(/means to take the change back/.test(card.line || ""), `the line under the board: ${card.line}`);
  await page.evaluate(() => mp.close());
  await page.waitForFunction(() => !mp.busy && mp.state.players[0].life.length > 1, null, { timeout: 30000 });
  const p = await page.evaluate(() => ({ pos: mp.state.players[0].pos, w: mp.state.players[0].witness, rebel: mp.state.log.some(e => e.k === "lEgoRebel") }));
  assert(p.pos === 43 && p.w.at(-1).chose === "return" && p.w.at(-1).took === "keep" && p.rebel, JSON.stringify(p));
  // and Space still rolls
  const turns = await page.evaluate(() => mp.state.players[0].life.length);
  await page.keyboard.press("Space");
  await page.waitForFunction(n => mp.state.players[0].life.length > n || mp.busy, turns, { timeout: 15000 });
});

await check("Phase 15: with no face the ego's, the choice holds, and the die is seen to tumble when motion is allowed", async page => {
  await page.goto(BASE + "?seed=1&debug");
  await page.evaluate(() => { Object.assign(mp.state.players[0], { pos: 52, life: [52], told: [null], years: 40 }); mp.roll(3); });
  await page.waitForFunction(() => mp.deciding && document.querySelector("#leaf .options"), null, { timeout: 30000 });
  await page.evaluate(() => mp.ego([]));
  assert(/The ego takes no face here/.test(await page.evaluate(() => document.querySelector("#leaf .ego")?.textContent || "")), "the card does not show the forced faces");
  await page.evaluate(() => {
    window.__faces = new Set();
    new MutationObserver(() => { const t = document.querySelector("#leaf .ego")?.textContent; if (t) window.__faces.add(t); }).observe(document.getElementById("leaf"), { childList: true, subtree: true, characterData: true });
  });
  await page.click('#leaf .opt[data-id="return"]');
  await page.waitForFunction(() => /The choice holds/.test(document.querySelector("#leaf .ego")?.textContent || ""), null, { timeout: 30000 });
  const seen = await page.evaluate(() => window.__faces.size);
  assert(seen >= 2, `the die did not tumble: ${seen} states`);
  assert(await page.evaluate(() => /goes back to the counter/.test(document.querySelector("#leaf .moment")?.textContent || "")), "the outcome chosen is not told");
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
  await page.waitForFunction(() => document.getElementById("folio").open || !("empty" in document.getElementById("landed").dataset), null, { timeout: 15000 });
  const loaded = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === "loaded").map(f => f.family.replace(/"/g, "")); });
  assert(loaded.includes("Crimson Pro"), "card font not available offline: " + loaded.join(", "));
  await ctx.setOffline(false);
});

await browser.close();
server.close();
console.log(failed.length ? `${failed.length} check(s) failed:\n` + failed.map(n => `  ${n}`).join("\n") : "all checks passed");
process.exit(failed.length ? 1 : 0);
