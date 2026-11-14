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
import { dot, poly, shape, line, lotus, flame, moon, pot, sea, sun, bowl, crown, perched, hex } from "../tools/vignette-parts.mjs";

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
// an arrow, filled, from (x1, y1) to (x2, y2)
const arrow = (x1, y1, x2, y2, fill = "yellow") => {
  const a = Math.atan2(y2 - y1, x2 - x1), c = Math.cos(a), s = Math.sin(a), w = 1.1, h = 3.4;
  const bx = x2 - c * h, by = y2 - s * h;
  return [poly([[x1 - s * w, y1 + c * w], [bx - s * w, by + c * w], [bx + s * w, by - c * w], [x1 + s * w, y1 - c * w]], fill),
    poly([[x2, y2], [bx - s * 2.8, by + c * 2.8], [bx + s * 2.8, by - c * 2.8]], fill)];
};
// the 72's centre column of realms: tier k (0, earth, to 6, truth) as a path
const tier = k => [[24 - 17 + 2 * k, 42 - 4.8 * k], [24 + 17 - 2 * k, 42 - 4.8 * k], [24 + 17 - 2 * k, 37.2 - 4.8 * k], [24 - 17 + 2 * k, 37.2 - 4.8 * k]];
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
    // The black stain (kṛṣṇa leśyā), the darkest of the six colours a soul takes from its karma.
    45: { draw: () => [dot(24, 24, 18, "shell"), dot(24, 24, 12, "black")] },
    // Vijaya, the first of the five unsurpassed heavens, in the cosmic man's face: a vimāna.
    85: { draw: () => [moon(10, 10, 3, "shell"), ...vimana(24, 40, 24)] },
    // Siddhaśilā: the crystal crescent at the top of the world, and the liberated above it. No figure, no niche.
    90: { draw: () => [shape("M-19,0 Q0,-17 19,0 Q0,-6 -19,0 Z", "shell", { x: 24, y: 36 }), ...[[10, 21], [17, 18.4], [24, 17.4], [31, 18.4], [38, 21]].map(([x, y]) => dot(x, y, 1.6, "gold")), dot(24, 9, 2.2, "gold")] },
  },
};
