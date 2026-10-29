// ---- Mīmāṃsā (REDESIGN.md §2.7, Phase 17 step 3) ----
// The law of the Veda's injunctions: an act done is a debt or a merit, and its fruit is certain. So nothing is hidden. Each
// option says, before it is chosen, the debt it would plant and the age it ripens at, and the ledger is always shown, in
// words. The exit is svarga, not mokṣa: the exact landing on Indra's heaven (101) with nothing carried. 105 is an
// ordinary square, with no door. Above it the heavens and Śiva's snake are the board's. The computer sees every
// consequence, and so plays honest. Pure.
import { board } from "./board.js";
import { GOAL } from "../../content.js";
import { choiceFor, policyOr } from "../qbn.js";

// Indra's heaven, the first square of the divine row
export const SVARGA = { at: 101, kind: "svarga", door: false, owed: "lSvargaOwed" };

export const mimamsa = {
  ...board,
  id: "mimamsa",
  // no door at 105, so nobody sits there to be examined
  movesFor: (state, dice, base) => (state.players[state.turn].pos === GOAL ? base.filter(Boolean) : base),
  exit: () => SVARGA,
  foresight: true,
  choose: (state, sit) => choiceFor(state, sit, policyOr("honest")),
  text: { ...board.text, name: "lawMimamsa", about: "lawMimamsaAbout", above: "aboveMimamsa",
    win: { line: "lSvarga", path: "pathSvarga", title: "winTitleSvarga", human: "winHumanSvarga", cpu: "winCpuSvarga", end: "lifeEndSvarga", note: "winNoteSvarga" } },
};
