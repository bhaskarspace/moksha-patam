// ---- Advaita (REDESIGN.md §2.7, Phase 17 step 5) ----
// Liberation is not arrival but recognition: there was never anywhere to go. Arriving at 105 wins nothing, and there is no
// door there, only something not yet recognised. From the sixth bhūmikā a sannyāsin may recognise in place of a move, on
// any square of earth, and that is the win. The sixth is padārthābhāvanī, objects no longer appearing (Yogavāsiṣṭha,
// Varāha Upaniṣad 4), so under this law the painted art of the board dissolves with the bhūmikā, toward it: the stage
// itself, not decoration (src/render/age.js). Only the art: labels, cards and tokens never dim. Pure.
import { board } from "./board.js";
import { GOAL } from "../../content.js";

// the sixth bhūmikā (src/engine/self.js BHUMIKA_AT, counted from the first at 0)
export const RECOGNISE_AT = 5;
// whether player p may recognise now: in the sixth bhūmikā or the seventh, on earth
export const recognises = p => (p.bhumika ?? -1) >= RECOGNISE_AT && p.pos >= 1 && p.pos <= 100;

export const advaita = {
  ...board,
  id: "advaita",
  exit: () => null,
  // no door at 105, so nobody sits there to be examined; and recognition offered beside the moves
  movesFor: (state, dice, base) => {
    const p = state.players[state.turn], out = p.pos === GOAL ? base.filter(Boolean) : base;
    return recognises(p) && !out.includes(0) ? [...out, 0] : out;
  },
  zero: (state, i) => (recognises(state.players[i]) ? { act: "recognise", line: "lRecognise", kind: "recognition" } : null),
  // its computer recognises whenever it may
  prefer: (state, moves) => (moves.includes(0) && recognises(state.players[state.turn]) ? 0 : null),
  dissolve: true,
  text: { ...board.text, name: "lawAdvaita", about: "lawAdvaitaAbout", scholar: "lawAdvaitaScholar", goal: "advaitaGoal", above: "aboveAdvaita",
    win: { line: "lRecognised", path: "pathRecognised", title: "winTitleRecognised", human: "winHumanRecognised", cpu: "winCpuRecognised", end: "lifeEndRecognised", note: "winNoteRecognised" } },
};
