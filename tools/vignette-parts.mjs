// The parts the painted vignettes are drawn from (tools/vignettes.mjs writes them; art/vignettes.mjs composes them).
//
// A vignette is 48 × 48 with the sheet's 1.25 outline. It fills its square where a sprite fills about half of one, so on
// the board the two lines come out the same weight. Flat
// pigment from the board's palette (content/boards.json) inside a single lamp-black line, figures in profile with the
// one large eye, no gradients, no filters and no transforms: every part here bakes its placement into its coordinates.
// The square's number sits in its top-left corner and its name along the bottom, and on a snake or ladder square the
// head or the foot covers the middle, so a scene keeps to the sides there (art/vignettes.mjs says which is which).
import { BOARD } from "../src/content.js";

export const SIZE = 48, LINE = 1.25;
const f = n => +n.toFixed(2);
// a token name ("vermilion") as its colour, or "none"
export const hex = c => (c === "none" ? "none" : BOARD.palette[c] ?? (() => { throw new Error(`no palette colour ${c}`); })());

// ---- Paths, placed: every coordinate scaled, mirrored and moved here, never by an SVG transform ----
// A path in absolute M/L/C/Q/Z commands, drawn about (0, 0), placed at (x, y), scaled by s, and facing left when face < 0.
export function place(d, { x = 0, y = 0, s = 1, face = 1 } = {}) {
  let k = 0;
  return d.replace(/-?\d*\.?\d+/g, v => (k++ % 2 === 0 ? f(x + face * s * +v) : f(y + s * +v)));
}
const el = (tag, attrs) => `<${tag} ${Object.entries(attrs).filter(([, v]) => v != null).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`;
// a filled shape with the one outline; ink: false leaves the line off (an eye, a dot of pigment)
export const shape = (d, fill, o = {}, ink = true) => el("path", { d: place(d, o), fill: hex(fill), stroke: ink ? undefined : "none" });
export const line = (d, o = {}) => el("path", { d: place(d, o), fill: "none" });
export const dot = (x, y, r, fill, ink = true) => el("circle", { cx: f(x), cy: f(y), r: f(r), fill: hex(fill), stroke: ink ? undefined : "none" });
export const poly = (pts, fill, ink = true) => el("path", { d: "M" + pts.map(([x, y]) => `${f(x)},${f(y)}`).join(" L") + " Z", fill: hex(fill), stroke: ink ? undefined : "none" });

// ---- The parts ----
// A head in profile, facing right at face 1: the face in shell, the hair, and the one large eye, drawn about the middle of
// the head. hair: "black" | "grey" | "white" | "none"; kind: "man" | "woman" | "child". s 1 is a grown head, 11 tall.
export function head(x, y, { s = 1, face = 1, hair = "black", kind = "man", skin = "shell" } = {}) {
  const o = { x, y, s, face };
  const out = [shape("M-4,-1 C-4,-5 -1,-6 1.5,-5.6 C3.6,-5.2 4.6,-3.6 4.7,-1.6 L6.2,1.1 L4.7,1.6 C4.9,2.6 4.5,3.5 3.6,3.7 L2.2,4.7 C0,5.5 -3,4.6 -4,2.4 Z", skin, o)];
  if (hair !== "none") {
    const h = hair === "grey" ? "ochre" : hair === "white" ? "shell" : "black";
    out.push(shape("M-4.6,1.8 C-6,-3 -2.6,-6.9 1.9,-5.9 L1.4,-3.7 C-0.6,-3.9 -1.8,-2.5 -1.8,-0.6 C-1.8,1.3 -2.8,2.9 -4.6,1.8 Z", h, o));
    // a woman's braid down her back; a child's tuft
    if (kind === "woman") out.push(shape("M-4.4,1 C-5.6,4 -5.4,7.5 -4.2,10.5 L-2.6,10 C-3.6,7 -3.4,4.2 -2.6,2.4 Z", h, o));
    if (kind === "child") out.push(shape("M-0.6,-5.6 C-0.6,-8.2 1.6,-8.6 2.4,-7.4 C1.2,-7.2 0.8,-6.6 1.2,-5.6 Z", h, o));
  }
  // the eye: a black almond reaching back toward the ear, as Basohli draws it
  out.push(shape("M0.2,-1.3 Q2.3,-3 4.2,-1.5 Q2.3,-0.2 0.2,-1.3 Z", "black", o, false));
  return out.join("");
}
// A limb from (x1, y1) to (x2, y2), w wide, ending in a hand or a foot.
export function limb(x1, y1, x2, y2, { w = 3, fill = "shell", end = 1.9 } = {}) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = (-dy / len) * (w / 2), ny = (dx / len) * (w / 2);
  return poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], fill) + (end ? dot(x2, y2, end, "shell") : "");
}
// A standing figure in a long robe that flares at the hem (the Pahari jama), facing right at face 1: neck at (x, y), its
// height about 26·s. The arms are drawn by the scene, since they are what it is doing.
export function robe(x, y, { s = 1, face = 1, fill = "vermilion", sash = "yellow" } = {}) {
  const o = { x, y, s, face };
  return shape("M-3.2,0 L3.2,0 L4.6,9 L9.5,25 L-9,25 L-4.6,9 Z", fill, o) + shape("M-4.6,8.4 L4.6,8.4 L5,10.6 L-5,10.6 Z", sash, o);
}
// A seated figure, knees drawn up, facing right: neck at (x, y), about 16·s tall.
export function seated(x, y, { s = 1, face = 1, fill = "indigo" } = {}) {
  return shape("M-3,0 L3,0 L4.5,8 L11,10.5 L11,15 L-6.5,15 L-5.5,8 Z", fill, { x, y, s, face });
}
// A cusped arch, the niche a Pahari figure stands in: a flat field (x, y) to (x + w, y + h).
export function arch(x, y, w, h, fill) {
  const l = x, r = x + w, b = y + h, c = x + w / 2, t = y, sh = y + h * 0.32;
  return el("path", { d: `M${f(l)},${f(b)} L${f(l)},${f(sh)} Q${f(l)},${f(t + h * 0.12)} ${f(c - w * 0.18)},${f(t + h * 0.1)} Q${f(c)},${f(t)} ${f(c)},${f(t - h * 0.06)} Q${f(c)},${f(t)} ${f(c + w * 0.18)},${f(t + h * 0.1)} Q${f(r)},${f(t + h * 0.12)} ${f(r)},${f(sh)} L${f(r)},${f(b)} Z`, fill: hex(fill) });
}
// The sea as the painters drew water: a flat body under a scalloped edge, and a second row of scallops inside it.
export function sea(x, y, w, h, { fill = "indigo", crest = "shell" } = {}) {
  const top = yy => { let d = ""; for (let xx = x; xx < x + w - 0.1; xx += 4) d += ` Q${f(xx + 2)},${f(yy - 2.6)} ${f(Math.min(xx + 4, x + w))},${f(yy)}`; return d; };
  return el("path", { d: `M${f(x)},${f(y + h)} L${f(x)},${f(y)}${top(y)} L${f(x + w)},${f(y + h)} Z`, fill: hex(fill) }) +
    el("path", { d: `M${f(x + 2)},${f(y + h * 0.5)}${top(y + h * 0.5).replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (m, a, b) => `${f(Math.min(+a + 2, x + w - 1))},${b}`)}`, fill: "none", stroke: hex(crest), "stroke-width": LINE });
}
// A sun: a disc in rays, n of them.
export function sun(cx, cy, r, { rays = 12, fill = "yellow", ray = "vermilion", long = 1.45 } = {}) {
  // the rays as one star, outlined once, and the disc over it
  const pts = [];
  for (let k = 0; k < rays * 2; k++) {
    const a = (k / (rays * 2)) * Math.PI * 2, rr = k % 2 ? r * 0.96 : r * long;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return poly(pts, ray) + dot(cx, cy, r, fill);
}
// A cloth, folded, with stripes along it: a blanket, a shawl.
export function cloth(x, y, w, h, { fill = "vermilion", stripe = "yellow", stripes = 3 } = {}) {
  let out = poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill);
  for (let k = 1; k <= stripes; k++) {
    const yy = y + (h * k) / (stripes + 1);
    out += poly([[x, yy - 0.7], [x + w, yy - 0.7], [x + w, yy + 0.7], [x, yy + 0.7]], stripe, false);
  }
  return out;
}

// ---- The sheet ----
export function symbol(n, parts) {
  return `<symbol id="sq-${n}" class="vg" viewBox="0 0 ${SIZE} ${SIZE}"><g stroke="${hex("black")}" stroke-width="${LINE}" stroke-linejoin="round" stroke-linecap="round">${parts.join("")}</g></symbol>`;
}


// ---- Things, and the gods' emblems ----
// A lotus seen from the side: petals fanned about (cx, cy), r wide.
export function lotus(cx, cy, r, { fill = "vermilion", inner = "shell", leaf = "malachite" } = {}) {
  const o = { x: cx, y: cy, s: r / 10 };
  return shape("M-12,4 Q0,9 12,4 Q0,6.5 -12,4 Z", leaf, o) +
    shape("M0,4 C-9,3 -11,-3 -10,-6 C-6,-4 -3,0 0,4 Z", fill, o) + shape("M0,4 C9,3 11,-3 10,-6 C6,-4 3,0 0,4 Z", fill, o) +
    shape("M0,4 C-5,1 -5,-6 0,-10 C5,-6 5,1 0,4 Z", inner, o);
}
// A flame of three tongues rising from (cx, base), h tall.
export function flame(cx, base, h, { fill = "vermilion", core = "yellow" } = {}) {
  const o = { x: cx, y: base, s: h / 20 };
  return shape("M0,0 C-8,0 -9,-7 -6,-12 C-5,-9 -4,-8 -3,-8 C-4,-13 -1,-17 1,-20 C1,-15 4,-12 5,-14 C5,-11 8,-9 7,-6 C9,-3 6,0 0,0 Z", fill, o) +
    shape("M0,0 C-4,0 -5,-4 -3,-7 C-2,-5 -1,-6 0,-10 C1,-7 3,-6 3,-4 C4,-2 3,0 0,0 Z", core, o);
}
// A crescent moon, horns up and to the right.
export const moon = (cx, cy, r, fill = "shell") => shape("M3,-9 C-6,-10 -11,-1 -7,6 C-4,10 4,10 8,6 C3,7 -2,4 -2,-1 C-2,-5 0,-8 3,-9 Z", fill, { x: cx, y: cy, s: r / 10 });
// A pot (a lota): round body, short neck, lip.
export const pot = (cx, cy, s = 1, fill = "ochre", band = "vermilion") =>
  shape("M-2.5,-6 L2.5,-6 L2,-4 C6,-3 7,1 6,4 C5,7 -5,7 -6,4 C-7,1 -6,-3 -2,-4 Z", fill, { x: cx, y: cy, s }) +
  shape("M-3.6,-7.4 L3.6,-7.4 L3.2,-5.6 L-3.2,-5.6 Z", fill, { x: cx, y: cy, s }) + shape("M-6.3,0 L6.3,0 L6.1,1.6 L-6.1,1.6 Z", band, { x: cx, y: cy, s }, false);
// Books stacked flat, from the bottom up, each a colour.
export function books(x, y, w, colours = ["vermilion", "indigo", "malachite"]) {
  return colours.map((c, k) => poly([[x + k * 0.8, y - k * 3], [x + w - k * 0.6, y - k * 3], [x + w - k * 0.6, y - k * 3 - 3], [x + k * 0.8, y - k * 3 - 3]], c)).join("");
}
// A house with a pitched roof and a doorway, its foot at (x, y), w wide.
export function house(x, y, w, { wall = "shell", roof = "vermilion", door = "indigo" } = {}) {
  const h = w * 0.6;
  return poly([[x, y], [x + w, y], [x + w, y - h], [x, y - h]], wall) + poly([[x - 1.5, y - h], [x + w / 2, y - h - w * 0.45], [x + w + 1.5, y - h]], roof) +
    arch(x + w * 0.38, y - h * 0.62, w * 0.24, h * 0.62, door);
}
// A shallow bowl, its foot at (cx, y).
export const bowl = (cx, y, w, fill = "ochre") => shape("M-10,-5 L10,-5 C9,0 5,2 0,2 C-5,2 -9,0 -10,-5 Z", fill, { x: cx, y: y - 2, s: w / 20 });
// A crown of three points.
export const crown = (cx, y, w, fill = "yellow") => shape("M-5,0 L-5,-3 L-3,-1.6 L0,-5 L3,-1.6 L5,-3 L5,0 Z", fill, { x: cx, y, s: w / 10 });
// A figure lying along (x, y), the head at the left end facing up: a sick child on a cot, a sleeper.
export function lying(x, y, len, { fill = "vermilion", s = 1 } = {}) {
  return poly([[x + 4 * s, y - 3 * s], [x + len, y - 2.5 * s], [x + len, y + 1.5 * s], [x + 4 * s, y + 1.5 * s]], fill) + head(x + 2 * s, y - 2 * s, { s: 0.6 * s, kind: "child" });
}
