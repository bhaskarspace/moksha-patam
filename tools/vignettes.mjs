// The painted vignettes (REDESIGN.md Phase 13, docs/CONTENT.md §7): a small Basohli scene per square, written into
// assets/sprites.svg in place of the square's sprite, under the same id (sq-N), so a square without one keeps its
// sprite and a missing sheet still shows the emoji. The scenes are art/vignettes.mjs, drawn from tools/vignette-parts.mjs.
//   node tools/vignettes.mjs [squares…]     rewrites the given squares, or every square art/vignettes.mjs draws
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { symbol } from "./vignette-parts.mjs";

const root = path.resolve(import.meta.dirname, "..");
{
  const { default: SCENES } = await import(pathToFileURL(path.join(root, "art/vignettes.mjs")).href);
  const want = process.argv.slice(2).map(Number).filter(Boolean);
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
  fs.writeFileSync(sheetPath, sheet);
  console.log(`vignettes: ${done.length} written (${done.join(", ")}); ${Object.keys(SCENES).length} drawn: the 34 Phase 13 shipped and the nine fables`);
}
