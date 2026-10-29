// ---- The line under the board (REDESIGN.md Phase 11) ----
// Not every landing deserves a stop. An ordinary square is told here in one line, its name and its moment, and the
// full card opens only for what changes a life: a snake, a ladder, a situation, someone met by name, a realm first
// reached, the exit. The line is the person's own: a computer's turn goes to the moves log only, and never writes here,
// so the moment stays put while the reader watches the others walk. It stays until their next roll, and opens the card.
// The one exception is the door (REDESIGN.md Phase 14): whoever comes to 105, a computer too, is told here, refused, let
// through, examined a year at a time, or dying there, so nobody's refusal is invisible.
// Its height is kept when empty, so the turn panel and the Roll under it never move.
import { GOAL, squareOf } from "../content.js";
import { isAnimal, TALES } from "../engine/animal.js";
import { lang, tIn, fill } from "../i18n.js";
import { G, pnameIn } from "../state.js";
import { refusalIn, examLinesIn, debtsIn } from "../engine/karma.js";
import { curseSaidIn } from "../engine/curse.js";
import { lawOf } from "../engine/laws/index.js";
import { $, esc } from "../ui.js";
import { labEls } from "./board.js";
import { momentLine, openSquare } from "./card.js";

const el = $("landed");
let last = null; // { n, who, told }, the person's last landing, and the option told there if they chose one; or { n, who, door }

// A person's landing on square n, told by its moment. A situation's is told by the option chosen, kept here since the
// option's ladder or snake takes the token off the square.
// ego is the throw on a situation, when there was one (Phase 15)
export const landHuman = (n, who, told, ego = null) => { last = { n, who, told, ego }; drawLanded(); };
// What happened at the door to player who, for anyone: door is { kind: "refused", refusal, sit }, { kind: "through" },
// { kind: "open" } (Nyāya: the door opened on no win),
// { kind: "exam", ex } or { kind: "died", debts } (ex.debts and debts: what is still owed should the years run out there),
// told in the door's words, in the language of the moment it is drawn.
export const landDoor = (who, door) => { last = { n: GOAL, who, door }; drawLanded(); };
function doorLine(l, { who, door }) {
  const p = G.state.players[who], w = { name: pnameIn(p, l), gender: p.gender };
  // under a law that veils karma (Nyāya) the refusal is a sign, and its door opens on no win (open)
  if (door.kind === "refused") return { title: tIn(l, "endRefused"), text: refusalIn(l, door.refusal, w, door.sit, lawOf(G.state, who).veiled).join(" ") };
  if (door.kind === "through") return { title: tIn(l, "moksha"), text: fill(tIn(l, "doorThrough", w), w) };
  if (door.kind === "open") return { title: tIn(l, "moksha"), text: fill(tIn(l, "doorOpenOn", w), w) };
  if (door.kind === "died") return { title: tIn(l, "moksha"), text: fill(tIn(l, "doorDied", { name: w.name, debts: debtsIn(l, door.debts, w) }), w) };
  const died = door.ex.died ? [fill(tIn(l, "doorDied", { name: w.name, debts: debtsIn(l, door.ex.debts, w) }), w)] : [];
  return { title: tIn(l, "moksha"), text: [...examLinesIn(l, door.ex, w), ...died].join(" ") };
}
// The curse, on the landing it was spoken at (Phase 14): the person's line goes on with the sentence, said once.
export const landCurse = (who, n) => { last = last?.who === who && last.n === n ? { ...last, curse: true } : { n, who, curse: true, only: true }; drawLanded(); };
const curseLine = (l, who) => { const p = G.state.players[who]; return curseSaidIn(l, p, pnameIn(p, l)); };
export const clearLanded = () => { last = null; drawLanded(); };
// Phase 17: a throw in the heavens that offered no die, a person's own; and Śiva's snake, which is public as the door
// is: anyone's life closed there and the same soul born again in the seat (was, its index in p.past)
export const landStay = (who, n) => { last = { n, who, stay: true }; drawLanded(); };
export const landReborn = (who, was) => { last = { n: 1, who, was }; drawLanded(); };
function bornLine(l, { who, stay, was }) {
  const p = G.state.players[who], w = { name: pnameIn(p, l), gender: p.gender };
  if (stay) return { title: tIn(l, "stayTitle"), text: fill(tIn(l, "heavenStay", w), w) };
  const q = p.past?.[was];
  return { title: tIn(l, "bornAgainHead"), text: fill(tIn(l, "bornAgainLine", { name: w.name, was: q ? pnameIn(q, l) : "" }), w) };
}

export function drawLanded() {
  const s = G.state;
  // an animal's landing (Phase 16): the square's name, and on a fable its Panchatantra mirror, told as the moment
  const animalLine = n => { const q = squareOf(n); return { title: q?.[lang] || q?.en || "", text: TALES.includes(n) ? q?.mirror?.[lang] || q?.mirror?.en || "" : "" }; };
  let { title, text } = !last || !s ? {} : isAnimal(s) && !last.door ? animalLine(last.n) : last.door ? doorLine(lang, last) : last.stay || last.was != null ? bornLine(lang, last) : last.only ? {} : s.players[last.who]?.pos != null ? momentLine(last.n, last.who, lang, last.told, last.ego) : {};
  if (last?.curse && s) text = [text, curseLine(lang, last.who)].filter(Boolean).join(" ");
  if (!text && !title) { el.dataset.empty = ""; el.innerHTML = ""; el.tabIndex = -1; return; }
  el.innerHTML = `<span class="landed-t">${title ? `<b>${esc(title)}</b> ` : ""}${esc(text)}</span>`;
  el.dataset.sq = last.n;
  delete el.dataset.empty;
  el.tabIndex = 0;
}

el.addEventListener("click", () => { if (last) openSquare(last.n, { from: labEls[last.n], who: last.who }); });
