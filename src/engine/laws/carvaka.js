// ---- Cārvāka (REDESIGN.md §2.7, Phase 17 step 3) ----
// Perception is the only means of knowing, so there is no unseen fruit of an act and no life after this one. Choices plant
// nothing, there is no omen and no curse, and the life carries no ledger. There is no door and no win: 105 is an
// ordinary square. Śiva's snake ends the life, and nothing is born of it (the one exception to step 1). The account is
// the result. The computer takes whatever brings the most wealth and pleasure. Pure.
import { board } from "./board.js";
import { GOAL } from "../../content.js";
import { choiceFor, policyOr } from "../qbn.js";

export const carvaka = {
  ...board,
  id: "carvaka",
  movesFor: (state, dice, base) => (state.players[state.turn].pos === GOAL ? base.filter(Boolean) : base),
  exit: () => null,
  karma: false,
  rebirth: false,
  omen: () => false,
  curse: () => false,
  siva: () => "out",
  choose: (state, sit) => choiceFor(state, sit, policyOr("pleasure")),
  text: { ...board.text, name: "lawCarvaka", about: "lawCarvakaAbout", siva: "lSivaOnce", spent: "lSpentOnce", above: "aboveCarvaka", end: "lifeEndOnce", fell: "lifeEndFellOnce" },
};
