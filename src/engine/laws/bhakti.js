// ---- Bhakti (REDESIGN.md §2.7 Dvaita, the thesis's Vaiṣṇava rules; Phase 17 step 4) ----
// Grace is the ego's rebellion reversed. On the ego tests, choosing the lower option throws grace's die, and on one of its
// faces the life does the higher instead. It is neither earned nor predictable, and never shown before the choice. The
// faces are the threshold's: the 1, and the 2 as well once the life has climbed Devotion. At the door, rarely, grace
// forgives a debt the book cannot answer, even one no penance pays: once a life, on the same faces. And Devotion is the
// one ladder to the end (the 72-board's bhakti): it goes to the top of the last ladder, the end of the earth, with the
// door still ahead. The painted ladder stays the board's, which every law shares. The computer chooses honestly. Pure.
import { board } from "./board.js";
import { LADDERS } from "../../content.js";
import { makeRng, die } from "../../rng.js";
import { yearsAlong } from "../self.js";
import { choiceFor, policyOr } from "../qbn.js";
import { debtKey } from "../karma.js";

// Devotion, by what it is (guru-bhakti), and the end of the earth: the highest top any ladder reaches
export const DEVOTION = +Object.keys(LADDERS).find(n => /bhakti/i.test(LADDERS[n].skt ?? ""));
export const END = Math.max(...Object.values(LADDERS).map(l => l.to));

// Whether player p has climbed Devotion in this life
export const devoted = p => yearsAlong(p.life ?? [], p.told ?? []).some(e => e.via === "ladder" && e.from === DEVOTION);
// grace's faces for p: the threshold's 1, and the 2 once Devotion is climbed
export const graceFaces = p => (devoted(p) ? [1, 2] : [1]);

// A string's hash, to salt the door's grace by the debt it is about
const hash = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0, 0x811c9dc5);

export const bhakti = {
  ...board,
  id: "bhakti",
  ladderTo: (state, i, foot) => (foot === DEVOTION ? END : board.ladderTo(state, i, foot)),
  grace: (state, i) => graceFaces(state.players[i]),
  // once a life, in a year at the door the book cannot answer: grace's die, off a sequence of its own (the debt, the year
  // asked, the life), on grace's faces
  forgive: (state, i, s, n) => {
    const p = state.players[i];
    if (p.sittings?.some(x => x.graced)) return false;
    if (state.forceGrace) return graceFaces(p).includes(state.forceGrace);
    const face = die(makeRng((state.rng.seed ^ 0x5bd1e995 ^ hash(debtKey(s)) ^ Math.imul(n, 0x27d4eb2f) ^ Math.imul(p.rebirths ?? 0, 0x165667b1)) >>> 0));
    return graceFaces(p).includes(face);
  },
  choose: (state, sit) => choiceFor(state, sit, policyOr("honest")),
  text: { ...board.text, name: "lawBhakti", about: "lawBhaktiAbout" },
};
