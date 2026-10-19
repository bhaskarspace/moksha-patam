// ---- The illuminated frame: a square's sprite set in a cusped arch, as a Pahari figure sits in its niche ----
// Drawn in the sprite's own units, so the frame's lamp-black lines are the sprites' 1.25 at any size (docs/CONTENT.md §7:
// one outline weight). Flat fills only, coloured by class from the Basohli tokens in styles.css; the arch's field
// follows the square's kind (.leaf.<kind> .ill). One frame for every square: a set of folios shares its border.
export const W = 36, H = 42;

// the opening: straight jambs up to two lobes a side and a pointed crown
const ARCH = "M5.5 36.5V19A4.2 4.2 0 0 1 10 13.6A5.6 5.6 0 0 1 18 8.6A5.6 5.6 0 0 1 26 13.6A4.2 4.2 0 0 1 30.5 19V36.5Z";

// shell pearls strung along the middle of the vermilion band
const PEARLS = (() => {
  const out = [], m = 2.1, step = 3.15;
  for (let x = m + 1.6; x <= W - m - 1.5; x += step) out.push([x, m], [x, H - m]);
  for (let y = m + 1.6 + step; y <= H - m - 1.5 - step; y += step) out.push([m, y], [W - m, y]);
  return out;
})();
const f = n => +n.toFixed(2);

// The frame around one picture. `pic` is a sprite id that exists in the page, or null; `fallback` is drawn as text
// in its place (an emoji, or ॐ for the goal), so a missing sprite still shows a framed picture, never a blank one.
export function illumined(pic, fallback = "") {
  const inner = pic
    ? `<use href="#${pic}" x="6" y="12.5" width="24" height="24" clip-path="url(#ill-clip)"/>`
    : `<text class="fb" x="18" y="${fallback === "ॐ" ? 31 : 30}" text-anchor="middle">${fallback}</text>`;
  return `<svg class="ill" viewBox="0 0 ${W} ${H}" aria-hidden="true">` +
    `<defs><clipPath id="ill-clip"><path d="${ARCH}"/></clipPath></defs>` +
    `<rect class="band ink" x="0.63" y="0.63" width="${W - 1.25}" height="${H - 1.25}"/>` +
    PEARLS.map(([x, y]) => `<circle class="pearl" cx="${f(x)}" cy="${f(y)}" r="0.62"/>`).join("") +
    `<rect class="spandrel ink" x="4.2" y="4.2" width="${W - 8.4}" height="${H - 8.4}"/>` +
    `<path class="field ink" d="${ARCH}"/>` + inner +
    `<path class="rim ink" d="${ARCH}"/>` +
    `<circle class="jewel ink" cx="18" cy="5.9" r="1.35"/>` +
    `</svg>`;
}
