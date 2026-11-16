// The pictures of the old cloths' squares (Phase 20, step 4): one per square of the 72 and the 84, drawn by
// tools/vignettes.mjs into assets/sprites.svg as b72-N and b84-N, and shown in the card's picture panel only (the board
// writes each square's legend in it, as the charts do). Each is the legend's emblem in the vignettes' idiom: flat pigment
// in the one 1.25 outline, the 48 square, the palette. Three rules hold for every one of them:
//   - a god of the 72 is an emblem (the conch, the discus, the lotus, a mount), never a figure or a shrine;
//   - no Tīrthaṅkara of the 84 is a seated figure in a niche: the siddhaśilā's crescent, footprints, a lamp;
//   - the 84's hells are darkness, a flame far off, an empty cell: never a body that suffers.
// The card shows the picture whole, so there is no number's corner or name's strip to keep clear; a margin of about 4.
// The emblems come in families, as the charts repeat their motifs: a family's base is drawn once, as the symbol cf-NAME
// (BASES, below), and each square of the family uses it and adds its own small variation.
import { place, dot, poly, shape, line, lotus, flame, moon, pot, sea, sun, bowl, crown, perched, crow, horse, deer, hex } from "../tools/vignette-parts.mjs";

// a family's base, used whole; drawn at its own place, so most squares use it as it is
const base = (name, { x = 0, y = 0 } = {}) => `<use href="#cf-${name}" width="48" height="48"${x || y ? ` x="${x}" y="${y}"` : ""}/>`;
// a line in a pigment, not the ink (on a dark ground, where the ink would not show), the one outline's weight
const cline = (d, fill) => `<path d="${d}" fill="none" stroke="${hex(fill)}"/>`;
// an oval as a path, for shape()
const oval = (cx, cy, rx, ry, k = 0.5523) =>
  `M${cx - rx},${cy} C${cx - rx},${cy - ry * k} ${cx - rx * k},${cy - ry} ${cx},${cy - ry} C${cx + rx * k},${cy - ry} ${cx + rx},${cy - ry * k} ${cx + rx},${cy} C${cx + rx},${cy + ry * k} ${cx + rx * k},${cy + ry} ${cx},${cy + ry} C${cx - rx * k},${cy + ry} ${cx - rx},${cy + ry * k} ${cx - rx},${cy} Z`;
// The board's nāga head (src/render/board.js drawHood) in these parts, the head up: the hood of seven lobes, the inner
// hood with its spectacle mark, the head with its two almond eyes, the forked tongue. (x, y) is the head; S its size.
const hood = (x, y, S, [body, belly, tongue] = ["malachite", "yellow", "vermilion"]) => {
  const at = (u, v) => [x + v * S, y - u * S], hx = -0.08, rx = 0.17, ry = 0.31;
  const [tx, ty] = at(0.31, 0), [ax, ay] = at(0.37, -0.045), [bx, by] = at(0.37, 0.045), [sx, sy] = at(0.15, 0);
  return [
    cline(`M${sx},${sy} L${tx},${ty} L${ax},${ay} M${tx},${ty} L${bx},${by}`, tongue),
    ...Array.from({ length: 7 }, (_, k) => { const th = Math.PI * (0.55 + (0.9 * k) / 6), [cx, cy] = at(hx + Math.cos(th) * rx, Math.sin(th) * ry); return dot(cx, cy, S * 0.055, body); }),
    shape(oval(...at(hx, 0), ry * S, rx * S), body),
    shape(oval(...at(hx - 0.01, 0), ry * 0.68 * S, rx * 0.62 * S), belly, {}, false),
    ...[-1, 1].flatMap(sg => { const [cx, cy] = at(hx - 0.03, sg * 0.085); return [dot(cx, cy, S * 0.042, "black", false), dot(cx, cy, S * 0.026, belly, false)]; }),
    shape(oval(...at(0.07, 0), 0.095 * S, 0.13 * S), body),
    ...[-1, 1].flatMap(sg => { const [cx, cy] = at(0.1, sg * 0.05); return [shape(oval(cx, cy, 0.022 * S, 0.045 * S), "shell", {}, false), dot(cx, cy - 0.004 * S, 0.016 * S, "black", false)]; }),
  ];
};
// the signs the passions' cloud holds, some on both cloths
const bolt = () => poly([[22, 12.6], [29, 12.6], [25.6, 18.6], [30.4, 18.6], [19.4, 31], [22.8, 22], [18.6, 22]], "vermilion");
const pouch = () => [shape("M-5,5 C-7.4,1 -5.6,-3.6 -2,-4.6 L-3,-7 L3,-7 L2,-4.6 C5.6,-3.6 7.4,1 5,5 Z", "ochre", { x: 24, y: 22, s: 1.1 }), line("M20.4,17 L27.6,17")];
const whirl = () => cline("M24,22 C25.6,22 25.6,24 24,24 C21.6,24 21.6,20.4 24,20.2 C27.6,20 27.8,25.6 24,26 C19.4,26.4 18.8,18.6 24,18.2 C29.6,17.8 31,24 28.6,27", "yellow");
const thorn = () => [cline("M14,26 C18,18 24,26 28,18 C30,14 33,15 34,17", "malachite"), ...[[16.6, 22], [21, 21.6], [25.6, 22.4], [29.6, 16]].map(([x, y]) => poly([[x - 1, y], [x + 1, y], [x, y - 2.6]], "malachite", false))];
const ember = () => [shape("M-6,3 C-7,-1 -3,-3 0,-2.4 C3,-3 7,-1 6,3 Z", "lac", { x: 24, y: 25 }), dot(21.4, 24.6, 1, "vermilion", false), dot(26, 25.4, 0.9, "yellow", false), cline("M22,19 C20,16 24,15 22,12 M26.4,19 C24.4,16 28.4,15 26.4,12", "shell")];
const snapped = () => [shape("M8,20 C12,16.6 15,22.6 19.6,19.4 L20.6,22.6 C15.6,25.6 12.4,20 9.4,23.4 Z", "yellow"), shape("M40,20 C36,16.6 33,22.6 28.4,19.4 L27.4,22.6 C32.4,25.6 35.6,20 38.6,23.4 Z", "yellow"), line("M20,20.8 L22.4,19 M20.4,22 L22.8,22.4 M28,20.8 L25.6,19 M27.6,22 L25.2,22.4")];
const feather = () => [cline("M17,31 C20,24 23,19 27,15", "malachite"), shape(oval(28, 14, 4.4, 6), "malachite"), shape(oval(28, 14, 2.6, 3.6), "indigo", {}, false), dot(28, 14, 1.4, "yellow", false)];
const knot = () => cline("M12,24 C16,18 22,30 26,22 C29,16 22,14 21,20 C20,26 30,28 32,22 C33,19 36,20 37,22", "yellow");
// the karma family's dust in its kinds
const settled = Array.from({ length: 18 }, (_, k) => [13 + (k % 9) * 2.8, 33 + Math.floor(k / 9) * 2.6 + (k % 2) * 0.8]);
const even = Array.from({ length: 25 }, (_, k) => [14 + (k % 5) * 5, 14 + Math.floor(k / 5) * 5]);
const leaving = Array.from({ length: 16 }, (_, k) => [20 + k * 1.6 + (k > 7 ? (k - 7) * 0.8 : 0), 24 + Math.sin(k * 1.3) * (1.4 + k * 0.25)]);
// the haṃsa, that parts milk from water: discrimination's emblem, and Brahmā's mount
const hamsa = (x, y) => [shape("M-9,2 C-9,-2 -4,-3 2,-2 L5,-9 C6,-12 10,-12 10.6,-9.4 L8.4,-8.6 C6.6,-6 5.6,-2 8,1 C6,5 -6,5 -9,2 Z", "shell", { x, y }), poly([[x + 10.6, y - 9.4], [x + 13.4, y - 8.8], [x + 10.4, y - 7.6]], "yellow")];
// a knife, its blade and handle
const knife = () => [shape("M-11,1 L4,1 L4,-2 C-2,-3 -8,-2 -11,1 Z", "shell", { x: 22, y: 22 }), poly([[26, 19.4], [33, 19.4], [33, 23.6], [26, 23.6]], "ochre")];
// a row of small flames, n of them, for a count
const flames = (n, y = 30) => Array.from({ length: n }, (_, k) => flame(26 + (k * 16) / Math.max(1, n - 1), y, 7));
// rows of points, for the counts the charts give
const counts = rows => {
  // six to a line at most, each count's lines together, from the top down
  const lines = rows.flatMap(([n, fill]) => Array.from({ length: Math.ceil(n / 6) }, (_, k) => [Math.min(6, n - k * 6), fill]));
  return lines.flatMap(([n, fill], r) => Array.from({ length: n }, (_, k) => dot(26 + k * 3.4, 34 - (lines.length - 1 - r) * 4.4, 1, fill)));
};
// a string of beads, broken, the beads fallen
const broken = () => [cline("M13,22 C15,17 22,15 27,17", "yellow"), ...[[13, 22], [15, 18.6], [18.6, 16.6], [22.6, 16], [27, 17], [27, 27], [30.4, 28], [33.4, 25.6], [21, 28]].map(([x, y]) => dot(x, y, 1.3, "yellow"))];
// two vimānas, small, side by side
const pair = (a = "yellow", b = "gold-hi") => [...vimana(15, 40, 16, a), ...vimana(33, 40, 16, b)];
// four vimānas, two and two, a heavens' plane
const row4 = (a, b) => [[14, 24, a], [34, 24, b], [14, 43, b], [34, 43, a]].flatMap(([x, y, c]) => vimana(x, y, 13, c, false));
// the neck heavens' ornament: beads under the vimāna
const beads = () => Array.from({ length: 9 }, (_, k) => dot(8 + k * 4, 42.6 + 2.6 * Math.sin((k * Math.PI) / 8), 1.3, "gold"));
const star = (x, y, r = 3) => shape(`M0,-${r} L${r * 0.27},-${r * 0.27} L${r},0 L${r * 0.27},${r * 0.27} L0,${r} L-${r * 0.27},${r * 0.27} L-${r},0 L-${r * 0.27},-${r * 0.27} Z`, "shell", { x, y });
// a path drawn about (0, 0), turned by deg and set at (x, y): the coordinates turned, as the sprites have no transforms
const turn = (d, deg, x, y) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), n = d.match(/-?\d*\.?\d+/g).map(Number), out = [];
  for (let k = 0; k < n.length; k += 2) out.push(+(x + n[k] * c - n[k + 1] * sn).toFixed(2), +(y + n[k] * sn + n[k + 1] * c).toFixed(2));
  let k = 0;
  return d.replace(/-?\d*\.?\d+/g, () => out[k++]);
};
// the lamp fallen, upturned on the ground, its oil spilt
const tipped = (x, y) => [shape(turn("M-6,0 L6,0 C5,3 -5,3 -6,0 Z", 160, x, y), "ochre"), shape(turn("M-1.2,2.2 L1.2,2.2 L2.4,6 L-2.4,6 Z", 160, x, y), "ochre"), shape(oval(x + 9, y + 3.4, 7, 1.6), "yellow")];
// an arrow, filled, from (x1, y1) to (x2, y2)
const arrow = (x1, y1, x2, y2, fill = "yellow") => {
  const a = Math.atan2(y2 - y1, x2 - x1), c = Math.cos(a), s = Math.sin(a), w = 1.1, h = 3.4;
  const bx = x2 - c * h, by = y2 - s * h;
  return [poly([[x1 - s * w, y1 + c * w], [bx - s * w, by + c * w], [bx + s * w, by - c * w], [x1 + s * w, y1 - c * w]], fill),
    poly([[x2, y2], [bx - s * 2.8, by + c * 2.8], [bx + s * 2.8, by - c * 2.8]], fill)];
};
// the 72's centre column of realms: tier k (0, earth, to 6, truth) as a path
const tier = k => [[24 - 17 + 2 * k, 42 - 4.8 * k], [24 + 17 - 2 * k, 42 - 4.8 * k], [24 + 17 - 2 * k, 37.2 - 4.8 * k], [24 - 17 + 2 * k, 37.2 - 4.8 * k]];
// the 72's realms, each tier its colour, earth first
const TIER = ["malachite", "indigo", "yellow", "vermilion", "beetle", "lac", "shell"];
// small clouds, pale, for the sky between the worlds
const puff = (x, y, s = 1, fill = "shell") => shape("M-6,2 C-8,2 -8,-1 -5.6,-1.2 C-5.6,-4 -1.6,-4.6 -0.4,-2.4 C0.6,-4.4 4.6,-4 4.6,-1 C7,-1 7.6,2 5.4,2 Z", fill, { x, y, s });
// a pennant on the vimāna's pole
const pennant = fill => poly([[24, 14.8], [28.4, 16.6], [24, 18.4]], fill);
// a soul's disc, clear, and the karma's dust on it at the given points
const soul = (dust, cy = 24, r = 15) => [dot(24, cy, r, "shell"), ...dust.map(([x, y]) => dot(x, y, 0.95, "black", false))];
// a leśyā: the soul's colour, a disc of it on shell
const stain = fill => [dot(24, 24, 18, "shell"), dot(24, 24, 12, fill)];
// the three guṇas: the square's own a disc on its thread, and all three small beneath it, in order
const guna = fill => [line("M24,4 L24,12"), dot(24, 23, 11, fill), ...[["shell", 16], ["vermilion", 24], ["black", 32]].map(([c, x]) => dot(x, 41, 3, c))];
// the river coming down to its waves, as 49 has it; mirror it with face -1
const river = (fill, { face = 1, crest = "shell" } = {}) => [
  shape("M17,4 L27,4 C29,13 19,17 22,24 C24,29 30,30 32,33 L20,33 C14,30 10,26 11,21 C12,15 19,11 17,4 Z", fill, face < 0 ? { x: 48, face: -1 } : {}),
  sea(4, 31, 40, 13, { fill, crest }),
];

// the discus: rim, spokes, hub
const discus = (x, y, r) => [
  dot(x, y, r, "yellow"), dot(x, y, r * 0.62, "vermilion"),
  line(`M${x},${y - r} L${x},${y + r} M${x - r},${y} L${x + r},${y} M${x - r * 0.7},${y - r * 0.7} L${x + r * 0.7},${y + r * 0.7} M${x + r * 0.7},${y - r * 0.7} L${x - r * 0.7},${y + r * 0.7}`),
  dot(x, y, r * 0.27, "yellow"),
];
// the conch, its whorl
const conch = (x, y, s = 1) => [
  shape("M-4,-8 C2,-10 6,-5 5,1 C4,6 1,9 -2,9 L-3,6 C-6,5 -7,1 -6,-3 C-6,-6 -5,-7 -4,-8 Z", "shell", { x, y, s }),
  line("M-1,-4 Q3,-2 1,2 Q-1,4 -2,1", { x, y, s }),
];
// a lamp: the dish and its flame
const lamp = (x, y, s = 1) => [
  shape("M-6,0 L6,0 C5,3 -5,3 -6,0 Z", "ochre", { x, y, s }), poly([[x - 1.2 * s, y + 2.2 * s], [x + 1.2 * s, y + 2.2 * s], [x + 2.4 * s, y + 6 * s], [x - 2.4 * s, y + 6 * s]], "ochre"),
  flame(x, y - 0.4 * s, 9 * s),
];
// a heaven's vimāna: the dome on its plinth, the door, the finial and the pennant
const vimana = (x, y, w, fill = "yellow", flag = true) => [
  poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - w * 0.3], [x - w / 2, y - w * 0.3]], "vermilion"),
  shape(`M${-w * 0.42},0 C${-w * 0.42},${-w * 0.6} ${w * 0.42},${-w * 0.6} ${w * 0.42},0 Z`, fill, { x, y: y - w * 0.3 }),
  shape("M-2,0 L-2,-3.4 Q0,-5.6 2,-3.4 L2,0 Z", "indigo", { x, y }),
  line(`M${x},${y - w * 0.3 - w * 0.45} L${x},${y - w * 0.3 - w * 0.75}`), ...(flag ? [poly([[x, y - w * 1.05], [x + 4, y - w * 0.98], [x, y - w * 0.9]], "vermilion")] : []),
];
// a field of darkness, the whole square
const dark = (fill = "black") => poly([[4, 4], [44, 4], [44, 44], [4, 44]], fill);

// The families' bases (tools/vignettes.mjs writes each as cf-NAME, tools/contact-sheet.mjs too)
export const BASES = {
  // the passions and faults, on both cloths: a dark cloud, its sign set inside it
  cloud: () => [shape("M-16,6 C-21,6 -22,-2 -15,-3 C-16,-10 -7,-13 -3,-8 C0,-14 10,-13 11,-6 C18,-8 22,0 17,4 C20,9 13,12 9,10 L-12,10 C-17,11 -19,8 -16,6 Z", "indigo", { x: 24, y: 22 })],
  // the virtues of the 72 and the practice of the 84: the lamp on its shelf, the virtue's thing beside it
  lamp: () => [poly([[4, 38], [44, 38], [44, 41], [4, 41]], "ochre"), ...lamp(15, 31, 1)],
  // the 72's centre column of the seven realms, pale; the square's own tier is drawn over it
  tiers: () => [0, 1, 2, 3, 4, 5, 6].map(k => poly(tier(k), "paleochre")),
  // the 72's breaths: the body as a vessel, the wind's way drawn above it
  vessel: () => [pot(24, 33, 1.4, "ochre", "vermilion")],
  // the 72's objects of the senses: a ring holding the one thing
  ring: () => [dot(24, 24, 18, "paleochre"), dot(24, 24, 14.6, "cream")],
  // the 84's heavens: the vimāna, its pennant and sky the square's own
  vimana: () => vimana(24, 40, 24, "yellow", false),
  // the 84's fields of beings: points past counting, on the field's colour
  points: () => Array.from({ length: 42 }, (_, k) => dot(7 + ((k * 7) % 34) + (k % 3), 8 + Math.floor(k / 6) * 5.4 + (k % 2) * 1.6, 0.75, "shell", false)),
  // the 84's palaces of the bhavanapati gods: a low pavilion, the pair's signs above it
  pavilion: () => [poly([[7, 40], [41, 40], [41, 43], [7, 43]], "ochre"), ...[12, 24, 36].map(x => poly([[x - 1.2, 30], [x + 1.2, 30], [x + 1.2, 40], [x - 1.2, 40]], "shell")),
    shape("M-19,0 L19,0 L16,-4 C8,-7.4 -8,-7.4 -16,-4 Z", "vermilion", { x: 24, y: 30 }), dot(24, 22, 1.4, "yellow")],
  // the 84's hells: the dark cell and its doorway
  door: () => [dark("black"), poly([[14, 14], [34, 14], [34, 44], [14, 44]], "indigo"), poly([[18, 20], [30, 20], [30, 44], [18, 44]], "black")],
};

export default {
  "72": {
    // Birth: where every pawn begins. A bud rising out of the water.
    1: { draw: () => [sea(4, 32, 40, 12), line("M24,33 L24,22"), shape("M0,0 C-5,-3 -5,-10 0,-15 C5,-10 5,-3 0,0 Z", "vermilion", { x: 24, y: 23 }), shape("M0,0 C-2,-2.6 -2,-7 0,-10 C2,-7 2,-2.6 0,0 Z", "shell", { x: 24, y: 21 }), shape("M-9,0 Q-4,-4 0,0 Q-4,2 -9,0 Z", "malachite", { x: 23, y: 31 })] },
    // Hell: injury's snake ends here. Darkness, and a fire far off; no one in it.
    35: { draw: () => [dark("black"), line("M4,36 L44,36"), flame(13, 37, 17), flame(28, 37, 12), flame(37, 37, 9)] },
    // Gaṅgā, with Yamunā and Sarasvatī beside it: the river coming down, and its waves.
    49: { draw: () => [shape("M17,4 L27,4 C29,13 19,17 22,24 C24,29 30,30 32,33 L20,33 C14,30 10,26 11,21 C12,15 19,11 17,4 Z", "indigo"), line("M21,7 C22,11 16,14 16,19 M22,26 C23,28 26,29 27,31"), sea(4, 31, 40, 13), lotus(36, 30, 4.6)] },
    // Devotion: its ladder rises straight to Vaikuṇṭha. A lamp, and flowers laid before it.
    54: { draw: () => [...lamp(24, 30, 1.3), ...[[12, 40], [17, 41.4], [31, 41.4], [36, 40]].map(([x, y]) => dot(x, y, 2, "vermilion")), ...[[12, 40], [17, 41.4], [31, 41.4], [36, 40]].map(([x, y]) => dot(x, y, 0.7, "yellow", false))] },
    // Air, the element: the wind, and the grass bent under it.
    57: { draw: () => [line("M6,14 C14,10 22,18 30,14 C34,12 36,9 34,7 M8,22 C16,18 24,26 34,21 C38,19 40,16 37,15 M6,30 C12,27 18,32 24,29"), shape("M0,0 C2,-6 6,-10 12,-12 C8,-8 5,-4 3,0 Z", "malachite", { x: 26, y: 42 }), shape("M0,0 C2,-5 6,-8 11,-9 C7,-6 5,-3 3.4,0 Z", "malachite", { x: 32, y: 42 }), shape("M0,0 C1.6,-4 4.6,-7 9,-8 C6,-5 4,-2.6 3,0 Z", "malachite", { x: 20, y: 42 })] },
    // ---- families, sheet 1 ----
    // Anger, among the passions: the cloud, a bolt in it.
    3: { draw: () => [base("cloud"), bolt()] },
    // Desire: the cloud, Kāma's arrow of flowers across it.
    9: { draw: () => [base("cloud"), ...arrow(14, 28, 30, 18.6, "yellow"), dot(32, 17.4, 2.8, "vermilion"), dot(32, 17.4, 1, "yellow", false)] },
    // Austerity: the lamp, the ascetic's water pot and staff.
    10: { draw: () => [base("lamp"), pot(30, 30.2, 0.8, "shell", "vermilion"), poly([[38.4, 8], [40, 8], [40, 38], [38.4, 38]], "ochre")] },
    // Compassion: the lamp, and water set out in a bowl, a bird come to drink.
    17: { draw: () => [base("lamp"), bowl(32, 38.4, 13, "ochre"), shape("M-5,0 C-3,-1.4 3,-1.4 5,0 Z", "indigo", { x: 32, y: 32.8 }), ...perched(39.6, 28.6, { s: 0.7, face: -1 })] },
    // Earth, the realm: the first tier of the column of the seven, green.
    5: { draw: () => [base("tiers"), poly(tier(0), "malachite")] },
    // The nāgas' realm, beside the column: a serpent's coil.
    15: { draw: () => [base("tiers"), shape("M-5,0 C-7,-2 -6,-5 -2,-5 L3,-5 C6,-5 7,-2 5,0 Z", "malachite", { x: 9, y: 43 }),
      shape("M0,0 C-1,-4 -2,-8 0,-12 L2,-12 C1,-8 2,-4 3,0 Z", "malachite", { x: 8.4, y: 39 }), ...hood(9.6, 21, 19)] },
    // The equalizing breath: the wind drawn in from both sides to the middle.
    21: { draw: () => [base("vessel"), line("M5,13 C11,10 15,16 21,14 C24,13 24,10 21.6,10.6 M43,13 C37,10 33,16 27,14 C24,13 24,10 26.4,10.6 M9,20 C13,18 17,21 21,19.4 M39,20 C35,18 31,21 27,19.4")] },
    // The downward breath: the wind going down.
    39: { draw: () => [base("vessel"), line("M7,5 C13,5 13,11 17,14 C19,15.6 20.6,17 20.4,19.4 C20.2,21 18.4,21 18.6,19.6 M24,3 C20,7 28,10 24,15 C23,17 24,19.6 25,20.6 C26,21.6 27.4,20.4 26.4,19.4 M41,5 C35,5 35,11 31,14 C29,15.6 27.4,17 28.6,19.4")] },
    // Smell: the ring, a flower and its scent.
    33: { draw: () => [base("ring"), ...[0, 72, 144, 216, 288].map(d => dot(24 + 4.4 * Math.sin((d * Math.PI) / 180), 28 - 4.4 * Math.cos((d * Math.PI) / 180), 3, "shell")), dot(24, 28, 1.8, "yellow"), line("M20,19 C18,16 22,15 20,12 M24,18 C22,15 26,14 24,11 M28,19 C26,16 30,15 28,12")] },
    // Sound: the ring, a bell and its ringing.
    36: { draw: () => [base("ring"), line("M24,13.6 L24,16"), shape("M-6,5 C-6,-2 -4,-7 0,-7 C4,-7 6,-2 6,5 Z", "ochre", { x: 24, y: 23 }), dot(24, 30, 1.8, "ochre"), line("M13,18 C11,21 11,25 13,28 M35,18 C37,21 37,25 35,28")] },
    // Yamunā: the dark river, coming the other way.
    48: { draw: () => [...river("nila", { face: -1 }), lotus(12, 30, 4.6)] },
    // Goodness, the first of the three qualities: the white.
    70: { draw: () => guna("shell") },
    // Śiva's realm, beside Vaikuṇṭha: his emblems, the trident and the crescent.
    67: { draw: () => [poly([[23.1, 17], [24.9, 17], [24.9, 43], [23.1, 43]], "ochre"), shape("M-7,-10 C-7,-4 -4,0 0,0 C4,0 7,-4 7,-10 L5,-6 C4,-3 2,-2 1,-2 L1,-12 L0,-14 L-1,-12 L-1,-2 C-2,-2 -4,-3 -5,-6 Z", "gold", { x: 24, y: 19, s: 1.1 }), moon(37, 9, 3.6, "shell")] },
    // Human birth: the bud of birth opened.
    43: { draw: () => [sea(4, 32, 40, 12), line("M24,33 L24,27"), lotus(24, 27, 11, { fill: "vermilion", inner: "shell" })] },
    // Hidden, distant: the far horizon, a single point on it, the way going to it.
    65: { draw: () => [poly([[4, 22], [44, 22], [44, 44], [4, 44]], "palegreen"), line("M14,44 C18,36 26,32 23.4,22.6 M30,44 C30,36 28,30 24.6,22.6"), dot(24, 19.4, 1.7, "yellow")] },
    // Water, the element: a drop, and the water under it.
    53: { draw: () => [shape("M0,-10 C4,-4 6,0 6,3 C6,7 3,9 0,9 C-3,9 -6,7 -6,3 C-6,0 -4,-4 0,-10 Z", "indigo", { x: 24, y: 16 }), sea(4, 30, 40, 14)] },
    // ---- families, sheet 2 ----
    // Illusion: the rope taken for a snake (rajju-sarpa): a rope coiled in the cloud, and the shadow it throws a snake.
    2: { draw: () => [base("cloud"), ...[26.4, 23.6, 20.8].flatMap(y => [shape(oval(23, y, 7.4, 2.4), "ochre"), line(`M18,${y - 1.2} L19.4,${y + 1.4} M21.4,${y - 2} L22.8,${y + 2} M25,${y - 2} L26.4,${y + 1.8} M28.4,${y - 1.4} L29.4,${y + 1}`)]),
      shape("M30,21 C33,20.4 34,23 36,22.4 L36.4,24 C33.6,25 32.4,22.6 30.4,22.8 Z", "ochre"),
      shape("M6,42 C10,38.4 14,45 18,41.6 C22,38.4 25,44 29,41 L30.4,42.6 C26,46 22.6,40.4 19.4,43.2 C15,47 11,40.4 7.4,43.6 Z", "black"), ...hood(33, 37, 13, ["black", "nila", "black"])] },
    // Greed: the cloud, the pouch tied shut.
    4: { draw: () => [base("cloud"), ...pouch()] },
    // Bewilderment: the cloud, a whirl in it.
    6: { draw: () => [base("cloud"), whirl()] },
    // Intoxication, pride: the cloud, a cup tipped and spilling.
    7: { draw: () => [base("cloud"), shape("M-5,-4 L5,-4 C5,1 3,4 0,4 C-3,4 -5,1 -5,-4 Z", "ochre", { x: 22, y: 20, s: 1 }), poly([[20.6, 24], [23.4, 24], [24, 27], [20, 27]], "ochre"), dot(29.4, 16.4, 1.2, "vermilion", false), dot(31.6, 19.4, 1, "vermilion", false), dot(30, 22.6, 0.9, "vermilion", false)] },
    // The gandharvas' realm, beside the column: the celestial musicians' vīṇā.
    11: { draw: () => [base("tiers"), poly([[4.6, 33.4], [6, 34.6], [15.4, 12.6], [14, 11.4]], "ochre"), dot(7.6, 33.4, 4.2, "ochre"), dot(13.4, 16.4, 3, "ochre"), dot(15, 10.6, 1.1, "vermilion")] },
    // Between the worlds: the column, and the clouds beside it.
    13: { draw: () => [base("tiers"), puff(9, 19), puff(39, 13, 0.9), puff(41, 27, 0.8)] },
    // The atmosphere, the second realm: its tier, the sky's colour.
    14: { draw: () => [base("tiers"), poly(tier(1), TIER[1])] },
    // Touch: the ring, a feather.
    31: { draw: () => [base("ring"), shape("M0,-12 C5,-8 6,0 0,10 C-6,0 -5,-8 0,-12 Z", "ochre", { x: 24, y: 24 }), line("M24,13 L24,35 M24,20 L20.4,17 M24,24 L19.6,21 M24,20 L27.6,17 M24,24 L28.4,21")] },
    // Taste: the ring, a sweet on a leaf.
    34: { draw: () => [base("ring"), shape("M-11,0 C-6,-5 6,-5 11,0 C6,5 -6,5 -11,0 Z", "malachite", { x: 24, y: 29 }), dot(24, 24.6, 5.4, "yellow"), ...[[22, 23], [25.6, 22.4], [24.6, 26], [21.6, 26.2]].map(([x, y]) => dot(x, y, 0.6, "ochre", false))] },
    // The vital breath: the wind rising.
    38: { draw: () => [base("vessel"), line("M17,22 C13,18 21,15 17,11 C14,8 17,5 19.4,5.6 M24,23 C20,19 28,16 24,12 C21,9 24,4 26.6,4.6 M31,22 C27,18 35,15 31,11 C28,8 31,5 33.4,5.6")] },
    // The diffuse breath: the wind going all round the body.
    40: { draw: () => [base("vessel"), line("M8,40 C2,28 6,14 18,10 C28,7 40,12 42,24 C43.4,32 40,38 36,40 M36,40 L37.4,36.4 M36,40 L39.8,40.4 M13,36 C10,28 13,20 20,17")] },
    // The digestive fire: the fire within the vessel.
    42: { draw: () => [base("vessel"), flame(24, 23.4, 16)] },
    // Sarasvatī: the river that runs hidden, pale, its course in points.
    47: { draw: () => [...river("cloth", { crest: "indigo" }), ...[[21, 8], [19.6, 13], [17, 18], [17, 23], [21, 27.4], [26, 30]].map(([x, y]) => dot(x, y, 0.9, "indigo", false))] },
    // Activity, the second quality: the red.
    71: { draw: () => guna("vermilion") },
    // Inertia, the third: the black.
    72: { draw: () => guna("black") },
    // ---- families, sheet 3 ----
    // Jealousy: the cloud, a thorn in it.
    8: { draw: () => [base("cloud"), ...thorn()] },
    // Envy: the cloud, an ember burning in it.
    12: { draw: () => [base("cloud"), ...ember()] },
    // Hatred: the cloud, a cord snapped.
    16: { draw: () => [base("cloud"), ...snapped()] },
    // Heaven, the third realm: its tier, gold.
    23: { draw: () => [base("tiers"), poly(tier(2), TIER[2])] },
    // The realm of majesty, the fourth.
    32: { draw: () => [base("tiers"), poly(tier(3), TIER[3])] },
    // The realm of men, the fifth.
    41: { draw: () => [base("tiers"), poly(tier(4), TIER[4])] },
    // The realm of austerity, the sixth.
    50: { draw: () => [base("tiers"), poly(tier(5), TIER[5])] },
    // The realm of truth, the seventh, below Vaikuṇṭha.
    59: { draw: () => [base("tiers"), poly(tier(6), TIER[6])] },
    // Earth, the element: the ground's mound, grass on it.
    51: { draw: () => [shape("M-20,10 C-14,-4 -6,-10 0,-10 C6,-10 14,-4 20,10 Z", "ochre", { x: 24, y: 32 }), shape("M0,0 C1,-3 3,-5 6,-6 C4,-4 3,-2 2.4,0 Z", "malachite", { x: 22, y: 22.4 }), shape("M0,0 C-1,-3 -3,-5 -6,-6 C-4,-4 -3,-2 -2.4,0 Z", "malachite", { x: 26, y: 22.4 })] },
    // Space, the element: the night sky, and the stars in it.
    56: { draw: () => [dot(24, 24, 18, "nila"), ...[[16, 15], [30, 12], [35, 24], [19, 31], [28, 34], [24, 22]].map(([x, y], k) => dot(x, y, k === 5 ? 1.6 : 1, "shell", false))] },
    // Fire, the element.
    58: { draw: () => [flame(24, 42, 34)] },
    // Primordial matter: the elements unparted, earth, water, fire and wind in one.
    64: { draw: () => [dot(24, 24, 18, "paleochre"), line("M24,6 L24,42 M6,24 L42,24"), shape("M-8,4 C-6,-2 -2,-4 0,-4 C2,-4 6,-2 8,4 Z", "ochre", { x: 15, y: 33 }), shape("M0,-5 C2,-2 3,0 3,1.6 C3,3.6 1.6,4.6 0,4.6 C-1.6,4.6 -3,3.6 -3,1.6 C-3,0 -2,-2 0,-5 Z", "indigo", { x: 33, y: 32 }), flame(15, 20, 10), line("M28,15 C31,13 34,17 37,15 M29,19 C32,17 35,21 38,19")] },
    // Brahmā's realm, beside Vaikuṇṭha: his emblems, the haṃsa he rides and his water pot.
    69: { draw: () => [sea(4, 34, 40, 10), shape("M-9,2 C-9,-2 -4,-3 2,-2 L5,-9 C6,-12 10,-12 10.6,-9.4 L8.4,-8.6 C6.6,-6 5.6,-2 8,1 C6,5 -6,5 -9,2 Z", "shell", { x: 20, y: 31 }), poly([[30.6, 21.6], [33.4, 22.2], [30.4, 23.4]], "yellow"), pot(38, 17, 0.8, "ochre", "vermilion")] },
    // ---- families, sheet 4 ----
    // Joy: the lamp, a garland hung over it.
    18: { draw: () => [base("lamp"), cline("M10,10 C18,22 32,22 40,10", "malachite"), ...Array.from({ length: 9 }, (_, k) => { const t = k / 8, x = 10 + 30 * t, y = 10 + 12 * 4 * t * (1 - t) * 0.75; return dot(x, y, 1.7, k % 2 ? "yellow" : "vermilion"); })] },
    // The discipline of action: the lamp, a sheaf of grain gathered by the work.
    19: { draw: () => [base("lamp"), cline("M33,38 L33,16 M33,38 L28.4,17 M33,38 L37.6,17 M33,38 L30.4,16 M33,38 L35.6,16", "malachite"), ...[[28.4, 15.4], [30.6, 13.6], [33, 13], [35.4, 13.6], [37.6, 15.4]].map(([x, y]) => shape(oval(x, y, 1.4, 3), "yellow")), poly([[30.4, 29], [35.6, 29], [35.6, 31.4], [30.4, 31.4]], "vermilion")] },
    // Charity: the lamp, grain heaped to give, and coins.
    20: { draw: () => [base("lamp"), shape("M-9,0 C-7,-6 -3,-9 0,-9 C3,-9 7,-6 9,0 Z", "yellow", { x: 33, y: 38 }), ...[[26.4, 35.6], [40, 35.6], [33, 26.4]].map(([x, y]) => dot(x, y, 1.8, "gold"))] },
    // Religion: the lamp, the book on its stand.
    22: { draw: () => [base("lamp"), poly([[26, 38], [29, 32], [37, 32], [40, 38]], "ochre"), poly([[25, 30], [41, 30], [41, 33], [25, 33]], "shell"), poly([[31, 29.4], [35, 29.4], [35, 33.6], [31, 33.6]], "vermilion")] },
    // Good company: the lamp, and a second lamp lit from it.
    25: { draw: () => [base("lamp"), ...lamp(32, 31, 1)] },
    // The highest truth: the lamp, and the sun.
    27: { draw: () => [base("lamp"), sun(33, 17, 5.4, { rays: 12 })] },
    // Righteousness: the lamp, and the scales level.
    28: { draw: () => [base("lamp"), poly([[32.2, 14], [33.8, 14], [33.8, 38], [32.2, 38]], "ochre"), line("M24,16 L42,16 M26,16 L24,25 M26,16 L28,25 M40,16 L38,25 M40,16 L42,25"), shape("M-4.4,0 L4.4,0 C3.6,2.4 -3.6,2.4 -4.4,0 Z", "ochre", { x: 26, y: 25 }), shape("M-4.4,0 L4.4,0 C3.6,2.4 -3.6,2.4 -4.4,0 Z", "ochre", { x: 40, y: 25 })] },
    // The best course: the lamp, and a bird rising.
    30: { draw: () => [base("lamp"), shape("M-9,2 C-5,-2 -2,-1 0,1 C2,-4 6,-7 10,-6 C6,-4 3,0 2,4 C-1,2 -5,1 -9,2 Z", "shell", { x: 32, y: 16 })] },
    // Bad company: the cloud, and a crow on its edge.
    24: { draw: () => [base("cloud"), ...crow(30, 40, { s: 1.1 })] },
    // Sorrow: the cloud, and its rain.
    26: { draw: () => [base("cloud"), ...[[14, 36], [20, 40], [26, 36], [32, 40], [37, 35]].map(([x, y]) => shape("M0,-3 C1.4,-1 2,0 2,1 C2,2.4 1,3 0,3 C-1,3 -2,2.4 -2,1 C-2,0 -1.4,-1 0,-3 Z", "indigo", { x, y }))] },
    // Unrighteousness: the virtues' lamp fallen from its shelf, its oil spilt on the ground; the shelf left empty.
    29: { draw: () => [poly([[4, 22], [44, 22], [44, 25], [4, 25]], "ochre"), line("M10,25 L10,30 M38,25 L38,30"), poly([[4, 41], [44, 41], [44, 44], [4, 44]], "paleochre"), ...tipped(16, 38)] },
    // Ignorance: the cloud, a lamp in it gone out, its smoke.
    44: { draw: () => [base("cloud"), shape("M-6,0 L6,0 C5,3 -5,3 -6,0 Z", "ochre", { x: 24, y: 25 }), cline("M24,23 C22,20 26,18 24,15 C22.6,13 24,11 25,10.6", "shell")] },
    // ---- families, sheet 5 ----
    // Knowledge: the lamp, a palm-leaf book.
    37: { draw: () => [base("lamp"), poly([[25, 31], [43, 31], [43, 35], [25, 35]], "cloth"), line("M27,32.6 L41,32.6 M27,34 L37,34"), dot(34, 33, 0.8, "black", false)] },
    // Right learning: the lamp, a slate with its letters.
    45: { draw: () => [base("lamp"), poly([[26, 20], [40, 20], [40, 36], [26, 36]], "beetle"), poly([[31.6, 36], [34.4, 36], [34.4, 38], [31.6, 38]], "ochre"), cline("M28.4,24 C30,22.4 31,25.4 32.4,24 M34,24 L37.6,24 M28.4,29 L33,29 C34,28 35,30 37.4,28.4", "shell")] },
    // Discrimination: the lamp, and the haṃsa that parts milk from water.
    46: { draw: () => [base("lamp"), ...hamsa(32, 34)] },
    // Good intellect: the lamp, a lotus open.
    60: { draw: () => [base("lamp"), lotus(33, 34, 7)] },
    // Happiness: the lamp, the full pot, its leaves and the coconut.
    62: { draw: () => [base("lamp"), pot(33, 30.4, 0.8, "ochre", "vermilion"), ...[-1, 1].map(f => shape("M0,0 C2,-2 5,-2.6 7,-2 C5,0 2,0.6 0,0 Z", "malachite", { x: 33, y: 23.6, face: f })), dot(33, 21.4, 2.6, "lac")] },
    // Bliss, the realm beside the gods': the column, and a lotus opened above it.
    66: { draw: () => [base("tiers"), lotus(39, 12, 6, { fill: "vermilion", inner: "shell" })] },
    // Injury: the cloud, a knife in it.
    52: { draw: () => [base("cloud"), ...knife()] },
    // Egoity: the cloud, a crown in it.
    55: { draw: () => [base("cloud"), crown(24, 26, 12, "yellow")] },
    // Foolishness: the cloud, a pot cracked and leaking.
    61: { draw: () => [base("cloud"), pot(24, 22, 0.7, "ochre", "vermilion"), line("M22,17 L24.6,20 L22.6,23 L25,26"), dot(26, 29.4, 0.9, "shell", false)] },
    // Darkness: the cloud, the sun eclipsed in it.
    63: { draw: () => [base("cloud"), dot(24, 21, 6, "yellow"), dot(25.6, 20.2, 5.6, "black")] },
    // Vaikuṇṭha, the goal: Viṣṇu's discus and conch, his emblems and never his likeness.
    68: { draw: () => [lotus(24, 39, 9, { fill: "vermilion", inner: "shell" }), ...discus(15, 20, 8), ...conch(34, 20, 1.15)] },
  },
  "84": {
    // The basic lifeforms (nitya nigoda), time without end: a dark field of beings past counting.
    1: { draw: () => [dark("indigo"), ...Array.from({ length: 42 }, (_, k) => dot(7 + ((k * 7) % 34) + (k % 3), 8 + Math.floor(k / 6) * 5.4 + (k % 2) * 1.6, 0.75, "shell", false))] },
    // Desire, among the hell-beings: the gateway to the hells. A dark cell, its door open on nothing, a fire far off.
    2: { draw: () => [dark("black"), poly([[14, 14], [34, 14], [34, 44], [14, 44]], "indigo"), poly([[18, 20], [30, 20], [30, 44], [18, 44]], "black"), line("M34,38 L44,38"), flame(39.5, 38, 10)] },
    // The eightfold worship of the Jinas: water, sandalwood, flowers, incense, a lamp, rice, fruit, sweets. Four of the
    // offerings set out, and no image they are set before.
    38: { draw: () => [poly([[4, 36], [44, 36], [44, 40], [4, 40]], "ochre"), pot(11, 28.4, 0.75, "shell", "vermilion"), ...lamp(24, 31, 0.8), shape("M-4.6,0 C-4,-4 4,-4 4.6,0 Z", "shell", { x: 35.6, y: 36 }), dot(41, 33.4, 2, "vermilion"), dot(41, 33.4, 0.7, "yellow", false)] },
    // ---- families, sheet 1 ----
    // Greed, among the passions: the cloud, a pouch tied shut in it.
    4: { draw: () => [base("cloud"), ...pouch()] },
    // Paramādhāmī gods, who torment the hell-beings: the cell's door barred, a fire far off; no one in it.
    6: { draw: () => [base("door"), ...[20.6, 24, 27.4].map(x => poly([[x - 0.8, 20], [x + 0.8, 20], [x + 0.8, 44], [x - 0.8, 44]], "ochre")), line("M34,38 L44,38"), flame(39.5, 38, 10)] },
    // Earth-bodies: the field of beings, earth-coloured.
    22: { draw: () => [dark("gold"), base("points")] },
    // Two-sensed beings: shells, scattered.
    34: { draw: () => [dark("paleochre"), ...[[11, 11], [26, 9], [38, 16], [17, 24], [31, 28], [10, 37], [23, 38], [38, 38]].flatMap(([x, y], k) => [
      shape("M0,-4.4 C3,-4.4 3.6,-1 3.6,0 C3.6,1 3,4.4 0,4.4 C-3,4.4 -3.6,1 -3.6,0 C-3.6,-1 -3,-4.4 0,-4.4 Z", "shell", { x, y }), line(`M${x},${y - 3} L${x},${y + 3}`)])] },
    // Twelve austerities: the lamp, and the twelve, six and six.
    47: { draw: () => [base("lamp"), ...Array.from({ length: 12 }, (_, k) => dot(26 + (k % 6) * 3.2, 27 + Math.floor(k / 6) * 5, 1.2, "gold"))] },
    // Karma stirred up: the soul's dust shaken loose before its time.
    31: { draw: () => [...soul(Array.from({ length: 12 }, (_, k) => [24 + Math.sqrt(k + 1) * 3.2 * Math.cos(k * 2.4), 31 + Math.sqrt(k + 1) * 3.2 * Math.sin(k * 2.4)]), 31, 12.4),
      line("M18,17 C14,13 18,8 23,9.6 C27,11 26,15 23,14.4 C21,14 21.4,12 23,12.2"), ...[[16, 15], [19, 11], [26, 9], [29, 13], [30, 7], [21, 5.6], [33, 10]].map(([x, y]) => dot(x, y, 0.95, "black", false))] },
    // Vidyut and Agni gods: their palace, the lightning and the fire over it.
    14: { draw: () => [base("pavilion"), poly([[13, 5], [19, 5], [16, 11], [20, 11], [11, 21], [13.6, 14], [10, 14]], "yellow"), flame(32, 20, 12)] },
    // The blue stain.
    39: { draw: () => stain("indigo") },
    // Saudharma, the first heaven: the vimāna, under the sun.
    57: { draw: () => [base("vimana"), pennant("vermilion"), sun(10, 10, 3.4, { rays: 10 })] },
    // Bhadra, the first of the neck heavens: the vimāna on the neck's ornament.
    77: { draw: () => [base("vimana"), pennant("yellow"), ...Array.from({ length: 9 }, (_, k) => dot(8 + k * 4, 42.6 + 2.6 * Math.sin((k * Math.PI) / 8), 1.3, "gold"))] },
    // Vaijayanta, an unsurpassed heaven: the vimāna crowned, as the board crowns its square.
    86: { draw: () => [base("vimana"), pennant("malachite"), crown(24, 23, 9, "gold")] },
    // ---- families, sheet 2 ----
    // Anger: the cloud, the bolt.
    3: { draw: () => [base("cloud"), bolt()] },
    // Delusion born of ignorance: the cloud, the whirl.
    5: { draw: () => [base("cloud"), whirl()] },
    // Water-bodies: the field of beings, in water.
    23: { draw: () => [dark("nila"), base("points"), cline("M6,18 C10,16 14,20 18,18 C22,16 26,20 30,18 C34,16 38,20 42,18 M6,32 C10,30 14,34 18,32 C22,30 26,34 30,32 C34,30 38,34 42,32", "indigo")] },
    // Fire-bodies: the field of beings, in fire.
    25: { draw: () => [dark("vermilion"), base("points")] },
    // Wind-bodies: the field of beings, in the wind.
    26: { draw: () => [dark("beetle"), base("points"), cline("M6,14 C14,10 22,18 30,14 C34,12 36,9 34,7 M8,30 C16,26 24,34 34,29 C38,27 40,24 37,23", "palegreen")] },
    // The grey stain, the dove's: the disc stippled to grey.
    40: { draw: () => [dot(24, 24, 18, "shell"), dot(24, 24, 12, "shell"), ...Array.from({ length: 60 }, (_, k) => [24 + Math.sqrt(k + 0.5) * 1.5 * Math.cos(k * 2.4), 24 + Math.sqrt(k + 0.5) * 1.5 * Math.sin(k * 2.4)]).map(([x, y]) => dot(x, y, 0.62, "black", false))] },
    // The red stain, the fiery.
    41: { draw: () => stain("vermilion") },
    // The lotus-coloured stain: the red disc opened as a lotus.
    46: { draw: () => [...stain("vermilion"), ...[0, 60, 120, 180, 240, 300].map(d => shape(turn("M0,0 C2.4,-2.4 2.4,-6 0,-8.6 C-2.4,-6 -2.4,-2.4 0,0 Z", d, 24, 24), "shell")), dot(24, 24, 1.8, "yellow")] },
    // Aiśāna, the second heaven: the vimāna under the moon.
    59: { draw: () => [base("vimana"), pennant("indigo"), moon(10, 10, 3.6, "shell")] },
    // Sānatkumāra, the third: the vimāna under the stars.
    62: { draw: () => [base("vimana"), pennant("yellow"), ...[[8, 8], [13, 13], [40, 9], [37, 15]].map(([x, y]) => dot(x, y, 1.3, "gold"))] },
    // ---- families, sheet 3 ----
    // Knowledge, the mixed stage: the lamp, and right and wrong view together, a disc half light and half dark.
    7: { draw: () => [base("lamp"), dot(32, 29, 6.4, "shell"), shape("M0,-6.4 C3.6,-6.4 6.4,-3.6 6.4,0 C6.4,3.6 3.6,6.4 0,6.4 Z", "black", { x: 32, y: 29 })] },
    // Jealousy: the cloud, the thorn.
    8: { draw: () => [base("cloud"), ...thorn()] },
    // Pride that binds: the cloud, a peacock's feather in it.
    9: { draw: () => [base("cloud"), ...feather()] },
    // Deceit: the cloud, a cord in a knot.
    10: { draw: () => [base("cloud"), knot()] },
    // The specifiable souls: points come up out of the basic lifeforms' dark.
    11: { draw: () => [dark("paleochre"), poly([[4, 26], [44, 26], [44, 44], [4, 44]], "indigo"), base("points"), ...[[12, 20], [20, 14], [27, 19], [34, 11], [39, 18], [16, 8]].map(([x, y]) => dot(x, y, 0.9, "indigo", false))] },
    // The other basic lifeforms, the passing ones: their field, dark red.
    21: { draw: () => [dark("lac"), base("points")] },
    // Plant-bodies: the field of beings, green, a leaf among them.
    27: { draw: () => [dark("malachite"), base("points"), ...[[14, 16], [32, 30]].map(([x, y]) => shape("M-5,0 C-3,-3.6 3,-3.6 5,0 C3,3.6 -3,3.6 -5,0 Z", "palegreen", { x, y }))] },
    // Three-sensed beings: ants, in a line.
    35: { draw: () => [dark("paleochre"), ...[[10, 34], [17, 29], [24, 25], [31, 20], [38, 15], [14, 14]].flatMap(([x, y]) => [line(`M${x - 2},${y - 2} L${x + 2},${y + 2} M${x - 2},${y + 2} L${x + 2},${y - 2}`), dot(x - 2.6, y, 1, "black", false), dot(x, y, 1.2, "black", false), dot(x + 3, y, 1.6, "black", false)])] },
    // Four-sensed beings: bees.
    36: { draw: () => [dark("paleochre"), ...[[12, 14], [30, 11], [22, 24], [37, 27], [13, 35], [28, 38]].flatMap(([x, y]) => [shape(oval(x - 1, y - 2.6, 2, 1.6), "shell"), shape(oval(x + 1.4, y - 2.6, 2, 1.6), "shell"), shape(oval(x, y, 3.4, 2.2), "yellow"), line(`M${x},${y - 2.2} L${x},${y + 2.2}`)])] },
    // Māhendra, the fourth heaven: the vimāna under Indra's bow.
    63: { draw: () => [cline("M6,24 C8,8 40,8 42,24", "vermilion"), cline("M8.4,24 C10,11 38,11 39.6,24", "yellow"), cline("M10.8,24 C12.4,14 35.6,14 37.2,24", "malachite"), base("vimana"), pennant("shell")] },
    // Brahma and Lāntaka, the fifth and sixth: two vimānas.
    64: { draw: () => [...vimana(15, 40, 16, "yellow"), ...vimana(33, 40, 16, "gold-hi")] },
    // Śukra, the seventh: the vimāna under the bright planet.
    69: { draw: () => [base("vimana"), pennant("vermilion"), shape("M0,-5 L1.2,-1.2 L5,0 L1.2,1.2 L0,5 L-1.2,1.2 L-5,0 L-1.2,-1.2 Z", "shell", { x: 10, y: 10 })] },
    // ---- families, sheet 4 ----
    // Asura and Suvarṇa gods: their palace, the dark disc and the golden.
    12: { draw: () => [base("pavilion"), dot(16, 13, 5, "indigo"), dot(32, 13, 5, "gold")] },
    // The ten groups of palace gods: ten roofs, two rows of five.
    15: { draw: () => [poly([[4, 41], [44, 41], [44, 44], [4, 44]], "ochre"), ...Array.from({ length: 10 }, (_, k) => [8 + (k % 5) * 8, 20 + Math.floor(k / 5) * 14]).flatMap(([x, y]) => [poly([[x - 1, y], [x + 1, y], [x + 1, y + 7], [x - 1, y + 7]], "shell"), shape("M-4,0 L4,0 L3.2,-2 C1.4,-3.4 -1.4,-3.4 -3.2,-2 Z", "vermilion", { x, y })])] },
    // Dvīpa and Udadhi gods: their palace, an island in the ocean.
    16: { draw: () => [base("pavilion"), sea(4, 12, 40, 9), shape("M-7,0 C-5,-4 -2,-5.4 0,-5.4 C2,-5.4 5,-4 7,0 Z", "ochre", { x: 24, y: 13 }), shape("M0,0 C1,-2 2.4,-3.6 4.4,-4 C3,-2.6 2,-1.4 1.4,0 Z", "malachite", { x: 23, y: 8.4 })] },
    // Diśā and Stanita gods: their palace, the four quarters and the thundercloud.
    18: { draw: () => [base("pavilion"), line("M14,6 L14,18 M8,12 L20,12"), ...[[14, 5.4], [14, 18.6], [7.4, 12], [20.6, 12]].map(([x, y]) => dot(x, y, 1.2, "gold")), puff(33, 13, 1.3, "indigo")] },
    // Vāyu and Nāga gods: their palace, the wind and the serpent's hood.
    19: { draw: () => [base("pavilion"), line("M6,8 C10,6 14,10 18,8 C20,7 21,5 19.6,4.4 M7,14 C11,12 15,16 20,13.6"), ...hood(33, 9, 13)] },
    // Suppressing karma: the soul's dust settled, as mud settles in still water.
    20: { draw: () => [...soul(settled), line("M10,30 L38,30")] },
    // Auspicious karma: the soul's dust, golden.
    28: { draw: () => [dot(24, 24, 15, "shell"), ...even.map(([x, y]) => dot(x, y, 1.1, "gold", false))] },
    // Karma arising in its own time: the dust going out from the soul.
    30: { draw: () => soul(leaving) },
    // Karma abiding: the dust held in the soul, still.
    32: { draw: () => soul(even) },
    // Stopping the influx: the soul walled, the dust kept outside.
    37: { draw: () => [dot(24, 24, 15.6, "ochre"), ...soul([], 24, 12.6), ...Array.from({ length: 14 }, (_, k) => [24 + 19.4 * Math.cos((k * Math.PI) / 7), 24 + 19.4 * Math.sin((k * Math.PI) / 7)]).map(([x, y]) => dot(x, y, 0.95, "black", false))] },
    // Sahasrāra, the eighth heaven: the vimāna under the thousand-rayed sun.
    70: { draw: () => [base("vimana"), pennant("malachite"), sun(10, 10, 3, { rays: 20 })] },
    // Āraṇa, the eleventh: the vimāna in the clouds.
    73: { draw: () => [base("vimana"), pennant("lac"), puff(9, 12), puff(39, 18, 0.8)] },
    // Acyuta, the twelfth and last of the kalpa heavens: the vimāna under three stars.
    74: { draw: () => [base("vimana"), pennant("gold-hi"), ...[[10, 8], [17, 5], [38, 8]].map(([x, y]) => shape("M0,-3 L0.8,-0.8 L3,0 L0.8,0.8 L0,3 L-0.8,0.8 L-3,0 L-0.8,-0.8 Z", "shell", { x, y }))] },
    // ---- families, sheet 6 ----
    // Non-restraint: the cloud, a horse with no rein.
    60: { draw: () => [base("cloud"), ...horse(24, 28, { s: 0.6 })] },
    // Egoity of inertia: the cloud, a crown in black, edged light to stand off the cloud.
    67: { draw: () => [base("cloud"), crown(24, 26, 12, "black"), cline(place("M-4.2,-0.6 L-4.2,-2.2 L-2.8,-0.9 L0,-4 L2.8,-0.9 L4.2,-2.2 L4.2,-0.6 Z", { x: 24, y: 26, s: 1.2 }), "shell")] },
    // Egoity of activity: the cloud, a crown in red.
    75: { draw: () => [base("cloud"), crown(24, 26, 12, "vermilion")] },
    // Deluding karma, the strongest: the cloud, the whirl, the dust caught in it.
    76: { draw: () => [base("cloud"), whirl(), ...[[17, 16], [31, 15], [16, 27], [32, 27], [28, 12]].map(([x, y]) => dot(x, y, 0.95, "shell", false))] },
    // The plane of the stationary beings: the five fields side by side, earth, water, fire, wind and plant.
    24: { draw: () => [...["gold", "nila", "vermilion", "beetle", "malachite"].map((c, k) => poly([[4 + k * 8, 4], [12 + k * 8, 4], [12 + k * 8, 44], [4 + k * 8, 44]], c)), base("points")] },
    // The plane of fewer senses: a shell, an ant, a bee.
    33: { draw: () => [dark("paleochre"), shape("M0,-4.4 C3,-4.4 3.6,-1 3.6,0 C3.6,1 3,4.4 0,4.4 C-3,4.4 -3.6,1 -3.6,0 C-3.6,-1 -3,-4.4 0,-4.4 Z", "shell", { x: 12, y: 30 }), line("M12,27 L12,33"), line("M20,24 L24,28 M20,28 L24,24"), dot(19.4, 26, 1, "black", false), dot(22, 26, 1.2, "black", false), dot(25, 26, 1.6, "black", false), shape(oval(34, 15.4, 2, 1.6), "shell"), shape(oval(36.4, 15.4, 2, 1.6), "shell"), shape(oval(35, 18, 3.4, 2.2), "yellow"), line("M35,15.8 L35,20.2")] },
    // The plane of plants and animals: the field, a deer in it.
    42: { draw: () => [dark("malachite"), base("points"), ...deer(24, 36, { s: 0.8 })] },
    // Plants and animals turned to good: the green field, one point rising gold out of it.
    43: { draw: () => [dark("malachite"), base("points"), dot(24, 10, 2.4, "gold"), cline("M24,30 C22,24 26,18 24,13", "gold-hi")] },
    // The plane of humans: the field, and a mendicant's bowl.
    51: { draw: () => [dark("paleochre"), ...Array.from({ length: 30 }, (_, k) => dot(7 + ((k * 7) % 34) + (k % 3), 8 + Math.floor(k / 6) * 5.4 + (k % 2) * 1.6, 0.75, "black", false)), bowl(24, 42, 16, "ochre")] },
    // The gods outside, left: the heavens' vimāna, and the sun and moon, the luminaries.
    56: { draw: () => [base("vimana"), pennant("vermilion"), sun(9, 10, 3, { rays: 10 }), moon(39, 10, 3.4, "shell")] },
    // The plane of the heavens, row 7: four vimānas.
    61: { draw: () => row4("yellow", "gold-hi") },
    // The gods outside, right: the palace gods' pavilion, and the stars.
    66: { draw: () => [base("pavilion"), ...[[8, 8], [16, 14], [32, 6], [40, 13]].map(([x, y]) => star(x, y))] },
    // The plane of the heavens, row 8: four vimānas.
    71: { draw: () => row4("gold-hi", "shell") },
    // Ānata and Prāṇata, the ninth and tenth: two vimānas.
    72: { draw: () => pair("gold-hi", "yellow") },
    // Subhadra, the second neck heaven.
    78: { draw: () => [base("vimana"), pennant("vermilion"), ...beads(), moon(10, 10, 3.4, "shell")] },
    // Sujāta, the third.
    79: { draw: () => [base("vimana"), pennant("indigo"), ...beads(), sun(10, 10, 3, { rays: 10 })] },
    // Sumanas and Priyadarśana, the fourth and fifth: two vimānas on the ornament.
    80: { draw: () => [...vimana(15, 39, 15, "yellow"), ...vimana(33, 39, 15, "gold-hi"), ...beads()] },
    // Sudarśana, the sixth.
    81: { draw: () => [base("vimana"), pennant("malachite"), ...beads(), ...[[8, 8], [13, 13], [40, 9]].map(([x, y]) => dot(x, y, 1.3, "gold"))] },
    // Amogha, the seventh.
    82: { draw: () => [base("vimana"), pennant("lac"), ...beads(), puff(10, 11)] },
    // Suprabandha, the eighth.
    83: { draw: () => [base("vimana"), pennant("gold-hi"), ...beads(), star(10, 10, 4)] },
    // Yaśodhara, the ninth and last.
    84: { draw: () => [base("vimana"), pennant("shell"), ...beads(), cline("M6,22 C8,8 40,8 42,22", "vermilion"), cline("M8.6,22 C10.4,11 37.6,11 39.4,22", "yellow")] },
    // Aparājita, an unsurpassed heaven: the vimāna crowned, the moon.
    87: { draw: () => [base("vimana"), pennant("indigo"), crown(24, 23, 9, "gold"), moon(10, 10, 3.4, "shell")] },
    // Jayanta, an unsurpassed heaven: crowned, the sun.
    88: { draw: () => [base("vimana"), pennant("vermilion"), crown(24, 23, 9, "gold"), sun(10, 10, 3, { rays: 10 })] },
    // Sarvārthasiddhi, the highest: crowned, and a ring of light round it.
    89: { draw: () => [...Array.from({ length: 13 }, (_, k) => dot(24 + 18 * Math.cos(Math.PI + (k * Math.PI) / 12), 33 + 18 * Math.sin(Math.PI + (k * Math.PI) / 12), 1.1, "gold")), base("vimana"), pennant("gold-hi"), crown(24, 23, 9, "gold")] },
    // ---- families, sheet 5 ----
    // Envy of another soul: the cloud, the ember.
    13: { draw: () => [base("cloud"), ...ember()] },
    // The five false views: the cloud, five ways pointing apart.
    17: { draw: () => [base("cloud"), ...[0, 72, 144, 216, 288].flatMap(d => { const a = ((d - 90) * Math.PI) / 180; return arrow(24 + 4 * Math.cos(a), 21 + 3.4 * Math.sin(a), 24 + 11 * Math.cos(a), 21 + 8.6 * Math.sin(a)); })] },
    // Loyalty to dharma: the lamp, the banner beside it.
    29: { draw: () => [base("lamp"), poly([[32.2, 10], [33.8, 10], [33.8, 38], [32.2, 38]], "ochre"), poly([[33.8, 11], [42, 13.6], [33.8, 17]], "vermilion")] },
    // Virtuous meditation: the lamp, a rosary.
    44: { draw: () => [base("lamp"), ...Array.from({ length: 14 }, (_, k) => dot(33 + 6.4 * Math.cos((k * Math.PI) / 7), 28 + 6.4 * Math.sin((k * Math.PI) / 7), 1.2, "lac")), dot(33, 35.4, 1.8, "gold")] },
    // The seven vices: the cloud, seven marks in a ring.
    48: { draw: () => [base("cloud"), ...Array.from({ length: 7 }, (_, k) => dot(24 + 6 * Math.cos((k * 2 * Math.PI) / 7 - Math.PI / 2), 21 + 5 * Math.sin((k * 2 * Math.PI) / 7 - Math.PI / 2), 1.6, "vermilion"))] },
    // The subsidiary vows: the lamp, the three vows and the five meditations.
    49: { draw: () => [base("lamp"), ...counts([[3, "gold"], [5, "shell"]])] },
    // The five great vows: the lamp, five flames.
    50: { draw: () => [base("lamp"), ...flames(5)] },
    // Injuring another: the cloud, the knife.
    52: { draw: () => [base("cloud"), ...knife()] },
    // Discipline and chastity: the lamp, the four vows and the nine.
    53: { draw: () => [base("lamp"), ...counts([[4, "gold"], [9, "shell"]])] },
    // The five kinds of charity: the lamp, grain heaped and five coins.
    54: { draw: () => [base("lamp"), shape("M-9,0 C-7,-6 -3,-9 0,-9 C3,-9 7,-6 9,0 Z", "yellow", { x: 33, y: 38 }), ...[[25.6, 35.6], [40.4, 35.6], [28, 27.4], [38, 27.4], [33, 24.4]].map(([x, y]) => dot(x, y, 1.6, "gold"))] },
    // The twelve contemplations: the lamp, the twelve and the ten.
    55: { draw: () => [base("lamp"), ...counts([[12, "gold"], [10, "shell"]])] },
    // Not keeping vows: the cloud, a string of beads broken.
    58: { draw: () => [base("cloud"), ...broken()] },
    // Discrimination: the lamp, and the haṃsa.
    65: { draw: () => [base("lamp"), ...hamsa(32, 34)] },
    // Desired attainments, for a sāgara: the lamp, and the ocean that measures the time.
    68: { draw: () => [base("lamp"), sea(25, 26, 18, 8)] },
    // The black stain (kṛṣṇa leśyā), the darkest of the six colours a soul takes from its karma.
    45: { draw: () => [dot(24, 24, 18, "shell"), dot(24, 24, 12, "black")] },
    // Vijaya, the first of the five unsurpassed heavens, in the cosmic man's face: a vimāna.
    85: { draw: () => [moon(10, 10, 3, "shell"), ...vimana(24, 40, 24)] },
    // Siddhaśilā: the crystal crescent at the top of the world, and the liberated above it. No figure, no niche.
    90: { draw: () => [shape("M-19,0 Q0,-17 19,0 Q0,-6 -19,0 Z", "shell", { x: 24, y: 36 }), ...[[10, 21], [17, 18.4], [24, 17.4], [31, 18.4], [38, 21]].map(([x, y]) => dot(x, y, 1.6, "gold")), dot(24, 9, 2.2, "gold")] },
  },
};
