// ---- Sāṃkhya (REDESIGN.md §2.7, Phase 17 step 5) ----
// Prakṛti acts; puruṣa only watches. "Actions are done in every case by the guṇas of prakṛti; the one deluded by the ego
// thinks, I am the doer" (Gītā 3.27). The person still throws, and the game chooses for them: the die (as the game's own
// computer does, moveFor) and the option on a situation, by the guṇa that leads the life: sattva the one of most worth,
// rajas the most wealth and pleasure, tamas the cheapest in years; in balance, the game's own. The card tells it as
// prakṛti acting, with the options passed over greyed beside it. The account closes on the dancer of Sāṃkhyakārikā 59.
// Offered only after a life under another law: a first life is always the board's (src/main.js lawsOffered). Pure.
import { board } from "./board.js";
import { choiceFor, policyOr } from "../qbn.js";
import { freshGunas } from "../self.js";

// the guṇa leading player p, or null when none does (prakṛti in balance)
export function leadOf(p) {
  const g = p.gunas ?? freshGunas(), [[k, v], [, w]] = Object.entries(g).sort((a, b) => b[1] - a[1]);
  return v - w > 1e-9 ? k : null;
}
export const POLICY_OF = { s: "honest", r: "pleasure", t: "inert" };

export const sankhya = {
  ...board,
  id: "sankhya",
  auto: true,
  choose: (state, sit) => choiceFor(state, sit, policyOr(POLICY_OF[leadOf(state.players[state.turn])] ?? "mixed")),
  text: { ...board.text, name: "lawSankhya", about: "lawSankhyaAbout", scholar: "lawSankhyaScholar", end: "sankhyaDancer", endSrc: "sankhyaDancerSrc" },
};
