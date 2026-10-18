// Bundles src/ into the single deployable index.html: src/index.html with the CSS and JS inlined.
import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

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

const { outputFiles } = await esbuild.build({
  entryPoints: [rel("src/main.js")],
  bundle: true, write: false, format: "iife", target: "es2022", charset: "utf8", legalComments: "none",
});
const js = outputFiles[0].text;
const css = fs.readFileSync(rel("src/styles.css"), "utf8");
const html = fs.readFileSync(rel("src/index.html"), "utf8")
  .replace("<!-- @style -->", () => `<style>\n${css}</style>`)
  .replace("<!-- @script -->", () => `<script>\n${js}</script>`);
fs.writeFileSync(rel("index.html"), html);
console.log(`index.html: ${(html.length / 1024).toFixed(1)} KB`);
