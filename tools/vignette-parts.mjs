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

// ---- The animals, for the fables (docs/CONTENT.md §7: the animal in profile at the moment of the turn) ----
// Each stands on its baseline at (x, y), facing right at face 1, with the one large eye; s 1 is about a hand of the 48.
const eye = (x, y, r, o) => dot(o.x + o.face * o.s * x, o.y + o.s * y, r * o.s, "black", false);
const at = (x, y, s, face) => ({ x, y, s, face });
// A monkey crouched, one arm free (arm: the point the free hand reaches to, from the shoulder, in its own units).
export function monkey(x, y, { s = 1, face = 1, fill = "ochre", arm = [6, -14] } = {}) {
  const o = at(x, y, s, face);
  return [
    line("M-5,-3 C-11,-3 -12,-10 -8,-12 C-6,-13 -5,-11 -6.5,-10", o),
    shape("M-6,0 C-7,-4 -6,-9 -2,-10 C2,-11 4,-8 4,-5 L5,-1 L3,0 L2,-3 L-1,-3 L-2,0 Z", fill, o),
    limb(o.x + face * s * 2, o.y - s * 8, o.x + face * s * arm[0], o.y + s * arm[1], { w: 1.8 * s, fill, end: 0 }),
    shape("M0,-11 C0,-15 4,-16 6,-14.5 C8,-13 7.5,-10 5.5,-9.5 C3,-9 0,-9.5 0,-11 Z", fill, o),
    shape("M3.6,-13.8 C5.8,-14 7.2,-12.6 6.6,-11 C6,-10 4.4,-10.2 3.8,-11 Z", "shell", o),
    eye(5.2, -12.6, 0.7, o),
  ];
}
// A crocodile swimming, the back and the long jaw above the water line at y.
export function crocodile(x, y, { s = 1, face = 1, fill = "beetle" } = {}) {
  const o = at(x, y, s, face);
  return [
    shape("M-18,0 C-15,-3 -9,-6.4 -2,-6.8 L6,-6.6 C8.6,-8.4 11.4,-7.8 12.4,-5.6 L19,-4 L19.2,-2.2 L13,-1.6 L19,-1.2 L18.4,0 Z", fill, o),
    poly([[-10, -5.2], [-8.6, -7.8], [-7, -6], [-5.4, -8.4], [-3.6, -6.6], [-1.8, -8.8], [0, -6.8]].map(([a, b]) => [o.x + face * s * a, o.y + s * b]), fill),
    eye(9.6, -6.6, 0.9, o),
  ];
}
// A crow in flight, the wings up.
export function crow(x, y, { s = 1, face = 1, fill = "black", wing = "indigo" } = {}) {
  const o = at(x, y, s, face);
  return [
    shape("M-7,0 L-4,-1.6 C-1,-3 3,-3 5,-2 L8,-1.4 L5.4,-0.4 C3,1.6 -1,1.6 -4,0.8 Z", fill, o),
    shape("M2,-2.2 C-1,-5 -5,-8 -10,-8.6 C-8,-5.6 -5,-2.6 -2,-1.6 Z", wing, o),
    dot(o.x + face * s * 4.8, o.y - s * 1.9, 0.55 * s, "shell", false),
  ];
}
// A bird perched, its tail down behind it.
export function perched(x, y, { s = 1, face = 1, fill = "yellow", wing = "malachite" } = {}) {
  const o = at(x, y, s, face);
  return [
    shape("M-5,2 L-3,-1 C-2,-4 1,-5 3,-4.4 C4.4,-4 5,-3 5,-2.4 L7,-2 L5,-1.2 C4.6,1 2,2.4 -1,2 Z", fill, o),
    shape("M-2.6,-1.4 C-1,-3 2,-2.6 2.6,-0.6 C1,0.8 -1.4,0.8 -2.6,-1.4 Z", wing, o),
    eye(3.4, -3, 0.6, o),
    line("M0,2 L0,4 M1.6,2 L1.6,4", o),
  ];
}
// A lion springing up, the forelegs off the ground; the mane round the head.
export function lion(x, y, { s = 1, face = 1, fill = "yellow", mane = "vermilion" } = {}) {
  const o = at(x, y, s, face);
  return [
    line("M-11,-6 C-15,-7 -15,-12 -12,-13", o), dot(o.x + face * s * -12, o.y - s * 13.4, 1.2 * s, mane),
    shape("M-12,0 L-11,-5 C-11,-8 -8,-9.5 -3,-10 L4,-12 L7,-9 L5,-6 L9,-4 L10,-2 L8,-2.4 L3,-4.4 C0,-4 -4,-4 -7,-5 L-7.6,0 L-9.4,0 L-9.6,-3.8 L-10.2,0 Z", fill, o),
    shape("M2,-12 C1,-16 4,-19 7.4,-18.4 C10.6,-17.8 12,-14.6 10.4,-11.6 C9,-9 5,-8.6 3,-10 Z", mane, o),
    shape("M5.4,-15.6 C7.6,-16.6 10.4,-15.4 10.6,-13 L12.2,-12.2 L10.6,-11 C9.6,-9.8 7,-10 5.8,-11.4 Z", fill, o),
    eye(8.4, -14.2, 0.75, o),
  ];
}
// A horse at the trot, a foreleg raised.
export function horse(x, y, { s = 1, face = 1, fill = "shell", mane = "vermilion" } = {}) {
  const o = at(x, y, s, face);
  return [
    shape("M-10,-10 C-13,-9 -14,-5 -13,-2 C-12,-5 -11,-7 -9.6,-8 Z", mane, o),
    shape("M-10,0 L-9.4,-6 C-10,-9 -8,-11 -4,-11 L4,-11 L7,-16 C8,-18 10,-18.6 11.4,-17.4 L13,-14 L11.6,-13 L9.6,-14 L8,-9.6 L7.6,-6.6 L9,-4.4 L8,-3.8 L6,-6 L5.2,0 L3.4,0 L3.6,-6 L-5,-6 L-6.4,0 L-8,0 L-7.8,-5.2 Z", fill, o),
    shape("M6.6,-15.4 C7.4,-18.4 9.2,-19.6 10.4,-19 L8.4,-14 Z", mane, o),
    eye(10, -16, 0.6, o),
  ];
}
// A cow walking, the hump and the horns.
export function cow(x, y, { s = 1, face = 1, fill = "shell", horn = "ochre" } = {}) {
  const o = at(x, y, s, face);
  return [
    line("M-11,-8 C-13,-6 -13,-3 -12.4,-1.4", o),
    shape("M-11,-8 C-11,-10 -8,-11 -4,-10.6 C-2,-12.6 1,-12.6 2,-10.6 L7,-10 L10,-9 L12,-6.6 L11.6,-5 L9,-5.4 L7.6,-6 L6.6,-4.6 L6.2,0 L4.4,0 L4.4,-4.4 L-6.6,-4.6 L-7.4,0 L-9.2,0 L-9.4,-4.8 C-10.8,-5.4 -11.2,-6.6 -11,-8 Z", fill, o),
    shape("M8.4,-10 C8.6,-12.4 10.4,-13.6 11.8,-13 C10.4,-12.4 10,-11.4 10,-9.6 Z", horn, o),
    eye(9.8, -7.8, 0.6, o),
  ];
}
// A deer standing, spotted, the head turned back over its shoulder when back is set.
export function deer(x, y, { s = 1, face = 1, fill = "ochre", spot = "shell", back = false } = {}) {
  const o = at(x, y, s, face), hx = back ? -1 : 1;
  const out = [
    shape("M-8,-11 C-9,-12 -10,-11.4 -9.4,-10.4 L-8.2,-9.6 L-7.4,-5.4 L-8,0 L-6.4,0 L-5.6,-5 L3.8,-5 L4.6,0 L6.2,0 L5.8,-5.6 L6.6,-10.4 C4,-11.4 -4,-11.6 -8,-11 Z", fill, o),
    shape(back ? "M-6,-10.8 C-7,-14 -8,-16 -10.6,-16.6 L-12.4,-15.2 L-10.6,-14.4 C-9.8,-13 -8.6,-11.4 -6,-10.8 Z" : "M5,-10.6 C6,-14 7,-16 9.6,-16.6 L11.4,-15.2 L9.6,-14.4 C8.8,-13 7.6,-11.4 5,-10.6 Z", fill, o),
    line(back ? "M-9.2,-16.4 L-9.6,-19 L-11,-20.4 M-9.6,-19 L-8,-20.6" : "M8.2,-16.4 L8.6,-19 L10,-20.4 M8.6,-19 L7,-20.6", o),
    eye(back ? -10 : 9.2, -15.6, 0.6, o),
  ];
  for (const [a, b] of [[-4, -8.6], [-0.6, -9], [2.6, -8.4], [-2.4, -6.8], [1, -6.6]]) out.push(dot(o.x + face * s * a, o.y + s * b, 0.7 * s, spot, false));
  return out;
}
// A cat sitting up as if at prayer, eyes shut, the forepaws together.
export function cat(x, y, { s = 1, face = 1, fill = "ochre" } = {}) {
  const o = at(x, y, s, face);
  return [
    line("M-5,-1 C-10,-1 -11,-6 -8,-8", o),
    shape("M-5,0 C-7,-5 -6,-12 -2,-14 L2,-14 C4,-12 5,-6 4,0 Z", fill, o),
    shape("M-2.4,-13 C-3.6,-16 -2.6,-19.6 0,-20 L0.6,-22.6 L2.2,-20.2 L3.6,-21.6 L3.6,-19 C5,-17.4 4.8,-14.4 2.4,-13 Z", fill, o),
    line("M1.4,-17.2 Q2.4,-16.4 3.4,-17.2", o),
    limb(o.x + face * s * 1, o.y - s * 11, o.x + face * s * 4.6, o.y - s * 12.6, { w: 1.6 * s, fill, end: 0 }),
  ];
}
// A hare, ears up, sitting.
export function hare(x, y, { s = 1, face = 1, fill = "shell" } = {}) {
  const o = at(x, y, s, face);
  return [
    shape("M-5,0 C-6,-4 -3,-6.6 1,-6.4 C3,-6.4 4,-5 4,-3 L5,0 Z", fill, o),
    shape("M1.6,-6 C1.4,-8.6 3.4,-9.6 5,-8.8 C6.6,-8 6.6,-6 5.6,-5 C4.4,-4.2 2.4,-4.6 1.6,-6 Z", fill, o),
    shape("M2.6,-8.8 C1.6,-12 1.8,-14 2.8,-14.2 C3.8,-13.4 4,-11 3.8,-9 Z", fill, o),
    eye(4.4, -7.2, 0.5, o),
  ];
}
// A jackal crouched, the head down at what it is gnawing.
export function jackal(x, y, { s = 1, face = 1, fill = "ochre" } = {}) {
  const o = at(x, y, s, face);
  return [
    shape("M-12,-5 C-14,-4 -15,-2 -14.4,-0.6 C-13,-2 -11.6,-3 -10.6,-3.4 Z", fill, o),
    shape("M-11,0 L-10.6,-4 C-10.6,-7 -6,-8 0,-7.6 L4,-7 L8,-4 L11.4,-3 L11,-1.8 L7,-1.6 L4,-3.4 L3.6,0 L2,0 L1.6,-3.6 L-6.4,-4 L-7.4,0 L-9,0 L-9.2,-3.4 Z", fill, o),
    poly([[o.x + face * s * 4.6, o.y - s * 6.6], [o.x + face * s * 5.4, o.y - s * 9.6], [o.x + face * s * 6.6, o.y - s * 5.6]], fill),
    eye(7.2, -4.6, 0.55, o),
  ];
}
