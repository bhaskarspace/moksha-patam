// ---- The board's law (REDESIGN.md §2.7, §3.2, Phase 17) ----
// The game as it stands after Phase 17's first step: situations, the omen, the curse, the door at 105, the heavens that
// last as long as the merit, and Śiva's snake as rebirth in the seat. Every hook a law can set is here, as this law
// plays it; another law spreads this one and changes only what it changes (src/engine/laws/index.js). Pure.
import { situationAt, choiceFor } from "../qbn.js";
import { GOAL, LADDERS } from "../../content.js";

// The board's exit: mokṣa at 105, behind a door that refuses a life still owing (src/engine/karma.js refusalOf). A law
// whose exit has no door wins on the exact landing with nothing carried, and says so (owed) when something is.
const MOKSHA = { at: GOAL, kind: "moksha", door: true };

export const board = {
  id: "board",
  // offered to a player to choose (the animal interlude is a law too, but never chosen)
  choosable: true,
  // the moves a roll offers, as the engine finds them (src/engine/turn.js movesFor)
  movesFor: (state, dice, base) => base,
  // the exit: where the life is let go, of what kind, and whether a door stands there; null for none
  exit: () => MOKSHA,
  // whether choices plant debts and the life carries a ledger (karma's three buckets)
  karma: true,
  // whether every consequence is shown before the choice, and the ledger always, in words (Mīmāṃsā)
  foresight: false,
  // whether the soul goes on to another life once this one ends
  rebirth: true,
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
  // a ladder taken on landing at its foot: climbed "now", or the life "wait"s at the foot (Jain); and whether move v,
  // from the foot the life stands at, climbs it (the admitting 1 under the Jain law; never on the board)
  climb: () => "now",
  fromFoot: () => false,
  // whether a climb from foot is suppression (upaśama), which the book at the door does not take as an answer (Jain)
  suppressed: () => false,
  // the square a ladder's climb reaches (Bhakti: Devotion, the one ladder to the end)
  ladderTo: (state, i, foot) => LADDERS[foot]?.to ?? foot,
  // grace (Bhakti): the faces on which the lower choice on an ego test is overturned toward the higher, and on which the
  // door forgives a debt the book cannot answer; null for none
  grace: () => null,
  forgive: () => false,
  // what the door asks last, once every debt is met (Jain: the merit the life is proud of), or null
  binds: () => null,
  // anything the law keeps once a turn is over
  afterTurn: () => {},
  // its name and its two or three sentences, the lines of Śiva's snake and the merit spent, the heavens' card, and the
  // win: its log line, its title and text at the end of the game, and the account's last line (null: the board's own)
  text: { name: "lawBoard", about: "lawBoardAbout", siva: "lSiva", spent: "lSpent", above: "aboveExit", end: null, fell: null,
    win: { line: "lWin", path: "pathWin", title: "winTitle", human: "winHuman", cpu: "winCpu", end: null, note: null } },
};
