// ---- The Jain law (REDESIGN.md §2.7, Phase 17 step 4) ----
// From Jeṭhābhāī's rules and the Jain verses, three rules and no new state. Ladders are not automatic: a life that lands
// at a ladder's foot stands there, and climbs on a later turn only on the admitting 1 (the die it moves by); any other
// throw moves it on, and the ladder is lost. "If the soul stops for a moment at their feet, it goes to stop above." A
// climb made while the vice the ladder heals is still held (a debt of it carried, and its snake the one most taken) is
// suppression, upaśama: the climb is real, but the vice stays and fruits later, and the book at the door does not take it
// as the answer. A climb made clean is destruction, kṣapaka, and answers as on the board. And merit binds too: once every
// debt is met, the door asks last after the good the life is proud of, and it is let go in a year sat there. The omen
// stays on the 6. The computer chooses honestly. Pure.
import { board } from "./board.js";
import { LADDERS } from "../../content.js";
import { choiceFor, policyOr, optionOf, worthOf } from "../qbn.js";
import { suppressedAt, MERIT_KEY } from "../karma.js";

// The admitting face: the threshold's (tests/faces.test.mjs)
export const ADMITS = 1;

// Whether player p stands at a ladder's foot it may still climb: landed there last, by a throw or by an option that
// took the ladder. Turned away from it by an option that stayed, or brought there by a reckoning, it may not.
export function atFoot(p) {
  const n = p.pos, k = (p.life?.length ?? 0) - 1;
  if (!LADDERS[n] || k < 0 || p.life[k] !== n) return false;
  const told = p.told?.length === p.life.length ? p.told[k] : null;
  if (told == null || told === "else") return true;
  return optionOf(n, told)?.move === "ladder";
}

// The merit the life is proud of: the deed of most worth it did (a situation's option with a deed to dream of), the
// latest of equals; null when it did none worth the name, or has already let it go at the door.
export function meritOwn(p) {
  if (p.exam?.[MERIT_KEY]) return null;
  let best = null;
  for (const w of p.witness ?? []) {
    const o = optionOf(w.sq, w.took);
    if (o?.dream && worthOf(o) > 0 && (!best || worthOf(o) >= best.worth)) best = { sq: w.sq, opt: o.id, worth: worthOf(o) };
  }
  return best && { sq: best.sq, opt: best.opt };
}

export const jain = {
  ...board,
  id: "jain",
  climb: () => "wait",
  fromFoot: (state, i, v) => v === ADMITS && atFoot(state.players[i]),
  suppressed: (state, i, foot) => suppressedAt(state.players[i], foot),
  binds: (state, i) => meritOwn(state.players[i]),
  choose: (state, sit) => choiceFor(state, sit, policyOr("honest")),
  text: { ...board.text, name: "lawJain", about: "lawJainAbout" },
};
