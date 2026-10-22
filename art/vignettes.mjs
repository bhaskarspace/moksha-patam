// The scenes of the painted vignettes (REDESIGN.md Phase 13), drawn by tools/vignettes.mjs into assets/sprites.svg.
// Each is the square's moment, not its abstract name, in the Basohli manner: profile, the one eye, flat pigment, one
// outline. 48 × 48: the number is in the top-left corner (about 12 × 9) and the name along the bottom (about 7), so both
// stay clear. On a snake square the hood covers the middle and on a ladder square the foot does, so those scenes are
// told at the sides (`keep`).
import { head, limb, robe, seated, arch, sea, sun, cloth, dot } from "../tools/vignette-parts.mjs";

export default {
  // Fibbing: a child tells the class about a holiday by the sea that never happened. The child at the left, arm up in
  // the telling; at the right, in a niche of its own, the sea that was never there.
  19: { keep: "sides", draw: () => [
    arch(31, 8, 15, 30, "yellow"),
    sun(38.5, 16, 3, { rays: 10 }),
    sea(31, 27, 15, 11),
    robe(8, 22.5, { s: 0.75, fill: "yellow", sash: "vermilion" }),
    limb(10.5, 25, 15.5, 14.5, { w: 3.2, end: 2 }),
    head(8, 16.5, { s: 1.05, kind: "child" }),
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
  // Surya: everything was seen. A seal, more pattern than figure: the sun's disc in its rays, and in it a face in profile
  // with the one open eye.
  103: { keep: "middle", draw: () => [
    sun(24, 20.5, 11, { rays: 16, fill: "yellow", ray: "vermilion", long: 1.4 }),
    dot(24, 20.5, 8.2, "vermilion"),
    head(24.5, 21, { s: 1.25, hair: "none", skin: "yellow" }),
  ] },
};
