// ---- The board's law (REDESIGN.md §2.7, §3.2, Phase 17) ----
// The game as it stands after Phase 17's first step: situations, the omen, the curse, the door at 105, the heavens that
// last as long as the merit, and Śiva's snake as rebirth in the seat. Every hook a law can set is here, as this law
// plays it; another law spreads this one and changes only what it changes (src/engine/laws/index.js). Pure.
import { situationAt, choiceFor } from "../qbn.js";

export const board = {
  id: "board",
  // offered to a player to choose (the animal interlude is a law too, but never chosen)
  choosable: true,
  // the moves a roll offers, as the engine finds them (src/engine/turn.js movesFor)
  movesFor: (state, dice, base) => base,
  // the square at or past which a walk completes the life without the door (null: none, the board runs to 110)
  edge: () => null,
  // the situation a landing on n offers, or null
  situation: (state, i, n) => situationAt(n),
  // how a computer chooses on a situation
  choose: (state, sit) => choiceFor(state, sit),
  // whether the omen may fire, a curse is spoken, the heavens spend merit
  omen: () => true,
  curse: () => true,
  merit: () => true,
  // what Śiva's snake does to the life it takes: "reborn" in the seat, or "out" of the game
  siva: () => "reborn",
  // anything the law keeps once a turn is over
  afterTurn: () => {},
  // its name and its two or three sentences, in content/strings.json
  text: { name: "lawBoard", about: "lawBoardAbout" },
};
