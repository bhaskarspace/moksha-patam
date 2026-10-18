// Bundles src/ into the single deployable index.html: src/index.html with the CSS and JS inlined.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import * as esbuild from "esbuild";
import { lintReport, momentsLine } from "./lint-content.mjs";

const root = path.resolve(import.meta.dirname, "..");
const rel = p => path.join(root, p);

// No randomness outside rng.js, so every game replays from its seed.
const stray = [];
for (const f of fs.readdirSync(rel("src"), { recursive: true })) {
  if (!f.endsWith(".js") || f === "rng.js") continue;
  fs.readFileSync(rel("src/" + f), "utf8").split("\n").forEach((line, i) => {
    if (line.includes("Math.random")) stray.push(`src/${f}:${i + 1}`);
  });
}
if (stray.length) {
  console.error("Math.random is only allowed in src/rng.js. Found at:\n  " + stray.join("\n  "));
  process.exit(1);
}

// Every string bilingual, every id resolving: see tools/lint-content.mjs.
const { errors: contentErrors, warnings, moments } = lintReport();
if (warnings.length) console.warn(`Content warnings:\n  ${warnings.join("\n  ")}`);
console.log(momentsLine(moments));
if (contentErrors.length) {
  console.error("Content problems:\n  " + contentErrors.join("\n  "));
  process.exit(1);
}

const { outputFiles } = await esbuild.build({
  entryPoints: [rel("src/main.js")],
  bundle: true, write: false, format: "iife", target: "es2022", charset: "utf8", legalComments: "none",
});
const js = outputFiles[0].text;
const css = fs.readFileSync(rel("src/styles.css"), "utf8");
// The Basohli sprite sheet is inlined too, so the deploy stays one file. Without it every square
// falls back to its emoji (docs/CONTENT.md §7).
const sprites = fs.existsSync(rel("assets/sprites.svg"))
  ? fs.readFileSync(rel("assets/sprites.svg"), "utf8").replace("<svg ", '<svg class="sprites" ') : "";
if (!sprites) console.warn("assets/sprites.svg is missing: the board will show emoji");
const html = fs.readFileSync(rel("src/index.html"), "utf8")
  .replace("<!-- @sprites -->", () => sprites)
  .replace("<!-- @style -->", () => `<style>\n${css}</style>`)
  .replace("<!-- @script -->", () => `<script>\n${js}</script>`);
fs.writeFileSync(rel("index.html"), html);
console.log(`index.html: ${(html.length / 1024).toFixed(1)} KB`);

// The service worker's cache is named after the page it serves, so each deploy replaces the old one.
const version = createHash("sha256").update(html).digest("hex").slice(0, 12);
fs.writeFileSync(rel("sw.js"), fs.readFileSync(rel("src/sw.js"), "utf8").replace("__VERSION__", version));
console.log(`sw.js: cache ${version}`);
