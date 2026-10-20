// ---- The line under the board (REDESIGN.md Phase 11) ----
// Not every landing deserves a stop. An ordinary square is told here in one line, its name and its moment, and the
// full card opens only for what changes a life: a snake, a ladder, a situation, someone met by name, a realm first
// reached, the exit. The line is the person's own: a computer's turn goes to the moves log only, and never writes here,
// so the moment stays put while the reader watches the others walk. It stays until their next roll, and opens the card.
// Its height is kept when empty, so the turn panel and the Roll under it never move.
import { lang } from "../i18n.js";
import { G } from "../state.js";
import { $, esc } from "../ui.js";
import { labEls } from "./board.js";
import { momentLine, openSquare } from "./card.js";

const el = $("landed");
let last = null; // { n, who, told }, the person's last landing, and the option told there if they chose one

// A person's landing on square n, told by its moment. A situation's is told by the option chosen, kept here since the
// option's ladder or snake takes the token off the square.
export const landHuman = (n, who, told) => { last = { n, who, told }; drawLanded(); };
export const clearLanded = () => { last = null; drawLanded(); };

export function drawLanded() {
  const s = G.state;
  const { title, text } = last && s && s.players[last.who]?.pos != null ? momentLine(last.n, last.who, lang, last.told) : {};
  if (!text && !title) { el.dataset.empty = ""; el.innerHTML = ""; el.tabIndex = -1; return; }
  el.innerHTML = `<span class="landed-t">${title ? `<b>${esc(title)}</b> ` : ""}${esc(text)}</span>`;
  el.dataset.sq = last.n;
  delete el.dataset.empty;
  el.tabIndex = 0;
}

el.addEventListener("click", () => { if (last) openSquare(last.n, { from: labEls[last.n], who: last.who }); });
