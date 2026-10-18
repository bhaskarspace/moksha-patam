// The board's content, kept as data in content/*.json.
import squares from "../content/squares.json" with { type: "json" };
import strings from "../content/strings.json" with { type: "json" };

// Base/head → { to, ic, en, hi, skt, story: [en, hi], src }
export const { GOAL, ROWS, ASHRAMAS, LADDERS, SNAKES, HEAVEN } = squares;
// Every other earthly square: [symbol, en, hi, story en, story hi, source].
export const { SQ } = squares;
export const { STR, SRC_HI } = strings;
