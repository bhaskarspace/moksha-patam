// A contact sheet of painted vignettes (Phase 20 step 4): the scenes being reviewed above a few already shipped, each at
// four times its size, with the number's corner and the name's strip shaded, and at board size beside it, on its band's
// ground. Drawn from art/vignettes.mjs, so a scene can be reviewed before tools/vignettes.mjs writes it into the sheet.
// Also says what the new scenes weigh, raw and gzipped, against the 67's budget (+120 KB raw, +40 KB gzip).
//   node tools/contact-sheet.mjs scratch/vignettes-batch-N.png <new squares…> "|" <existing squares…>
// Needs Chrome installed, as npm run smoke does.
import zlib from "node:zlib";
import { chromium } from "playwright";
import { symbol } from "./vignette-parts.mjs";
import { BOARD, squareOf } from "../src/content.js";
const { default: SCENES } = await import("../art/vignettes.mjs");
const [out, ...args] = process.argv.slice(2);
const [newer, older] = args.join(" ").split("|").map(x => x.trim().split(/\s+/).filter(Boolean).map(Number));
const ground = n => BOARD.palette[BOARD.look?.grounds?.[Math.min(4, Math.floor((n - 1) / 20))]?.[n % 2] ?? "cream"] ?? "#f3ead6";
const syms = [...newer, ...older].map(n => symbol(n, SCENES[n].draw().flat())).join("");
const cell = (n, tag) => `<figure><div class="row">
  <svg class="big" style="background:${ground(n)}" viewBox="0 0 48 48"><use href="#sq-${n}"/><rect x="0" y="0" width="12" height="9" class="guide"/><rect x="0" y="41" width="48" height="7" class="guide"/></svg>
  <svg class="small" style="background:${ground(n)}" viewBox="0 0 48 48"><use href="#sq-${n}"/></svg></div>
  <figcaption><b>${n}</b> ${squareOf(n).en} <i>${tag}</i></figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{font:13px system-ui;background:#fff;margin:16px;width:${5 * 270}px} h2{font-size:15px;margin:16px 0 6px}
.grid{display:grid;grid-template-columns:repeat(5,262px);gap:10px} figure{margin:0} .row{display:flex;gap:8px;align-items:end}
.big{width:192px;height:192px;border:1px solid #bbb} .small{width:56px;height:56px;border:1px solid #bbb}
.guide{fill:#c00;fill-opacity:.08;stroke:none} figcaption{margin-top:3px} i{color:#777}</style>
<svg width="0" height="0" style="position:absolute">${syms}</svg>
<h2>New (sheet)</h2><div class="grid">${newer.map(n => cell(n, "new")).join("")}</div>
<h2>Existing, for comparison</h2><div class="grid">${older.map(n => cell(n, "existing")).join("")}</div>`;
const b = await chromium.launch({ channel: "chrome" }), p = await b.newPage({ viewport: { width: 1400, height: 800 }, deviceScaleFactor: 2 });
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
await b.close();
const weight = newer.map(n => symbol(n, SCENES[n].draw().flat())).join("\n");
const raw = Buffer.byteLength(weight), gz = zlib.gzipSync(weight, { level: 9 }).length;
console.log(`wrote ${out}; the ${newer.length} new scenes weigh ${(raw / 1024).toFixed(1)} KB raw, ${(gz / 1024).toFixed(1)} KB gzipped as symbols (gross: on the page each replaces a Phase 5 sprite, so the build's growth is less)` +
  ` (${(raw / newer.length / 1024).toFixed(2)} KB a scene; 67 at that rate: ${((raw / newer.length) * 67 / 1024).toFixed(0)} KB raw gross, of the 120 budgeted)`);
