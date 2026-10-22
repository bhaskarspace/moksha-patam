// The scenes of the painted vignettes (REDESIGN.md Phase 13), drawn by tools/vignettes.mjs into assets/sprites.svg.
// Each is the square's moment, not its abstract name, in the Basohli manner: profile, the one eye, flat pigment, one
// outline. 48 × 48: the number is in the top-left corner (about 12 × 9) and the name along the bottom (about 7), so both
// stay clear. On a snake square the hood and body cover part of it, and on a ladder square the rails do; each scene is
// told in the part its square leaves open (`keep`, measured from the board's own geometry). The divine row's are seals,
// more pattern than figure (docs/CONTENT.md §7). 105's is the card's alone: the board keeps ॐ.
import { head, limb, robe, seated, arch, sea, sun, cloth, dot, poly, shape, line, lotus, flame, moon, pot, books, house, bowl, crown, lying } from "../tools/vignette-parts.mjs";

const bird = (x, y, s = 1, fill = "yellow") => shape("M-4,0 Q-2,-3 0,-1 Q2,-4 5,-2 Q2,0 0,1 Q-2,1 -4,0 Z", fill, { x, y, s });
const drop = (x, y) => poly([[x, y - 1.6], [x + 0.8, y + 0.4], [x - 0.8, y + 0.4]], "indigo", false);

export default {
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
