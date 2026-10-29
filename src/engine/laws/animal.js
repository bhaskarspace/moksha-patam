// ---- The animal interlude as a law (REDESIGN.md Phase 16, src/engine/animal.js) ----
// The board is squares 1 to 40, one die, at most ANIMAL_TURNS throws; no omen, no situation, no curse, no heavens. The
// edge of the forest earns the human birth back; the throws running out short of it is an animal once more. Pure.
import { board } from "./board.js";
import { ANIMAL_TOP, ANIMAL_TURNS } from "../animal.js";
import { entry } from "../turn.js";

export const animal = {
  ...board,
  id: "animal",
  choosable: false,
  edge: () => ANIMAL_TOP,
  situation: () => null,
  omen: () => false,
  curse: () => false,
  merit: () => false,
  siva: () => "out",
  // each throw is counted, and the last one short of the forest's edge ends the interlude
  afterTurn: (state, plan, p) => {
    p.throws = (p.throws ?? 0) + 1;
    if (plan.earned) p.earned = true;
    else if (p.throws >= ANIMAL_TURNS) { p.short = true; plan.end.push(entry("lAnimalShort", {}, "", plan.idx)); }
  },
  text: { name: "lawAnimal", about: "lawAnimalAbout" },
};
