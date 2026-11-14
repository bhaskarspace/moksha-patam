// The painted vignettes (REDESIGN.md Phase 13, docs/CONTENT.md §7): a small Basohli scene per square, written into
// assets/sprites.svg in place of the square's sprite, under the same id (sq-N), so a square without one keeps its
// sprite and a missing sheet still shows the emoji. The scenes are art/vignettes.mjs, drawn from tools/vignette-parts.mjs.
// The old cloths' pictures (art/cloth.mjs, Phase 20) go in the same sheet as b72-N and b84-N, for the card's panel only.
//   node tools/vignettes.mjs [squares…]     rewrites the given squares (N, or 72/N and 84/N for a cloth's), or every
//                                           square art/vignettes.mjs and art/cloth.mjs draw
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { symbol } from "./vignette-parts.mjs";

const root = path.resolve(import.meta.dirname, "..");
{
  const { default: SCENES } = await import(pathToFileURL(path.join(root, "art/vignettes.mjs")).href);
  const { default: CLOTH } = await import(pathToFileURL(path.join(root, "art/cloth.mjs")).href);
  const args = process.argv.slice(2), want = args.map(Number).filter(Boolean), wantCloth = args.filter(a => a.includes("/"));
  const sheetPath = path.join(root, "assets/sprites.svg");
  let sheet = fs.readFileSync(sheetPath, "utf8");
  const done = [];
  for (const [k, scene] of Object.entries(SCENES)) {
    const n = +k;
    if (want.length && !want.includes(n)) continue;
    const sym = symbol(n, scene.draw().flat());
    const re = new RegExp(`<symbol id="sq-${n}"[^>]*>[\\s\\S]*?</symbol>`);
    sheet = re.test(sheet) ? sheet.replace(re, () => sym) : sheet.replace("</svg>", () => `${sym}\n</svg>`);
    done.push(n);
  }
  const cloth = [];
  for (const [b, pics] of Object.entries(CLOTH)) {
    for (const [k, pic] of Object.entries(pics)) {
      if (args.length && !wantCloth.includes(`${b}/${k}`)) continue;
      const id = `b${b}-${k}`, sym = symbol(+k, pic.draw().flat(), id);
      const re = new RegExp(`<symbol id="${id}"[^>]*>[\\s\\S]*?</symbol>`);
      sheet = re.test(sheet) ? sheet.replace(re, () => sym) : sheet.replace("</svg>", () => `${sym}\n</svg>`);
      cloth.push(`${b}/${k}`);
    }
  }
  fs.writeFileSync(sheetPath, sheet);
  console.log(`vignettes: ${done.length} written (${done.join(", ")}); ${Object.keys(SCENES).length} drawn of the 110 (105's is the card's alone); ${cloth.length} of the old cloths' (${cloth.join(", ")})`);
}
