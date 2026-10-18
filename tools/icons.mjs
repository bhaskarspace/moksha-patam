// Draws the app icons from one emblem: a gold Om on the board's red frame, with the frame's gold dots.
// Writes the PNG sizes the manifest, the favicon and iOS need. Run after changing the emblem.
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const out = p => path.join(root, "icons", p);

// pad: how far in the dotted border sits; omSize: the glyph's share of the square
// gold dots evenly spaced around a square inset by pad
function dots(pad) {
  const side = 512 - 2 * pad, n = Math.round(side / 22), step = side / n, out = [];
  for (let i = 0; i < n; i++) {
    const a = pad + i * step, b = 512 - pad - i * step;
    out.push([a, pad], [512 - pad, a], [b, 512 - pad], [pad, b]);
  }
  return out.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="#F6C443"/>`).join("");
}

const emblem = ({ round = 64, pad = 30, omSize = 0.62 }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="glow" cx="50%" cy="46%" r="50%"><stop offset="0" stop-color="#D23A2C"/><stop offset="1" stop-color="#8E1A12"/></radialGradient>
  </defs>
  <rect width="512" height="512" rx="${round}" fill="url(#glow)"/>
  ${dots(pad)}
  <rect x="${pad + 14}" y="${pad + 14}" width="${512 - 2 * pad - 28}" height="${512 - 2 * pad - 28}" rx="${Math.max(0, round - pad - 14)}" fill="none" stroke="#F6C443" stroke-width="4"/>
  <text x="256" y="${256 + 512 * omSize * 0.3}" font-family="Rozha One, Kohinoor Devanagari, Devanagari Sangam MN, serif" font-size="${512 * omSize}" text-anchor="middle" fill="#FFD86B">ॐ</text>
</svg>`;

const icons = [
  ["icon-192.png", 192, emblem({})],
  ["icon-512.png", 512, emblem({})],
  // maskable icons are cropped to a circle or squircle, so the art keeps inside the middle 80%
  ["icon-maskable-512.png", 512, emblem({ round: 0, pad: 64, omSize: 0.5 })],
  ["apple-touch-icon.png", 180, emblem({ round: 0, pad: 26 })],
];

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
for (const [name, size, svg] of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rozha+One&display=swap">
    <style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out(name), omitBackground: true });
  console.log("icons/" + name);
}
await browser.close();
