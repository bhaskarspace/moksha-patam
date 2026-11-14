// The pictures of the old cloths' squares (Phase 20, step 4): one per square of the 72 and the 84, drawn by
// tools/vignettes.mjs into assets/sprites.svg as b72-N and b84-N, and shown in the card's picture panel only (the board
// writes each square's legend in it, as the charts do). Each is the legend's emblem in the vignettes' idiom: flat pigment
// in the one 1.25 outline, the 48 square, the palette. Three rules hold for every one of them:
//   - a god of the 72 is an emblem (the conch, the discus, the lotus, a mount), never a figure or a shrine;
//   - no Tīrthaṅkara of the 84 is a seated figure in a niche: the siddhaśilā's crescent, footprints, a lamp;
//   - the 84's hells are darkness, a flame far off, an empty cell: never a body that suffers.
// The card shows the picture whole, so there is no number's corner or name's strip to keep clear; a margin of about 4.
import { dot, poly, shape, line, lotus, flame, moon, pot, sea, sun } from "../tools/vignette-parts.mjs";

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
const vimana = (x, y, w, fill = "yellow") => [
  poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - w * 0.3], [x - w / 2, y - w * 0.3]], "vermilion"),
  shape(`M${-w * 0.42},0 C${-w * 0.42},${-w * 0.6} ${w * 0.42},${-w * 0.6} ${w * 0.42},0 Z`, fill, { x, y: y - w * 0.3 }),
  shape("M-2,0 L-2,-3.4 Q0,-5.6 2,-3.4 L2,0 Z", "indigo", { x, y }),
  line(`M${x},${y - w * 0.3 - w * 0.45} L${x},${y - w * 0.3 - w * 0.75}`), poly([[x, y - w * 1.05], [x + 4, y - w * 0.98], [x, y - w * 0.9]], "vermilion"),
];
// a field of darkness, the whole square
const dark = (fill = "black") => poly([[4, 4], [44, 4], [44, 44], [4, 44]], fill);

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
    // The black stain (kṛṣṇa leśyā), the darkest of the six colours a soul takes from its karma.
    45: { draw: () => [dot(24, 24, 18, "shell"), dot(24, 24, 12, "black")] },
    // Vijaya, the first of the five unsurpassed heavens, in the cosmic man's face: a vimāna.
    85: { draw: () => [moon(10, 10, 3, "shell"), ...vimana(24, 40, 24)] },
    // Siddhaśilā: the crystal crescent at the top of the world, and the liberated above it. No figure, no niche.
    90: { draw: () => [shape("M-19,0 Q0,-17 19,0 Q0,-6 -19,0 Z", "shell", { x: 24, y: 36 }), ...[[10, 21], [17, 18.4], [24, 17.4], [31, 18.4], [38, 21]].map(([x, y]) => dot(x, y, 1.6, "gold")), dot(24, 9, 2.2, "gold")] },
  },
};
