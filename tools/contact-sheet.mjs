// A contact sheet of painted vignettes (Phase 20 step 4): the scenes being reviewed above a few already shipped, each at
// four times its size, with the number's corner and the name's strip shaded, and at board size beside it, on its band's
// ground. Drawn from art/vignettes.mjs, so a scene can be reviewed before tools/vignettes.mjs writes it into the sheet.
// Also says what the new scenes weigh, raw and gzipped, against the 67's budget (+120 KB raw, +40 KB gzip).
//   node tools/contact-sheet.mjs scratch/vignettes-batch-N.png <new squares…> "|" <existing squares…>
// A square of an old cloth is written board/n (72/35, 84/90): its picture from art/cloth.mjs, on the card's paper.
// Needs Chrome installed, as npm run smoke does.
import fs from "node:fs";
import zlib from "node:zlib";
import { chromium } from "playwright";
import { symbol } from "./vignette-parts.mjs";
import { BOARD, squareOf } from "../src/content.js";
const { default: SCENES } = await import("../art/vignettes.mjs");
const { default: CLOTH, BASES } = await import("../art/cloth.mjs");
// the cloths' families' bases, which their pictures use (art/cloth.mjs)
const bases = Object.entries(BASES).map(([k, d]) => symbol(0, d().flat(), `cf-${k}`)).join("");
const LEGENDS = JSON.parse(fs.readFileSync(new URL("../content/legends.json", import.meta.url), "utf8"));
const [out, ...args] = process.argv.slice(2);
const [newer, older] = args.join(" ").split("|").map(x => x.trim().split(/\s+/).filter(Boolean));
// a square is "n" on the 110 or "board/n" on an old cloth
const at = k => { const [b, n] = k.includes("/") ? k.split("/") : ["110", k]; return { b, n: +n, id: b === "110" ? `sq-${n}` : `b${b}-${n}` }; };
const sceneOf = k => { const { b, n } = at(k); return b === "110" ? SCENES[n] : CLOTH[b][n]; };
const nameOf = k => { const { b, n } = at(k); return b === "110" ? squareOf(n).en : `${b}: ${LEGENDS[b][n].en}`; };
const ground = n => BOARD.palette[BOARD.look?.grounds?.[Math.min(4, Math.floor((n - 1) / 20))]?.[n % 2] ?? "cream"] ?? "#f3ead6";
const syms = bases + [...newer, ...older].map(k => symbol(at(k).n, sceneOf(k).draw().flat(), at(k).id)).join("");
const groundOf = k => (at(k).b === "110" ? ground(at(k).n) : BOARD.palette.cream ?? "#f3ead6");
const cell = (k, tag) => {
  const { b, n, id } = at(k), guides = b === "110" ? `<rect x="0" y="0" width="12" height="9" class="guide"/><rect x="0" y="41" width="48" height="7" class="guide"/>` : "";
  return `<figure><div class="row">
  <svg class="big" style="background:${groundOf(k)}" viewBox="0 0 48 48"><use href="#${id}"/>${guides}</svg>
  <svg class="small" style="background:${groundOf(k)}" viewBox="0 0 48 48"><use href="#${id}"/></svg></div>
  <figcaption><b>${b === "110" ? n : `${b}/${n}`}</b> ${nameOf(k)} <i>${tag}</i></figcaption></figure>`;
};
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
// with the families' bases, when the sheet has a cloth's picture: they are written once, whatever uses them
const weight = (newer.some(k => at(k).b !== "110") ? bases + "\n" : "") + newer.map(k => symbol(at(k).n, sceneOf(k).draw().flat(), at(k).id)).join("\n");
const raw = Buffer.byteLength(weight), gz = zlib.gzipSync(weight, { level: 9 }).length;
console.log(`wrote ${out}; the ${newer.length} new pictures weigh ${(raw / 1024).toFixed(1)} KB raw, ${(gz / 1024).toFixed(1)} KB gzipped as symbols` +
  ` (${(raw / newer.length / 1024).toFixed(2)} KB each; a 110 scene replaces a Phase 5 sprite, so the build grows by less; an old cloth's adds all of it)`);
