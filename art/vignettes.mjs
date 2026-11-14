// The scenes of the painted vignettes (REDESIGN.md Phase 13), drawn by tools/vignettes.mjs into assets/sprites.svg.
// Each is the square's moment, not its abstract name, in the Basohli manner: profile, the one eye, flat pigment, one
// outline. 48 × 48: the number is in the top-left corner (about 12 × 9) and the name along the bottom (about 7), so both
// stay clear. On a snake square the hood and body cover part of it, and on a ladder square the rails do; each scene is
// told in the part its square leaves open (`keep`, measured from the board's own geometry). The divine row's are seals,
// more pattern than figure (docs/CONTENT.md §7). 105's is the card's alone: the board keeps ॐ.
import { head, limb, robe, seated, arch, sea, sun, cloth, dot, poly, shape, line, lotus, flame, moon, pot, books, house, bowl, crown, lying,
  monkey, crocodile, crow, perched, lion, horse, cow, deer, cat, hare, jackal } from "../tools/vignette-parts.mjs";

const bird = (x, y, s = 1, fill = "yellow") => shape("M-4,0 Q-2,-3 0,-1 Q2,-4 5,-2 Q2,0 0,1 Q-2,1 -4,0 Z", fill, { x, y, s });
// a chariot's wheel: the rim, the hub and six spokes
const wheel = (x, y, r) => [dot(x, y, r, "yellow"), line(`M${x - r},${y} L${x + r},${y} M${x - r / 2},${y - r * 0.87} L${x + r / 2},${y + r * 0.87} M${x + r / 2},${y - r * 0.87} L${x - r / 2},${y + r * 0.87}`), dot(x, y, r * 0.25, "vermilion")];
const drop = (x, y) => poly([[x, y - 1.6], [x + 0.8, y + 0.4], [x - 0.8, y + 0.4]], "indigo", false);

// a goose in flight seen from below, wings spread, its neck down to (x, y) where its beak holds a stick: the tortoise's
// fable (8)
const goose = (x, y) => [
  shape("M-9.5,-1.6 Q-5,-6.4 -1,-1.4 L0,-0.8 L1,-1.4 Q5,-6.4 9.5,-1.6 Q5,-2.8 1.2,1.6 L0,2.4 L-1.2,1.6 Q-5,-2.8 -9.5,-1.6 Z", "shell", { x, y: y - 9.6 }),
  limb(x, y - 8, x, y - 2.6, { w: 1.7, end: 0 }),
  dot(x, y - 2.4, 1.5, "shell"),
  poly([[x - 0.8, y - 1.4], [x + 0.8, y - 1.4], [x, y + 0.6]], "yellow"),
];

export default {
  // ---- The fables (26 Oct): the animal in profile at the moment of the turn ----
  // Monkey and crocodile: mid-river on the crocodile's back, the monkey points back at the tree: my heart is up there.
  13: { keep: "bottom-right", draw: () => [
    sea(10, 41, 37, 6),
    crocodile(30, 42.5, { s: 0.85 }),
    monkey(29, 37, { s: 0.85, face: -1, arm: [12, -13] }),
  ] },
  // The crows' plan: the crow lets the queen's necklace fall into the cobra's hole.
  16: { keep: "bottom-left", draw: () => [
    shape("M2,46 C3,39 15,38 18,46 Z", "ochre"), shape("M7,46 C7.4,43 12.6,43 13,46 Z", "black"),
    dot(14, 33.5, 0.9, "yellow"), dot(13.2, 35.6, 0.9, "yellow"), dot(12.2, 37.6, 0.9, "yellow"), dot(11.2, 39.6, 0.9, "yellow"), dot(10.4, 41.6, 1.2, "vermilion"),
    crow(20, 33, { s: 0.8, face: -1 }),
  ] },
  // The lion wakes: put back together, the lion springs, and the brother who did it falls back.
  22: { keep: "bottom, left", draw: () => [
    lion(31, 45, { s: 1 }),
    robe(8, 33, { s: 0.45, face: -1, fill: "indigo", sash: "yellow" }),
    limb(8.5, 34.5, 13, 29.5, { w: 2.2, end: 1.4 }),
    head(8, 29.4, { s: 0.68, face: 1 }),
  ] },
  // The chariot: the horse the senses are, the wheel, and the driver with the reins.
  35: { keep: "bottom, left", draw: () => [
    line("M15,32 L39,29"),
    poly([[4, 37], [16, 37], [17, 33], [4, 33]], "vermilion"),
    ...wheel(9, 40, 5.4),
    horse(30, 45.5, { s: 0.95 }),
    head(10, 29.5, { s: 0.6, face: 1 }),
  ] },
  // The bowstring: saving the meat for later, the jackal starts on the string, and the bow springs.
  43: { keep: "bottom, top", draw: () => [
    line("M7.2,31.4 L7.2,46.6"),
    shape("M6,30 C0,35 0,42 6,48 L7.6,46.8 C3,42 3,36 7.6,31.2 Z", "ochre"),
    jackal(21, 45, { s: 0.9, face: -1 }),
    shape("M37,46 C36,42 42,41 44,44 C45,46 40,47 37,46 Z", "vermilion"),
  ] },
  // A thousand cows: Satyakāma's herd come home out of the forest.
  45: { keep: "bottom-left", draw: () => [
    cow(10, 37, { s: 0.6, fill: "ochre" }),
    cow(13, 46, { s: 0.8 }),
  ] },
  // Born a deer: the deer looks back, over its shoulder, at what it was thinking of.
  64: { keep: "middle", draw: () => [
    deer(25, 45.5, { s: 1, back: true }),
  ] },
  // Unmasked: the cat sits as if at prayer, and the hare and the partridge come to it for judgment.
  71: { keep: "right, bottom", draw: () => [
    cat(32, 45, { s: 1, face: -1 }),
    hare(14, 46, { s: 0.85 }),
    perched(44, 44, { s: 0.8, face: -1, fill: "ochre", wing: "vermilion" }),
  ] },
  // The watching bird: two birds on one branch, one eating the fruit, the other watching it.
  94: { keep: "top", draw: () => [
    line("M14,14 C24,12.6 36,12.6 47,13.6"),
    shape("M30,13.4 C31,10.6 34,10.6 35,12.6 Z", "malachite"), shape("M17,14 C17.6,16.4 20.4,16.8 21.6,15 Z", "malachite"),
    dot(27.6, 10.6, 1.3, "vermilion"),
    perched(22, 9.6, { s: 0.9 }),
    perched(40, 9.6, { s: 0.9, face: -1, fill: "shell", wing: "indigo" }),
  ] },

  // ---- The snakes ----
  // Chatter: told a secret, holds it all through lunch, and tells it. A child with a hand at the mouth; the secret flies.
  14: { keep: "left, top", draw: () => [
    robe(6, 25.5, { s: 0.62, fill: "malachite", sash: "yellow" }),
    limb(8, 28, 11.5, 22, { w: 2.8 }),
    head(6, 20, { s: 0.9, kind: "child" }),
    bird(34, 5, 1.3), bird(41, 8.5, 0.9, "shell"),
  ] },
  // Fibbing: tells the class about a holiday by the sea that never happened. The child at the left, arm up in the
  // telling; up in the corner, in a niche of its own, the sea that was never there.
  19: { keep: "left, top-right", draw: () => [
    arch(34, 1.5, 13, 17, "yellow"),
    sun(40.5, 7, 1.9, { rays: 8 }),
    sea(34, 12.5, 13, 6),
    robe(8, 24.5, { s: 0.72, fill: "yellow", sash: "vermilion" }),
    limb(10.5, 27, 15, 16.5, { w: 3 }),
    head(8, 18.5, { s: 1, kind: "child" }),
  ] },
  // Laziness: the exam in a week, and the books not moved. The books, stacked; the student beside them, dozing.
  29: { keep: "right", draw: () => [
    books(33, 41, 13, ["indigo", "vermilion", "malachite"]),
    seated(39, 18, { s: 0.7, face: -1, fill: "yellow" }),
    head(39, 13, { s: 0.85, face: -1, kind: "child" }),
    line("M42,2 L45,2 L42,5 L45,5"), line("M37,0.6 L39,0.6 L37,2.6 L39,2.6"),
  ] },
  // Pride of learning: explains the bridge to the person who built it. The bridge along the top, and the explainer's
  // finger up at it.
  39: { keep: "top, right", draw: () => [
    shape("M14,14 Q29,0 44,14 L40.5,14 Q29,5 17.5,14 Z", "ochre"),
    poly([[13, 14], [45, 14], [45, 16], [13, 16]], "vermilion"),
    robe(43, 24, { s: 0.5, face: -1, fill: "indigo", sash: "yellow" }),
    limb(41.5, 26, 37, 18, { w: 2.4, end: 1.5 }),
    head(43, 19.5, { s: 0.72, face: -1 }),
  ] },
  // Craving: buys the thing at last, and within a week is looking at the better one. The bought box in hand; the
  // better one shining in a niche.
  47: { keep: "left, top-right", draw: () => [
    arch(25, 1, 11, 9.5, "indigo"),
    pot(30.5, 7.5, 0.55, "yellow", "vermilion"),
    robe(6, 24, { s: 0.62, fill: "vermilion", sash: "yellow" }),
    poly([[9.5, 28], [15.5, 28], [15.5, 33.5], [9.5, 33.5]], "yellow"),
    limb(8, 26.5, 11, 29.5, { w: 2.6 }),
    head(6, 18.5, { s: 0.9, face: 1 }),
  ] },
  // Greed: the shopkeeper gives back too much change, and it is pocketed quickly. The hand at the pocket, the coins.
  55: { keep: "right", draw: () => [
    robe(40, 12.5, { s: 0.6, face: -1, fill: "indigo", sash: "yellow" }),
    limb(38, 15, 35.5, 21, { w: 2.6 }),
    head(40, 7.5, { s: 0.85, face: -1 }),
    dot(34, 24.5, 1.5, "yellow"), dot(37.5, 26, 1.5, "yellow"), dot(35, 28.5, 1.5, "yellow"),
  ] },
  // Anger: something precious broken, and the hand raised. The adult, arm up; the pot in pieces in the corner.
  59: { keep: "left, top-right", draw: () => [
    shape("M36,12 L39,4 L41,8 L44,3 L45,12 Z", "malachite"), shape("M35,14 L41,10 L46,14 L44,16 L37,16 Z", "malachite"),
    robe(8, 21, { s: 0.75, fill: "indigo", sash: "vermilion" }),
    limb(10.5, 23.5, 14.5, 11, { w: 3 }),
    head(8, 15, { s: 1 }),
  ] },
  // Attachment: has never once said no to the son, and does not say it now. The sweet held up; the child reaching.
  62: { keep: "left, top", draw: () => [
    robe(7, 23.5, { s: 0.68, fill: "malachite", sash: "yellow" }),
    limb(9.5, 26, 15.5, 13.5, { w: 2.8 }),
    dot(17, 11.5, 2.2, "yellow"),
    head(7, 17.5, { s: 0.95, kind: "woman" }),
    limb(29, 8.5, 21, 10.5, { w: 2.4, end: 1.5 }),
    head(32, 5.5, { s: 0.62, face: -1, kind: "child" }),
  ] },
  // Envy: shown round the rival's new house, and praises every room. The house, and the guest's hand out to it.
  69: { keep: "top, right", draw: () => [
    house(16, 15, 12, { wall: "shell", roof: "vermilion", door: "indigo" }),
    robe(43, 13.5, { s: 0.55, face: -1, fill: "yellow", sash: "vermilion" }),
    limb(41, 16, 33.5, 11.5, { w: 2.4, end: 1.5 }),
    head(43, 8.5, { s: 0.78, face: -1 }),
  ] },
  // Pride: at the wedding, telling everyone none of this would exist without them. The garland, and a hand on the chest.
  77: { keep: "top-right", draw: () => [
    ...[[21, 2.5, "yellow"], [24.5, 4.5, "vermilion"], [28, 5.3, "yellow"], [31.5, 4.5, "vermilion"]].map(([x, y, c]) => dot(x, y, 1.4, c)),
    robe(41, 10.5, { s: 0.45, face: -1, fill: "vermilion", sash: "yellow" }),
    limb(39.5, 12.5, 40.5, 14.5, { w: 2.2, end: 1.4 }),
    head(41, 6.5, { s: 0.7, face: -1 }),
  ] },
  // Hypocrisy: prays loudly, where the neighbours can hear. The hands together, the voice going out, and an eye at a
  // window across the way.
  88: { keep: "left, top", draw: () => [
    arch(31, 1, 11, 10, "indigo"),
    head(37, 7.5, { s: 0.5, face: -1 }),
    robe(7, 23.5, { s: 0.68, fill: "yellow", sash: "vermilion" }),
    limb(9, 26, 13.5, 21, { w: 2.6 }),
    head(7, 17.5, { s: 0.95 }),
    line("M16,14 Q18,16.5 16,19"), line("M19,12 Q22,16.5 19,21"),
  ] },
  // Clinging: has given almost everything away, and holds on to the last bundle.
  93: { keep: "right", draw: () => [
    robe(40, 14.5, { s: 0.6, face: -1, fill: "shell", sash: "ochre" }),
    cloth(32.5, 17.5, 6, 5.5, { fill: "vermilion", stripe: "yellow", stripes: 1 }),
    limb(38, 17, 35.5, 20, { w: 2.6 }),
    head(40, 9.5, { s: 0.85, face: -1, hair: "white" }),
  ] },
  // Ego: looks in the mirror and is satisfied: the body is still there. The old face, and the face in the glass.
  99: { keep: "top, right", draw: () => [
    dot(30, 8.5, 4.6, "yellow"), dot(30, 8.5, 3.2, "shell"),
    robe(41, 15, { s: 0.55, face: -1, fill: "indigo", sash: "yellow" }),
    limb(39, 17.5, 32.5, 12, { w: 2.4, end: 1.5 }),
    head(41, 10, { s: 0.8, face: -1, hair: "white" }),
  ] },

  // ---- The ladders ----
  // Friendship: a biscuit shared by breaking it badly, and both halves eaten anyway.
  6: { keep: "bottom", draw: () => [
    seated(8, 30, { s: 0.6, fill: "vermilion" }), limb(10.5, 32, 17, 31.5, { w: 2.4, end: 0 }),
    seated(40, 30, { s: 0.6, face: -1, fill: "indigo" }), limb(37.5, 32, 31, 31.5, { w: 2.4, end: 0 }),
    shape("M17,29 C20,28.5 22,30.5 21.5,33 L17,33 Z", "ochre"), shape("M31,29 C27,28.5 25.5,31 26.5,34 L31,33.5 Z", "ochre"),
    head(8, 25.5, { s: 0.72, kind: "child" }), head(40, 25.5, { s: 0.72, face: -1, kind: "child" }),
  ] },
  // Wit: cornered for the lunch, and says a teacher is coming. The big one looks round; the small one points away.
  12: { keep: "right", draw: () => [
    robe(40, 10.5, { s: 0.45, face: -1, fill: "indigo", sash: "vermilion" }),
    head(40, 6, { s: 0.8, face: -1, kind: "child" }),
    robe(37, 34, { s: 0.45, fill: "yellow", sash: "malachite" }),
    limb(39, 36, 45.5, 31, { w: 2.2, end: 1.4 }),
    head(37, 30, { s: 0.7, kind: "child" }),
  ] },
  // Devotion: told to keep the rain off the books, and an hour later still there in the rain.
  23: { keep: "left, bottom", draw: () => [
    drop(17, 9), drop(21, 6), drop(19.5, 14), drop(24, 12), drop(14.5, 16),
    books(14, 38, 11, ["vermilion", "malachite", "indigo"]),
    cloth(12.5, 25.5, 15, 3, { fill: "indigo", stripes: 0 }),
    robe(7, 21, { s: 0.7, fill: "shell", sash: "vermilion" }),
    limb(9.5, 23.5, 13.5, 26, { w: 2.6 }),
    head(7, 15.5, { s: 0.9, kind: "child" }),
  ] },
  // Truth: asked in front of everyone whether the homework was done. It was not, and the hand goes up to say so.
  28: { keep: "top-right", draw: () => [
    robe(38, 11, { s: 0.42, face: -1, fill: "malachite", sash: "yellow" }),
    limb(36.5, 13, 33.5, 3.5, { w: 2.2, end: 1.4 }),
    head(38, 7, { s: 0.75, face: -1, kind: "child" }),
  ] },
  // Resolve: waits three days outside an office for an answer. The shut door, three days, and someone sitting.
  34: { keep: "under the ladders", draw: () => [
    arch(33, 14, 12, 24, "ochre"), arch(35.5, 20, 7, 18, "indigo"),
    dot(15, 5, 1.4, "yellow"), dot(20, 5, 1.4, "yellow"), dot(25, 5, 1.4, "yellow"),
    seated(19, 27, { s: 0.6, fill: "vermilion" }),
    head(19, 22.5, { s: 0.75 }),
  ] },
  // Giving: two blankets for the winter, and the better one given away. The giver at the left holds out the striped one;
  // an old neighbour sits at the right with a hand out for it.
  44: { keep: "sides", draw: () => [
    robe(9, 20, { s: 0.88, fill: "malachite", sash: "yellow" }),
    cloth(15.5, 24, 10, 13, { fill: "vermilion", stripe: "yellow" }),
    limb(11, 23, 17.5, 24.5, { w: 3.4, end: 2 }),
    head(9, 13.5, { s: 1.15, kind: "woman" }),
    seated(39, 27, { s: 0.95, face: -1, fill: "indigo" }),
    limb(37, 29.5, 30, 27, { w: 3.2, end: 2 }),
    head(39, 21, { s: 1.05, face: -1, hair: "white" }),
  ] },
  // Compassion: sits up all night with a neighbour's sick child. The lamp, the moon, and the watcher by the cot.
  51: { keep: "right", draw: () => [
    moon(43, 5, 3.4),
    poly([[25, 37], [45, 37], [45, 39], [25, 39]], "ochre"),
    lying(26, 34.5, 18, { fill: "vermilion", s: 1.1 }),
    seated(41, 18, { s: 0.6, face: -1, fill: "indigo" }),
    head(41, 13.5, { s: 0.8, face: -1, kind: "woman" }),
    pot(31, 24, 0.45, "ochre", "vermilion"), flame(31, 20.5, 6),
  ] },
  // Duty: settles a quarrel between two cousins, and rules against the favourite. The one who rules, and the scales.
  57: { keep: "top", draw: () => [
    line("M27,3 L37,3 M32,3 L32,10"), shape("M25.5,5.5 L28.5,5.5 Q27,8 25.5,5.5 Z", "yellow"), shape("M35.5,5.5 L38.5,5.5 Q37,8 35.5,5.5 Z", "yellow"),
    seated(18, 8, { s: 0.42, fill: "vermilion" }),
    limb(19.5, 9, 24, 5, { w: 2, end: 1.2 }),
    head(18, 4.8, { s: 0.55 }),
  ] },
  // Detachment: the one married to talks of dividing up everything, and is not argued with. Turned away, sitting still.
  65: { keep: "bottom-right", draw: () => [
    seated(37, 34, { s: 0.55, fill: "shell" }),
    head(37, 30, { s: 0.68, hair: "grey" }),
  ] },
  // Austerity: gives up sugar, then talking after dark, then the second meal. The one sitting, the empty bowl, the night.
  72: { keep: "bottom", draw: () => [
    moon(41, 30, 3),
    bowl(39, 41, 11, "ochre"),
    seated(9, 31, { s: 0.62, fill: "ochre" }),
    head(9, 26.5, { s: 0.75, hair: "grey" }),
  ] },
  // Discernment: sits on the step watching their own hands peel an orange, as if they were someone else's.
  85: { keep: "left", draw: () => [
    poly([[0.6, 38], [20, 38], [20, 40], [0.6, 40]], "ochre"),
    seated(8, 24, { s: 0.7, fill: "ochre" }),
    limb(10, 26, 15, 27, { w: 2.4, end: 1.4 }),
    dot(18, 27, 3, "yellow"), line("M16.2,25 Q18,23 20,25"),
    head(8, 19, { s: 0.85, hair: "grey" }),
  ] },

  // ---- Phase 20, the plain squares, sheet 1 (15 Nov): the square's own scene, never a grave moment of the life; people of
  // both genders and every age; no sect mark and nothing that ranks anyone. A plain square has neither a head nor a foot
  // on it, so its scene keeps only to the number's corner (top-left) and the name's strip (the bottom seven) ----
  // First rice: six months old, fed from a bowl, and most of it ends up on the floor.
  4: { keep: "plain", draw: () => [
    seated(31, 22, { s: 0.85, face: -1, fill: "vermilion" }),
    head(31, 16.5, { s: 1, face: -1, kind: "woman" }),
    bowl(23, 36, 7, "ochre"),
    seated(13, 28, { s: 0.5, fill: "yellow" }),
    head(13, 24.8, { s: 0.7, kind: "child" }),
    limb(28.5, 24.5, 18.5, 25.5, { w: 2.4, end: 1.4 }),
    // the rice on the floor: two white heaps, not grains, so it reads white at the board's size
    shape("M-4.5,0 C-4,-3 4,-3 4.5,0 Z", "shell", { x: 11, y: 40 }), shape("M-2.6,0 C-2.3,-1.9 2.3,-1.9 2.6,0 Z", "shell", { x: 33.5, y: 40 }),
  ] },
  // Story time: will not sleep until the monkey's story is told again, the same way. The one in the cot, the teller, the
  // monkey of the story over them.
  9: { keep: "plain", draw: () => [
    moon(43, 5.5, 3),
    poly([[3, 35], [26, 35], [26, 37.4], [3, 37.4]], "ochre"),
    lying(4, 32.4, 21, { fill: "indigo", s: 1 }),
    seated(38, 22, { s: 0.8, face: -1, fill: "shell" }),
    limb(35.5, 24.5, 30, 20, { w: 2.2, end: 1.3 }),
    head(38, 16.5, { s: 0.95, face: -1, hair: "white" }),
    monkey(17, 23, { s: 0.5, arm: [6, -10] }),
  ] },
  // Sacred thread, as the beginning of learning: a child at the teacher's door with something in hand, as Kaca came to
  // Śukra. Not the thread.
  20: { keep: "plain", draw: () => [
    // a plain house: a wall, a thatch, a doorway under a flat lintel; the teacher sits on the ground before the wall, beside
    // the door and not in it
    poly([[22, 15], [46, 15], [46, 38], [22, 38]], "paleochre"),
    shape("M-1.5,0 C2,-5 22,-5 25.5,0 Z", "ochre", { x: 21, y: 15.5 }),
    poly([[37.5, 22], [44, 22], [44, 38], [37.5, 38]], "indigo"), poly([[36.5, 20.4], [45, 20.4], [45, 22], [36.5, 22]], "ochre"),
    seated(32, 25, { s: 0.75, face: -1, fill: "malachite" }),
    limb(29.5, 27.5, 24.5, 27, { w: 2.2, end: 1.2 }),
    head(32, 19.2, { s: 0.88, face: -1, hair: "white" }),
    robe(9.5, 23, { s: 0.6, fill: "yellow", sash: "vermilion" }),
    limb(11, 25.5, 15, 28, { w: 2.2, end: 1.2 }),
    pot(17, 30, 0.4, "ochre", "vermilion"),
    head(9.5, 18, { s: 0.85, kind: "child" }),
  ] },
  // Banyan seed: splits a seed open with a thumbnail and finds nothing inside, under the tree it would have been.
  33: { keep: "plain", draw: () => [
    // aerial roots hanging from a wide, low canopy, some of them to the ground
    line("M25.5,25 L25.5,40 M28.5,25 L28.5,33 M38.5,25 L38.5,40 M41.5,25 L41.5,34 M44.5,25 L44.5,37 M22,25 L22,29"),
    poly([[31, 40], [35.5, 40], [35, 24], [31.5, 24]], "ochre"),
    shape("M-14.5,0 C-15,-6 -7,-10 0,-9.5 C7,-10 15,-6 14.5,0 Z", "malachite", { x: 33, y: 25 }),
    seated(12, 27, { s: 0.62, fill: "vermilion" }),
    head(12, 22.5, { s: 0.8, kind: "woman" }),
    limb(14, 29, 19.5, 30, { w: 2.2, end: 1.2 }),
    dot(19.6, 33, 1.4, "ochre"), dot(22.4, 33.6, 1.4, "ochre"), dot(19.6, 33, 0.55, "shell", false), dot(22.4, 33.6, 0.55, "shell", false),
  ] },
  // Home: cooks for more people than live in the house. The pot on the fire, the one stirring, the row of bowls waiting.
  42: { keep: "plain", draw: () => [
    flame(16, 39, 9),
    pot(16, 29, 0.78, "ochre", "vermilion"),
    seated(34, 22, { s: 0.72, face: -1, fill: "malachite" }),
    limb(31.5, 24.5, 21.5, 20.5, { w: 2.2, end: 0 }), line("M21.5,20.5 L18.5,24.5"),
    head(34, 17, { s: 0.9, face: -1 }),
    // the bowls waiting, three on the floor, no shelf
    bowl(28, 40, 6.5, "yellow"), bowl(35.5, 40, 6.5, "ochre"), bowl(43, 40, 6.5, "yellow"),
  ] },
  // A blade of grass: cannot get the lid off a jar, and hands it to a child. And the blade no god could burn.
  58: { keep: "plain", draw: () => [
    seated(31, 23, { s: 0.8, face: -1, fill: "indigo" }),
    limb(28, 26, 22, 27, { w: 2.3, end: 1.3 }),
    head(31, 17.5, { s: 0.95, face: -1, kind: "woman", hair: "white" }),
    pot(19.5, 28, 0.45, "shell", "vermilion"),
    robe(11, 24, { s: 0.5, fill: "vermilion", sash: "yellow" }),
    limb(12.5, 26, 17, 27, { w: 2, end: 1.2 }),
    head(11, 19.8, { s: 0.75, kind: "child" }),
    shape("M0,0 C0.5,-5 2.5,-10 6.5,-14 C5.5,-9 4,-4.5 3.2,0 Z", "malachite", { x: 39, y: 39.5 }), shape("M0,0 C-0.5,-4 -2.5,-7.5 -5.5,-9.5 C-3.5,-6 -2,-3 -1.6,0 Z", "malachite", { x: 40.4, y: 39.5 }),
  ] },
  // To the forest: hands over the keys and the house, and is still standing in the doorway.
  66: { keep: "plain", draw: () => [
    house(2, 38, 18, { wall: "shell", roof: "vermilion", door: "indigo" }),
    // he stands just out of the doorway, clear of the house, holding out the keys on their ring
    robe(26, 23, { s: 0.6, fill: "ochre", sash: "vermilion" }),
    head(26, 17.8, { s: 0.85, hair: "grey" }),
    limb(28, 25.5, 31.4, 27, { w: 2.2, end: 1.2 }),
    dot(32.6, 28.6, 2.2, "none"), line("M32.6,30.8 L32.6,35.4 M32.6,33.4 L34.2,33.4 M32.6,34.9 L34,34.9 M31,30.4 L29.6,34.6 M30.2,32.6 L28.8,32.2"),
    robe(41, 22, { s: 0.65, face: -1, fill: "malachite", sash: "yellow" }),
    limb(39, 25, 34.6, 27.4, { w: 2.2, end: 1.3 }),
    head(41, 16.5, { s: 0.9, face: -1, kind: "woman" }),
  ] },
  // Sandhya: stands facing the sun every morning by the water, asking for a clearer head and nothing else.
  76: { keep: "plain", draw: () => [
    sun(40, 13, 5, { rays: 12 }),
    robe(16, 17.5, { s: 0.72, fill: "shell", sash: "vermilion" }),
    limb(18, 20, 23, 16.5, { w: 2.4, end: 1.5 }),
    head(16, 11.5, { s: 1, kind: "woman" }),
    // she stands in the river to the waist, the water over her legs
    sea(3, 27.5, 42, 12.5),
  ] },
  // The golden lid: the cataract taken off one eye, and the world bluer than in years. The golden lid lifts from the face
  // of what is true (Īśa 15), and the one who sees it.
  87: { keep: "plain", draw: () => [
    dot(35, 22, 8.5, "indigo"),
    shape("M-9,1 C-8,-6 9,-8 10,-2 Z", "yellow", { x: 37, y: 11 }), dot(38.6, 6.4, 1, "yellow"),
    seated(12, 27, { s: 0.65, fill: "ochre" }),
    head(12, 22, { s: 0.85, hair: "white" }),
  ] },
  // Wholeness: shares a sweet among the children, gives away the last piece too, and is no less. Three, spaced, so each
  // reads as one at the board's size.
  97: { keep: "plain", draw: () => [
    seated(8.5, 24, { s: 0.66, fill: "vermilion" }),
    limb(11, 26.5, 15, 28, { w: 2.2, end: 1.2 }),
    head(8.5, 19.2, { s: 0.85, kind: "woman", hair: "white" }),
    bowl(19.5, 32, 10, "yellow"), dot(17.5, 28.4, 1.1, "vermilion"), dot(21, 28.6, 1.1, "vermilion"),
    ...[[30, "indigo", 29], [37.5, "malachite", 27], [45, "ochre", 29]].flatMap(([x, c, y]) => [
      seated(x, y, { s: 0.4, face: -1, fill: c }),
      head(x, y - 3.4, { s: 0.6, face: -1, kind: "child" }),
    ]),
  ] },

  // ---- Phase 20, sheet 2 (15 Nov), the same rules ----
  // Carried everywhere: on a hip.
  2: { keep: "plain", draw: () => [
    robe(22, 19, { s: 0.82, fill: "vermilion", sash: "yellow" }),
    head(22, 13, { s: 1, kind: "woman" }),
    // the child in green against her red, sitting a little out from her side
    limb(20, 23, 33.5, 29.5, { w: 2.4, end: 1.4 }),
    seated(31, 20.5, { s: 0.44, fill: "malachite" }),
    head(31.5, 17.4, { s: 0.64, kind: "child" }),
  ] },
  // Asleep on a father's chest, and he does not move for an hour.
  3: { keep: "plain", draw: () => [
    moon(42, 6.5, 3.2),
    seated(22, 22, { s: 0.95, fill: "indigo" }),
    head(22, 15.8, { s: 1.05 }),
    shape("M0,0 C2,-2 6,-2 8,1 L7,6 L0,5 Z", "yellow", { x: 24, y: 22.5 }),
    head(29.5, 21.5, { s: 0.62, face: -1, kind: "child" }),
    limb(20, 25.5, 30, 28.5, { w: 2.4, end: 1.4 }),
  ] },
  // Moving stones from one pile to the other, all afternoon.
  7: { keep: "plain", draw: () => [
    sun(40, 9, 3.4, { rays: 10 }),
    ...[[6, 39.5], [9.4, 39.8], [12.8, 39.5], [7.6, 36.6], [11.2, 36.8], [9.4, 34]].map(([x, y]) => dot(x, y, 1.8, "paleochre")),
    ...[[35, 39.8], [38.6, 39.6]].map(([x, y]) => dot(x, y, 1.8, "paleochre")),
    seated(22, 26, { s: 0.6, fill: "malachite" }),
    head(22, 21.6, { s: 0.85, kind: "child" }),
    limb(24.5, 28, 31, 31, { w: 2.2, end: 0 }), dot(31.6, 31.8, 1.8, "paleochre"),
  ] },
  // Why is a dog called a dog? The dog, the one asking, and the grandfather with no answer.
  10: { keep: "plain", draw: () => [
    robe(10, 23.5, { s: 0.55, fill: "yellow", sash: "vermilion" }),
    head(10, 18.5, { s: 0.8, kind: "child" }),
    limb(12, 26, 18, 23, { w: 2, end: 1.2 }),
    // a dog: ears up, tail up, so it reads as a dog at the board's size
    shape("M18.5,34 C15.5,33 14,30 14.8,26.8 C16.2,29.4 17.4,31 19.4,32.2 Z", "ochre"),
    limb(19.5, 35.5, 19, 40, { w: 1.7, fill: "ochre", end: 0 }), limb(22, 35.5, 22.2, 40, { w: 1.7, fill: "ochre", end: 0 }),
    limb(26, 35.5, 25.8, 40, { w: 1.7, fill: "ochre", end: 0 }), limb(28.2, 35.5, 28.8, 40, { w: 1.7, fill: "ochre", end: 0 }),
    shape("M18,33.4 C18,32 20,31.6 23,31.8 C26,31.6 28.5,31.4 29.5,32.4 L29.5,36 C26,37 21,37 18.4,36 Z", "ochre"),
    poly([[28.6, 29.6], [29, 25.6], [31.2, 29]], "ochre"),
    shape("M28,32.6 C27.6,29.6 29.4,28.4 31.4,28.8 C32.6,29 33,30 34.8,30.6 C35.4,31.4 35,32.4 34,32.6 C32.4,33 31.6,33.6 30.4,34 C29,34.2 28.2,33.6 28,32.6 Z", "ochre"),
    dot(31.4, 30.4, 0.55, "black", false), dot(34.8, 31, 0.5, "black", false),
    seated(42.5, 24, { s: 0.7, face: -1, fill: "indigo" }),
    head(42.5, 18.5, { s: 0.9, face: -1, hair: "white" }),
    limb(40, 26, 36.5, 22.5, { w: 2.2, end: 1.3 }), limb(44.5, 26, 46.4, 22.2, { w: 2.2, end: 1.2 }),
  ] },
  // An armful of sticks for the fire, at the teacher's door, waiting. The door is shut.
  26: { keep: "plain", draw: () => [
    poly([[26, 15], [46, 15], [46, 38], [26, 38]], "paleochre"),
    shape("M-1.5,0 C2,-5 18,-5 21.5,0 Z", "ochre", { x: 25, y: 15.5 }),
    poly([[31, 22], [39, 22], [39, 38], [31, 38]], "indigo"), poly([[30, 20.4], [40, 20.4], [40, 22], [30, 22]], "ochre"), line("M35,22 L35,38"),
    robe(14, 22, { s: 0.62, fill: "malachite", sash: "ochre" }),
    head(14, 16.5, { s: 0.88 }),
    poly([[11, 25.5], [22.5, 23.5], [23, 26], [11.5, 28]], "ochre"), line("M13,25.6 L21.5,24.1 M13.4,27 L22,25.5"),
    limb(15.5, 24.5, 18, 27, { w: 2.2, end: 1.2 }),
  ] },
  // Three teachers asked what matters most, and three answers: one hand open, one raised, one on the heart.
  40: { keep: "plain", draw: () => [
    poly([[18, 22], [47, 22], [47, 24], [18, 24]], "ochre"),
    ...[[24, "vermilion", "black", "man", [20, 15.5]], [33, "indigo", "white", "woman", [29.5, 11.5]], [42, "malachite", "grey", "man", [40.6, 15.6]]].flatMap(([x, c, hair, kind, [hx, hy]]) => [
      seated(x, 15, { s: 0.46, face: -1, fill: c }),
      limb(x - 1, 16.5, hx, hy, { w: 1.8, end: 1 }),
      head(x, 11.4, { s: 0.65, face: -1, hair, kind }),
    ]),
    seated(10, 27, { s: 0.62, fill: "yellow" }),
    head(10, 22.4, { s: 0.85, kind: "woman" }),
  ] },
  // A bet that cannot be won: the two hands struck on it over the dice.
  52: { keep: "plain", draw: () => [
    robe(13, 21, { s: 0.68, fill: "indigo", sash: "yellow" }),
    head(13, 15.2, { s: 0.92 }),
    robe(35, 21, { s: 0.68, face: -1, fill: "vermilion", sash: "malachite" }),
    head(35, 15.2, { s: 0.92, face: -1, kind: "woman" }),
    limb(15.5, 24, 23.2, 25.5, { w: 2.3, end: 1.4 }), limb(32.5, 24, 25, 25.5, { w: 2.3, end: 1.4 }),
    // the dice on the ground between them
    poly([[20, 36], [23.2, 36], [23.2, 39.2], [20, 39.2]], "shell"), dot(21.6, 37.6, 0.55, "black", false),
    poly([[25, 35.6], [28.2, 35.6], [28.2, 38.8], [25, 38.8]], "shell"), dot(25.9, 36.5, 0.5, "black", false), dot(27.3, 37.9, 0.5, "black", false),
  ] },
  // Back to the first lesson: the slate on the knees, the first stroke, in the forest's quiet.
  61: { keep: "plain", draw: () => [
    poly([[39.5, 40], [42.5, 40], [42, 20], [40, 20]], "ochre"),
    shape("M-6,0 C-7,-6 -3,-9 0,-9 C3,-9 7,-6 6,0 Z", "malachite", { x: 41, y: 21 }),
    seated(16, 24, { s: 0.82, fill: "ochre" }),
    head(16, 18.3, { s: 0.98, hair: "grey" }),
    poly([[22, 24], [32, 22.5], [33, 29.5], [23, 31]], "black"),
    shape("M0,0 C1.5,-2.2 3.5,-1.6 3,0.6 C2.6,2.2 0.8,2.2 1.4,3.4", "none", { x: 26, y: 25.5 }),
    dot(26.3, 25.4, 0.7, "shell", false), dot(28.4, 25.5, 0.7, "shell", false), dot(27.6, 28, 0.7, "shell", false),
    limb(18.5, 26.5, 26.5, 28.5, { w: 2.3, end: 1.3 }),
  ] },
  // Laughing out loud, alone, at nothing: the arms thrown wide, the birds up off the ground.
  89: { keep: "plain", draw: () => [
    seated(23, 25, { s: 0.82, fill: "yellow" }),
    head(23, 19.2, { s: 0.98, hair: "white", kind: "woman" }),
    limb(20.5, 27, 13.5, 20, { w: 2.3, end: 1.3 }), limb(25.5, 27, 32.5, 20, { w: 2.3, end: 1.3 }),
    // the birds up off the ground: open wings, dark, so they read as birds and not leaves
    ...[[37.5, 11, 1], [43, 18, 0.8], [31.5, 6, 0.7]].map(([x, y, sc]) => shape("M-5,-2.2 Q-2.4,-3 0,0.6 Q2.4,-3 5,-2.2 Q2.6,-0.6 0,2.6 Q-2.6,-0.6 -5,-2.2 Z", "black", { x, y, s: sc })),
  ] },
  // A very quiet room: the lamp, the window, the mats rolled up against the wall, one sitting.
  100: { keep: "plain", draw: () => [
    poly([[30, 11], [42, 11], [42, 21], [30, 21]], "indigo"), line("M36,11 L36,21"), moon(39, 15, 2),
    cloth(28, 34, 6, 6, { fill: "vermilion", stripes: 2 }), cloth(35, 34, 6, 6, { fill: "malachite", stripes: 2 }), cloth(42, 34, 5, 6, { fill: "ochre", stripes: 2 }),
    seated(11, 25, { s: 0.72, fill: "shell" }),
    head(11, 19.8, { s: 0.9, hair: "white" }),
    shape("M-2.4,0 L2.4,0 L1.6,1.4 L-1.6,1.4 Z", "ochre", { x: 22.5, y: 38.6 }), flame(22.5, 38.6, 4),
  ] },

  // ---- Phase 20, sheet 3 (15 Nov), the same rules ----
  // Birth: the newborn in the crook of an arm, by a lamp.
  1: { keep: "plain", draw: () => [
    shape("M-2.4,0 L2.4,0 L1.6,1.4 L-1.6,1.4 Z", "ochre", { x: 9, y: 38.6 }), flame(9, 38.6, 5),
    seated(31, 22, { s: 0.85, face: -1, fill: "malachite" }),
    head(31, 16.5, { s: 1, face: -1, kind: "woman" }),
    shape("M-6,0 C-6,-3 -2,-4 2,-3.4 C5,-3 6,-1 6,0 C6,2 3,3 0,3 C-3,3 -6,2 -6,0 Z", "vermilion", { x: 22.5, y: 27.5 }),
    head(16.8, 25.6, { s: 0.6, kind: "child", hair: "black" }),
    limb(28.5, 25, 20.5, 30, { w: 2.3, end: 1.3 }),
  ] },
  // First steps: across the room by evening, arms out, to the arms held out for it.
  5: { keep: "plain", draw: () => [
    robe(19, 27.5, { s: 0.45, fill: "yellow", sash: "vermilion" }),
    head(19, 23.6, { s: 0.68, kind: "child" }),
    limb(19.8, 29.2, 24.2, 27.2, { w: 1.8, end: 1 }), limb(18.2, 29.2, 14, 27.8, { w: 1.8, end: 1 }),
    seated(39, 24, { s: 0.75, face: -1, fill: "indigo" }),
    head(39, 18.5, { s: 0.92, face: -1 }),
    limb(36.5, 26.5, 29.5, 26, { w: 2.2, end: 1.3 }), limb(37, 28, 30.5, 29.5, { w: 2.2, end: 1.3 }),
  ] },
  // Found out: says it was not them, the broken pot on the floor, and the one who knows.
  11: { keep: "plain", draw: () => [
    // the pot's body cracked open, its neck and lip rolled away from it
    shape("M-6,0 C-7,3 -5,6 0,6.4 C5,6 7,3 6,0 L3.4,0.8 L1.2,-0.4 L-1.4,1 L-3.6,0 Z", "vermilion", { x: 13, y: 33.6 }),
    shape("M-2.5,-6 L2.5,-6 L2,-4 C3.6,-3.6 4.2,-2.6 4,-1.6 L-4,-1.6 C-4.2,-2.6 -3.6,-3.6 -2,-4 Z", "vermilion", { x: 4.6, y: 41.2, s: 0.8 }),
    shape("M-3.6,-7.4 L3.6,-7.4 L3.2,-5.6 L-3.2,-5.6 Z", "vermilion", { x: 4.6, y: 41.2, s: 0.8 }),
    robe(26, 23.5, { s: 0.55, face: -1, fill: "malachite", sash: "yellow" }),
    head(26, 18.6, { s: 0.8, face: -1, kind: "child" }),
    robe(40, 19, { s: 0.7, face: -1, fill: "vermilion", sash: "indigo" }),
    head(40, 13, { s: 0.95, face: -1, kind: "woman" }),
    limb(38, 22, 35, 27, { w: 2.2, end: 1.3 }), limb(42, 22, 44.5, 27.5, { w: 2.2, end: 1.3 }),
  ] },
  // To the teacher's house: the house getting smaller up the road behind, and not turned to.
  21: { keep: "plain", draw: () => [
    poly([[35, 22], [38.5, 22], [33, 40], [19, 40]], "paleochre", false),
    house(32, 22, 9, { wall: "shell", roof: "vermilion", door: "indigo" }),
    robe(14, 21, { s: 0.66, face: -1, fill: "indigo", sash: "yellow" }),
    head(14, 15.4, { s: 0.9, face: -1, kind: "child" }),
    line("M17.5,23 L22.5,15"), poly([[20.5, 13.2], [25, 13.2], [25, 17], [20.5, 17]], "ochre"),
    limb(15.5, 23.6, 18.6, 21.4, { w: 2.2, end: 1.2 }),
  ] },
  // A verse at sunrise: the sun at the edge of the field, said to every morning.
  25: { keep: "plain", draw: () => [
    sun(37, 31, 6, { rays: 12 }),
    // the field's edge as a horizon, open at both sides, the sun half over it
    poly([[1, 31], [47, 31], [47, 41], [1, 41]], "palegreen", false), line("M1,31 L47,31"),
    robe(15, 17.5, { s: 0.72, fill: "yellow", sash: "vermilion" }),
    head(15, 11.6, { s: 0.98, kind: "woman" }),
    limb(16.6, 20.6, 20.8, 17.8, { w: 2.4, end: 1.5 }),
  ] },
  // Sugar in the tea: gone from sight, and in every sip.
  32: { keep: "plain", draw: () => [
    seated(15, 24, { s: 0.8, fill: "indigo" }),
    head(15, 18.5, { s: 0.95, hair: "grey" }),
    poly([[25, 33], [37, 33], [37, 35], [25, 35]], "ochre"), line("M26,35 L26,40 M36,35 L36,40"),
    shape("M-3.6,-5 L3.6,-5 L2.8,1 L-2.8,1 Z", "shell", { x: 30.5, y: 32 }), line("M34,28.5 C36,28.5 36,31.5 33.4,31.5"),
    limb(17.5, 26.5, 27.4, 25, { w: 2.2, end: 0 }), line("M27.4,25 L30.4,29.5"),
    line("M29.5,24.5 C28.5,23 30.5,22 29.5,20.5 M32,24.5 C31,23 33,22 32,20.5"),
  ] },
  // Seven steps round the fire, the two tied by a cloth.
  41: { keep: "plain", draw: () => [
    flame(24, 39, 10),
    robe(12, 19.5, { s: 0.66, fill: "vermilion", sash: "yellow" }),
    head(12, 13.8, { s: 0.9, kind: "woman" }),
    robe(36, 19.5, { s: 0.66, fill: "indigo", sash: "yellow" }),
    head(36, 13.8, { s: 0.9 }),
    shape("M15,25 Q24,28.6 33,25 L33,26.8 Q24,30.4 15,26.8 Z", "yellow"),
  ] },
  // A bad year: food borrowed from a friend, a sack of grain from one pair of hands to another.
  48: { keep: "plain", draw: () => [
    robe(13, 20, { s: 0.68, fill: "malachite", sash: "ochre" }),
    head(13, 14.2, { s: 0.92, kind: "woman" }),
    limb(15.2, 23, 21.6, 26.4, { w: 2.2, end: 1.3 }),
    robe(36, 20, { s: 0.68, face: -1, fill: "vermilion", sash: "yellow" }),
    head(36, 14.2, { s: 0.92, face: -1, hair: "grey" }),
    limb(33.8, 23, 27, 26.2, { w: 2.2, end: 1.3 }),
    shape("M-3.6,-2.6 L3.6,-2.6 C5.6,1 5.2,6.6 0,6.8 C-5.2,6.6 -5.6,1 -3.6,-2.6 Z", "paleochre", { x: 24.4, y: 28.4 }), line("M21,25.4 L27.8,25.4"),
  ] },
  // Raikva sitting under his cart, who knew more than the king: the bed up on its wheels, and he on the ground beneath
  // it, between them. The one who solves it is the one nobody asked.
  54: { keep: "plain", draw: () => [
    line("M4,15 L9,18.4"), poly([[7, 16.6], [43, 16.6], [43, 19.6], [7, 19.6]], "ochre"),
    line("M12,19.6 L12,31 M38,19.6 L38,31"),
    wheel(12, 33, 6.5), wheel(38, 33, 6.5),
    seated(23, 26, { s: 0.6, fill: "indigo" }),
    head(23, 21.8, { s: 0.74 }),
    limb(25.2, 28.4, 29.6, 29.8, { w: 1.9, end: 1.1 }),
  ] },
  // A mango eaten slowly on the step, for no one else.
  63: { keep: "plain", draw: () => [
    poly([[4, 34], [32, 34], [32, 40], [4, 40]], "paleochre"),
    seated(17, 19, { s: 0.8, fill: "vermilion" }),
    head(17, 13.5, { s: 0.95, hair: "white", kind: "woman" }),
    limb(19.5, 21.5, 24.4, 17.6, { w: 2.3, end: 1.3 }),
    shape("M0,-3.4 C3,-4 5,-1 4,2 C3,4.6 -1.4,4.4 -2,1.4 C-2.4,-0.6 -1.6,-2.8 0,-3.4 Z", "yellow", { x: 27.4, y: 17.4 }), shape("M0,0 C1.6,-2 4,-2.2 5,-1.6 C3.6,-0.4 1.6,0.2 0,0 Z", "malachite", { x: 27.4, y: 14 }),
  ] },
  // Five sheaths: at the end of the day, one thing taken off after another, laid down in a row.
  70: { keep: "plain", draw: () => [
    seated(13, 22, { s: 0.8, fill: "shell" }),
    head(13, 16.5, { s: 0.95, hair: "grey", kind: "woman" }),
    limb(15.5, 24.5, 21.5, 31.5, { w: 2.2, end: 1.3 }),
    cloth(21, 34, 8, 5, { fill: "malachite", stripe: "vermilion", stripes: 2 }),
    // the watch on its strap, the dial with its two hands; then the glasses
    poly([[30, 36.2], [37.4, 36.2], [37.4, 37.8], [30, 37.8]], "ochre"), dot(33.7, 37, 2.4, "shell"), line("M33.7,37 L33.7,35.4 M33.7,37 L35,37.6"),
    dot(40.6, 37, 1.8, "none"), dot(44.8, 37, 1.8, "none"), line("M42.4,37 L43,37"),
  ] },
  // The smallest room in the house, and sitting still in it, not small.
  74: { keep: "plain", draw: () => [
    poly([[11, 11], [41, 11], [41, 40], [11, 40]], "paleochre"),
    poly([[14, 14], [38, 14], [38, 40], [14, 40]], "indigo"),
    ...[[18, 18], [33, 17.5], [24.5, 16.4], [35.6, 25], [17, 26.5], [29.5, 20.6]].map(([x, y]) => dot(x, y, 0.75, "shell", false)),
    seated(26, 27, { s: 0.7, fill: "yellow" }),
    head(26, 22, { s: 0.85, hair: "grey" }),
  ] },
  // One bag: what will not go in it is left, and the bag goes over a shoulder.
  80: { keep: "plain", draw: () => [
    robe(15, 19, { s: 0.7, fill: "yellow", sash: "malachite" }),
    head(15, 13.2, { s: 0.94, hair: "white" }),
    line("M13.6,19.6 L20.4,28.6"), shape("M-3.2,-2.4 L3.2,-2.4 L2.8,3.6 L-2.8,3.6 Z", "ochre", { x: 21, y: 31 }),
    books(28, 40, 9, ["vermilion", "indigo"]), pot(42, 36, 0.5, "shell", "vermilion"), cloth(30, 31, 7, 3, { fill: "malachite", stripes: 1 }),
  ] },
  // Alms: the bowl held out at a door, and the food dropped into it from the doorway; nothing kept for tomorrow.
  84: { keep: "plain", draw: () => [
    poly([[30, 13], [46, 13], [46, 40], [30, 40]], "paleochre"),
    poly([[33, 21], [40, 21], [40, 40], [33, 40]], "indigo"), poly([[32, 19.4], [41, 19.4], [41, 21], [32, 21]], "ochre"),
    robe(14, 21, { s: 0.68, fill: "indigo", sash: "shell" }),
    head(14, 15.2, { s: 0.92, hair: "white" }),
    limb(16, 24, 19.6, 32, { w: 2.2, end: 1.2 }),
    bowl(25, 35, 11, "ochre"),
    limb(35.5, 23.5, 27.4, 23.4, { w: 2.2, end: 1.4 }),
    dot(26.6, 26.4, 0.9, "shell"), dot(25.2, 28.4, 0.9, "shell"), dot(27.2, 29.4, 0.9, "shell"),
  ] },
  // Half asleep in the sun, and the edge of the warmth not to be found; the cat has the same idea.
  91: { keep: "plain", draw: () => [
    sun(38, 12, 5.5, { rays: 14 }),
    poly([[5, 33], [30, 33], [30, 35.4], [5, 35.4]], "ochre"), line("M6.5,35.4 L6.5,40 M28.5,35.4 L28.5,40"),
    seated(15, 18.5, { s: 0.92, fill: "yellow" }),
    head(15, 12.4, { s: 1, hair: "white" }),
    cat(39, 40, { s: 0.55 }),
  ] },

  // The fall's mirror: the tortoise carried through the sky by two geese, wings spread, each holding an end of the stick in its beak,
  // the tortoise's jaws still shut on the middle of it, its legs dangling.
  8: { keep: "plain", draw: () => [
    ...goose(13, 23.4), ...goose(35, 23.4),
    limb(24.6, 29.4, 24, 24.8, { w: 2.2, fill: "paleochre", end: 0 }),
    shape("M-2.2,0.4 C-2.4,-1.8 2.4,-2 2.6,0.2 C2.6,1.8 -2.2,2.2 -2.2,0.4 Z", "paleochre", { x: 24, y: 24.2 }),
    line("M13,23.4 L35,23.4"), dot(25.2, 24, 0.45, "black", false),
    ...[[18.6, 33.4], [21.6, 34], [27.4, 34], [30.4, 33.4]].map(([x1, y1]) => limb(x1, y1, x1 + (x1 < 24 ? -0.6 : 0.6), y1 + 4, { w: 1.5, fill: "paleochre", end: 0 })),
    shape("M-8,0 C-7,-6.5 7,-6.5 8,0 C4,1.8 -4,1.8 -8,0 Z", "malachite", { x: 24.6, y: 33.4 }), line("M19.6,30 L29.6,30 M21.6,28.4 L21.6,34 M27.6,28.4 L27.6,34"),
  ] },
  // Owned up: the friend's hand on a shoulder, and the two of them taking the scolding together.
  15: { keep: "plain", draw: () => [
    robe(8.5, 22.5, { s: 0.56, fill: "yellow", sash: "vermilion" }),
    head(8.5, 17.5, { s: 0.82, kind: "child" }),
    robe(21, 22.5, { s: 0.56, fill: "malachite", sash: "yellow" }),
    head(21, 17.5, { s: 0.82, kind: "woman" }),
    limb(10.4, 24.5, 19.6, 22.8, { w: 1.9, end: 1.1 }),
    seated(39, 24, { s: 0.75, face: -1, fill: "indigo" }),
    head(39, 18.5, { s: 0.92, face: -1, hair: "grey" }),
    limb(36.5, 26, 33, 20.5, { w: 2.1, end: 0 }), line("M33,20.5 L33,17.6"),
  ] },
  // Will not say sorry for what was not wrong, though asked three times: the child standing, arms folded, and the
  // mother asking.
  18: { keep: "plain", draw: () => [
    seated(13, 24, { s: 0.82, fill: "vermilion" }),
    head(13, 18.4, { s: 0.96, kind: "woman" }),
    limb(15.6, 26.5, 23.8, 26.2, { w: 2.2, end: 1.3 }),
    robe(34, 22, { s: 0.62, face: -1, fill: "indigo", sash: "yellow" }),
    head(34, 16.8, { s: 0.86, face: -1, kind: "child" }),
    limb(36, 24.4, 31, 26.2, { w: 2, end: 1.1 }), limb(32, 24.4, 36.6, 26.6, { w: 2, end: 1.1 }),
  ] },
  // Come back in a year: the seeker sent away with the question, and the year to wait in moons.
  27: { keep: "plain", draw: () => [
    moon(19, 6.5, 2.2), moon(26, 5.5, 2.2), moon(33, 6.5, 2.2), moon(40, 5.5, 2.2),
    seated(37, 26, { s: 0.75, face: -1, fill: "malachite" }),
    head(37, 20.5, { s: 0.92, face: -1, hair: "white" }),
    limb(34.5, 28, 30.6, 22, { w: 2.2, end: 1.4 }),
    robe(15, 21, { s: 0.66, fill: "yellow", sash: "indigo" }),
    head(15, 15.3, { s: 0.9, kind: "woman" }),
    limb(16.6, 24, 21, 21.4, { w: 2.2, end: 1.3 }),
  ] },
  // 'Speak the truth', a hundred times: the slate full of the same line.
  30: { keep: "plain", draw: () => [
    seated(12, 25, { s: 0.7, fill: "yellow" }),
    head(12, 20.2, { s: 0.85, kind: "child" }),
    poly([[22, 16], [43, 16], [43, 36], [22, 36]], "shell"),
    line("M24.5,19.5 L40.5,19.5 M24.5,22.5 L40.5,22.5 M24.5,25.5 L40.5,25.5 M24.5,28.5 L40.5,28.5 M24.5,31.5 L33,31.5"),
    limb(14.4, 27.4, 32.6, 32, { w: 2, end: 0 }), line("M32.6,32 L34.4,30"),
  ] },
  // The work handed back without a mark on it: 'you don't need me for this any more'.
  37: { keep: "plain", draw: () => [
    seated(36, 24, { s: 0.8, face: -1, fill: "indigo" }),
    head(36, 18.4, { s: 0.95, face: -1, kind: "woman", hair: "white" }),
    limb(33.5, 26.5, 27, 26.4, { w: 2.2, end: 1.2 }),
    seated(12, 25, { s: 0.68, fill: "malachite" }),
    head(12, 20.2, { s: 0.86 }),
    limb(14.4, 27.6, 18, 26.6, { w: 2, end: 1.2 }),
    // the palm leaf: long and thin, the string's hole, one line of writing
    shape("M14,24.6 L32,24.6 C33,24.6 33,27.8 32,27.8 L14,27.8 C13,27.8 13,24.6 14,24.6 Z", "paleochre"), dot(16.4, 26.2, 0.55, "shell"),
    line("M18.6,26.2 L30.4,26.2"),
  ] },
  // Told after it is all over: the uncle telling it, and a house of two doors, both shut.
  46: { keep: "plain", draw: () => [
    poly([[31, 6], [46, 6], [46, 20], [31, 20]], "paleochre"),
    poly([[33.5, 10], [37.5, 10], [37.5, 20], [33.5, 20]], "indigo"), poly([[39.5, 10], [43.5, 10], [43.5, 20], [39.5, 20]], "indigo"),
    seated(13, 26, { s: 0.7, fill: "ochre" }),
    head(13, 21, { s: 0.88, hair: "grey" }),
    limb(15.4, 28.4, 20.6, 26, { w: 2.1, end: 1.3 }),
    seated(32, 29, { s: 0.64, face: -1, fill: "vermilion" }),
    head(32, 24.4, { s: 0.82, face: -1, kind: "woman" }),
    limb(30, 31, 28.4, 26.8, { w: 1.9, end: 1.1 }),
  ] },
  // Too late's mirror, before it: the mongoose on guard by the sleeping child's cradle, low and alert, its snout pointed and
  // its tail long.
  50: { keep: "plain", draw: () => [
    line("M18,10 L23,24 M38,10 L33,24"),
    shape("M-10,0 C-8,5 8,5 10,0 Z", "vermilion", { x: 28, y: 24 }),
    head(23.5, 22.6, { s: 0.55, kind: "child", hair: "black" }),
    shape("M-10,-3 C-14,-5.6 -19.6,-4.4 -22.6,-0.6 C-19,-1.4 -15,-0.6 -10.4,-0.4 Z", "ochre", { x: 28, y: 39.6 }),
    limb(19.6, 37.6, 19, 40.6, { w: 1.6, fill: "ochre", end: 0 }), limb(22.4, 38, 22.2, 40.6, { w: 1.6, fill: "ochre", end: 0 }),
    limb(31.8, 37.6, 32.2, 40.6, { w: 1.6, fill: "ochre", end: 0 }), limb(34.4, 37.2, 35.2, 40.6, { w: 1.6, fill: "ochre", end: 0 }),
    shape("M-11,-2 C-11,-5 -4,-6 2,-5.4 C5,-5.2 7,-5.8 8.4,-6.8 L13.6,-5 L8.6,-3.4 C7,-1.6 3,-0.8 -2,-0.8 C-7,-0.8 -11,-0.4 -11,-2 Z", "ochre", { x: 28, y: 39.6 }),
    shape("M6.6,-6.4 L7.4,-8.2 L8.6,-6.8 Z", "ochre", { x: 28, y: 39.6 }),
    line("M-16,-3.4 L-15,-0.8 M-19,-2.6 L-18.4,-0.8", { x: 28, y: 39.6 }),
    dot(37.8, 34.6, 0.5, "black", false),
  ] },
  // Yama teaches's mirror: Naciketas waiting at the closed door three nights, the three moons over it.
  53: { keep: "plain", draw: () => [
    poly([[1, 1], [47, 1], [47, 41], [1, 41]], "indigo", false),
    moon(20, 6, 2.2, "shell"), moon(28, 5, 2.2, "shell"), moon(36, 6, 2.2, "shell"),
    poly([[26, 12], [44, 12], [44, 40], [26, 40]], "ochre"), poly([[29, 17], [41, 17], [41, 40], [29, 40]], "black"), line("M35,17 L35,40"),
    seated(14, 26, { s: 0.68, fill: "yellow" }),
    head(14, 21.2, { s: 0.86, kind: "child" }),
  ] },
  // The guest: the plate that was going to be theirs, set before the one who came unannounced.
  56: { keep: "plain", draw: () => [
    robe(14, 20, { s: 0.68, fill: "vermilion", sash: "yellow" }),
    head(14, 14.2, { s: 0.92, kind: "woman" }),
    limb(16.2, 23, 23, 27.2, { w: 2.2, end: 1.3 }),
    dot(26.5, 29, 4.2, "malachite"), dot(25.4, 28.4, 1.2, "shell"), dot(27.8, 29.4, 1, "yellow"), dot(26.6, 30.6, 0.9, "vermilion"),
    seated(38, 24, { s: 0.75, face: -1, fill: "indigo" }),
    head(38, 18.4, { s: 0.92, face: -1, hair: "grey" }),
  ] },
  // At a wedding, the old rival again, and nothing left to feel: side by side under the leaves strung for it.
  67: { keep: "plain", draw: () => [
    line("M13,9 Q29,13 46,9"),
    ...[16, 21, 26, 31, 36, 41].map((x, k) => shape("M-1.6,0 L1.6,0 L0,4 Z", "malachite", { x, y: 9.6 + (k > 0 && k < 5 ? 1.8 : 0.6) })),
    robe(18, 21, { s: 0.68, fill: "malachite", sash: "vermilion" }),
    head(18, 15.2, { s: 0.92, hair: "grey", kind: "woman" }),
    robe(32, 21, { s: 0.68, fill: "ochre", sash: "indigo" }),
    head(32, 15.2, { s: 0.92, hair: "white" }),
  ] },
  // The roof leaked on the trunk of forty years: everything spread out to dry, and some of it not worth drying.
  75: { keep: "plain", draw: () => [
    sun(24, 7, 3.2, { rays: 10 }),
    // the trunk, its lid thrown back
    poly([[3, 19], [17, 19], [18, 30], [4, 30]], "ochre"), poly([[4, 30], [18, 30], [18, 39], [4, 39]], "ochre"), line("M4,34 L18,34"),
    cloth(22, 35, 9, 4, { fill: "vermilion", stripes: 1 }), cloth(33, 35, 9, 4, { fill: "indigo", stripe: "shell", stripes: 1 }),
    books(24, 34, 6, ["malachite"]),
    seated(36, 20, { s: 0.66, face: -1, fill: "yellow" }),
    head(36, 15.4, { s: 0.85, face: -1, hair: "white" }),
    limb(34, 22.4, 29.6, 27, { w: 2, end: 1.2 }), cloth(25, 25, 5, 4, { fill: "shell", stripe: "vermilion", stripes: 1 }),
  ] },
  // 'And then what?': asked again, and the palm held up at last.
  79: { keep: "plain", draw: () => [
    seated(13, 24, { s: 0.8, fill: "malachite" }),
    head(13, 18.4, { s: 0.95, kind: "woman", hair: "white" }),
    limb(15.5, 26, 20.5, 19.6, { w: 2.2, end: 0 }), line("M20.5,19.6 L21.2,16.6"),
    seated(36, 24, { s: 0.8, face: -1, fill: "shell" }),
    head(36, 18.4, { s: 0.95, face: -1 }),
    limb(33.5, 26, 29, 22.5, { w: 2.2, end: 1.9 }),
  ] },
  // By whom? Looking at one's own hand for a long time.
  86: { keep: "plain", draw: () => [
    seated(16, 24, { s: 0.85, fill: "indigo" }),
    head(16, 18, { s: 1, hair: "white" }),
    limb(18.6, 26.6, 25.4, 22, { w: 2.3, end: 0 }),
    shape("M0,0 C-1,-2 -1,-5 0.4,-8 L1.6,-8 L1.4,-4.6 L2.4,-9.4 L3.6,-9.4 L3.2,-4.4 L4.4,-9 L5.6,-8.8 L4.8,-4 L6,-7.6 L7.2,-7.2 L6,-2.2 C5.4,0.6 2.6,1.4 0,0 Z", "shell", { x: 25, y: 23.4 }),
  ] },
  // The last thought, chosen and practised every day: the lamp lit each morning, the mornings counted on the wall.
  96: { keep: "plain", draw: () => [
    line("M27,14 L27,20 M30,14 L30,20 M33,14 L33,20 M36,14 L36,20 M39,14 L39,20 M26,19 L40,15 M43,14 L43,20"),
    seated(15, 24, { s: 0.82, fill: "vermilion" }),
    head(15, 18.4, { s: 0.96, kind: "woman", hair: "white" }),
    limb(17.6, 26.6, 25, 30, { w: 2.2, end: 1.2 }),
    shape("M-2.6,0 L2.6,0 L1.8,1.5 L-1.8,1.5 Z", "ochre", { x: 28, y: 31.4 }), flame(28, 31.4, 5),
  ] },

  // ---- The divine row: seals, more pattern than figure ----
  // Indra: the thunderbolt in its ring.
  101: { keep: "middle", draw: () => [
    dot(24, 21, 14, "vermilion"), dot(24, 21, 11.5, "indigo"),
    poly([[22.6, 12], [25.4, 12], [25.4, 30], [22.6, 30]], "yellow"),
    shape("M-6,0 C-7,-5 -4,-8 0,-10 C4,-8 7,-5 6,0 L3,0 C4,-4 2,-6 0,-7 C-2,-6 -4,-4 -3,0 Z", "yellow", { x: 24, y: 15 }),
    shape("M-6,0 C-7,-5 -4,-8 0,-10 C4,-8 7,-5 6,0 L3,0 C4,-4 2,-6 0,-7 C-2,-6 -4,-4 -3,0 Z", "yellow", { x: 24, y: 27, s: -1, face: -1 }),
    dot(24, 21, 3, "vermilion"),
  ] },
  // Agni: the offerings still travelling. The flame over the brick altar.
  102: { keep: "middle", draw: () => [
    poly([[13, 29], [35, 29], [35, 37], [13, 37]], "ochre"),
    line("M13,33 L35,33 M20,29 L20,33 M28,29 L28,33 M16,33 L16,37 M24,33 L24,37 M32,33 L32,37"),
    flame(24, 29, 24),
  ] },
  // Surya: everything was seen. The sun's disc in its rays, and in it a face in profile with the one open eye.
  103: { keep: "middle", draw: () => [
    sun(24, 20.5, 11, { rays: 16, fill: "yellow", ray: "vermilion", long: 1.4 }),
    dot(24, 20.5, 8.2, "vermilion"),
    head(24.5, 21, { s: 1.25, hair: "none", skin: "yellow" }),
  ] },
  // Ganesha: the name still painted on one door. The elephant-headed god in profile, crowned.
  104: { keep: "middle", draw: () => [
    shape("M-9,-5 C-16,-6 -18,4 -12,9 C-9,11 -6,8 -6,4 Z", "vermilion", { x: 25, y: 20 }),
    shape("M-8,-6 C-6,-12 6,-12 9,-5 C11,0 10,5 8,8 C7,12 6,16 3,17 C1,17.5 0,16 1.5,15 C3.5,14 4,10 3,7 C1,8 -4,8 -7,4 C-9,1 -9,-3 -8,-6 Z", "shell", { x: 25, y: 20 }),
    shape("M8,6 L13,9 L8.5,8.5 Z", "shell", { x: 25, y: 20 }),
    shape("M0.5,-4 Q3,-6 5,-3.5 Q3,-2.5 0.5,-4 Z", "black", { x: 25, y: 20 }, false),
    crown(24.5, 10, 11),
  ] },
  // Moksha, for the card alone (the board keeps ॐ): the door open, and a lotus on its threshold.
  105: { keep: "card", draw: () => [
    arch(13, 5, 22, 33, "ochre"), arch(16.5, 10, 15, 28, "indigo"),
    dot(24, 17, 2.4, "yellow"),
    lotus(24, 33, 9, { fill: "vermilion", inner: "shell" }),
  ] },
  // Lakshmi: whatever was owned, divided. The lotus, and the coins falling from it.
  106: { keep: "middle", draw: () => [
    lotus(24, 22, 15, { fill: "vermilion", inner: "shell" }),
    dot(17, 33, 1.8, "yellow"), dot(24, 36, 1.8, "yellow"), dot(31, 33, 1.8, "yellow"),
  ] },
  // Saraswati: one sentence still repeated below. The swan on the water.
  107: { keep: "middle", draw: () => [
    sea(9, 30, 30, 7),
    shape("M-10,2 C-10,-3 -4,-4 2,-2 C4,-8 2,-12 5,-14 C8,-15 10,-13 9,-11 L9,-9.5 C7,-9 6,-6 7,-2 C9,1 7,6 0,6 C-6,6 -10,5 -10,2 Z", "shell", { x: 23, y: 26, s: 1.1 }),
    shape("M9,-12 L13,-10.5 L9,-9.6 Z", "vermilion", { x: 23, y: 26, s: 1.1 }),
    line("M-6,1 Q-1,-1 3,2", { x: 23, y: 26, s: 1.1 }),
    dot(31.2, 13.4, 0.7, "black", false),
  ] },
  // Brahma: somebody below still has the nose. Faces looking every way, crowned, on the lotus.
  108: { keep: "middle", draw: () => [
    lotus(24, 33, 10, { fill: "vermilion", inner: "yellow" }),
    head(19, 21, { s: 1, face: -1, hair: "black" }),
    head(29, 21, { s: 1, face: 1, hair: "black" }),
    crown(24, 13.5, 12),
  ] },
  // Vishnu: a habit still kept in one house. The discus and the conch.
  109: { keep: "middle", draw: () => [
    dot(16, 21, 7.5, "yellow"), dot(16, 21, 4.6, "vermilion"), line("M16,13.5 L16,28.5 M8.5,21 L23.5,21 M10.7,15.7 L21.3,26.3 M21.3,15.7 L10.7,26.3"), dot(16, 21, 2, "yellow"),
    shape("M-4,-8 C2,-10 6,-5 5,1 C4,6 1,9 -2,9 L-3,6 C-6,5 -7,1 -6,-3 C-6,-6 -5,-7 -4,-8 Z", "shell", { x: 33, y: 21 }),
    line("M-1,-4 Q3,-2 1,2 Q-1,4 -2,1", { x: 33, y: 21 }),
  ] },
  // Shiva: here even the name comes loose. The trident, the drum tied to it, the moon.
  110: { keep: "middle", draw: () => [
    poly([[23, 14], [25, 14], [25, 38], [23, 38]], "ochre"),
    shape("M-8,-8 C-8,-2 -4,1 0,1 C4,1 8,-2 8,-8 L6,-8 C6,-4 3,-2 1,-2 L1,-12 L0,-14 L-1,-12 L-1,-2 C-3,-2 -6,-4 -6,-8 Z", "yellow", { x: 24, y: 15 }),
    poly([[26, 19], [26, 27], [30.5, 23]], "indigo"), poly([[35, 19], [35, 27], [30.5, 23]], "indigo"),
    moon(36, 7, 4),
  ] },
};
