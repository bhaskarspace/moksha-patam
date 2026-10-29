// ---- Nyāya (REDESIGN.md §2.7, Phase 17 step 5) ----
// Karma is real and never perceived: it is known, when it is known, by inference, anumāna, from its signs. So the ledger
// is never shown, at any depth, and a reckoning and the door's refusal are told only as signs: the floor opening, the
// years taken, the door shut; never which deed. After a sign, any throw may be spent to infer instead of moving: the life
// stays and the year passes, and the card states the inference in the school's own form, the five members (docs/
// REFERENCE.md §1.2), ending on the deed. Nothing is counted. Its computer never infers.
// There is no win while the life lasts: the door at 105 still refuses a life owing, and opens on none for one that owes
// nothing. Release, apavarga, is the end of a life (its years, or Śiva's snake) with nothing owed (Nyāyasūtra 1.1.22:
// apavarga is the absolute release from pain); a death by the ledger never is. Pure.
import { board } from "./board.js";
import { GOAL } from "../../content.js";
import { carried, karmaOf } from "../karma.js";

// the door at the exit: it refuses as the board's does, and opens on nothing while the life lasts
export const APAVARGA = { at: GOAL, kind: "apavarga", door: true, alive: false, through: "lDoorThrough" };

// Every sign the life has met, oldest first, keyed by where in the life it came: each reckoning it lived through, and each
// refusal of the door for a debt.
export const signsOf = p => [
  ...(p.reckonings ?? []).filter(r => !r.dies).map(r => ({ key: `r${r.at}`, kind: "reckon", at: r.at, age: r.age, src: r.src, opt: r.opt, planted: r.planted, ...(r.prior ? { prior: true } : {}) })),
  ...(p.refusals ?? []).filter(r => r.debts?.length).map(r => ({ key: `d${r.at}`, kind: "door", at: r.at, debts: r.debts })),
].sort((a, b) => a.at - b.at);
// The sign a person may infer from now: the latest not yet inferred, or null. A computer never infers.
export const signOf = p => (p.type === "human" ? signsOf(p).filter(s => !(p.inferred ?? []).includes(s.key)).at(-1) ?? null : null);
const where = p => (p.pos >= 1 && p.pos <= 100) || p.pos === GOAL;
const infers = p => !!signOf(p) && where(p);

export const nyaya = {
  ...board,
  id: "nyaya",
  exit: () => APAVARGA,
  // no examination at the door (its questions name the debts); a sign offers its inference beside the moves
  movesFor: (state, dice, base) => {
    const p = state.players[state.turn], out = p.pos === GOAL ? base.filter(Boolean) : base;
    return infers(p) && !out.includes(0) ? [...out, 0] : out;
  },
  zero: (state, i) => (infers(state.players[i]) ? { act: "infer", line: "lInfer" } : null),
  acted: (state, i, act) => (act === "infer" ? { infer: signOf(state.players[i]) } : {}),
  afterTurn: (state, plan, p) => { if (plan.infer) p.inferred = [...(p.inferred ?? []), plan.infer.key]; },
  freed: (state, i, plan) => {
    const p = state.players[i];
    return (plan.fell || (plan.died && !plan.death)) && !carried(karmaOf(p)).length ? "apavarga" : null;
  },
  veiled: true,
  text: { ...board.text, name: "lawNyaya", about: "lawNyayaAbout", scholar: "lawNyayaScholar", reckon: "lSign",
    win: { line: "lApavarga", path: "pathApavarga", title: "winTitleApavarga", human: "winHumanApavarga", cpu: "winCpuApavarga", end: "lifeEndApavarga", note: "winNoteApavarga" } },
};
