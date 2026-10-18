// Rewrites content/*.json with one entry per line, so the files read as reviewable tables.
// Objects are expanded down to EXPAND levels; anything deeper, and any flat array, stays on one line.
import fs from "node:fs";

const EXPAND = { "strings.json": 3 };
const S = JSON.stringify;
function fmt(v, depth, max) {
  if (depth >= max || v === null || typeof v !== "object" || (Array.isArray(v) && v.every(x => typeof x !== "object"))) return S(v);
  const pad = "  ".repeat(depth + 1), end = "  ".repeat(depth), arr = Array.isArray(v);
  const items = arr ? v.map(x => pad + fmt(x, depth + 1, max)) : Object.entries(v).map(([k, x]) => pad + S(k) + ": " + fmt(x, depth + 1, max));
  return (arr ? "[" : "{") + "\n" + items.join(",\n") + "\n" + end + (arr ? "]" : "}");
}

const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync("content").filter(f => f.endsWith(".json")).map(f => "content/" + f);
for (const f of files) {
  const max = EXPAND[f.split("/").pop()] ?? 2;
  fs.writeFileSync(f, fmt(JSON.parse(fs.readFileSync(f, "utf8")), 0, max) + "\n");
}
