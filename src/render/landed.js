// ---- The line under the board (REDESIGN.md Phase 11) ----
// Not every landing deserves a stop. An ordinary square is told here in one line, its name and its moment, and the
// full card opens only for what changes a life: a snake, a ladder, a situation, someone met by name, a realm first
// reached, the exit. A computer's turn is always told here. The line stays until the next roll, and opens the card.
import { lang, L } from "../i18n.js";
import { G } from "../state.js";
import { $, esc } from "../ui.js";
import { labEls } from "./board.js";
import { entryText } from "./log.js";
import { momentLine, openSquare } from "./card.js";

const el = $("landed");
let last = null; // { n, who } for a person's landing, { n, who, entry, opt } for a computer's

// A person's landing on square n, told by its moment.
export const landHuman = (n, who) => { last = { n, who }; drawLanded(); };
// A computer's: what the log says of it, and the option it took on a situation.
export const landCpu = (n, who, entry, opt) => { last = { n, who, entry, opt }; drawLanded(); };
export const clearLanded = () => { last = null; drawLanded(); };

export function drawLanded() {
  const s = G.state;
  if (!last || !s || s.players[last.who]?.pos == null) { el.hidden = true; el.innerHTML = ""; return; }
  const { n, who, entry, opt } = last;
  let title, text;
  if (entry) { title = ""; text = entryText(entry) + (opt ? ` · ${L(opt.label.en, opt.label.hi || opt.label.en)}` : ""); }
  else ({ title, text } = momentLine(n, who, lang));
  if (!text && !title) { el.hidden = true; return; }
  el.innerHTML = `<span class="landed-t">${title ? `<b>${esc(title)}</b> ` : ""}${esc(text)}</span>`;
  el.dataset.sq = n;
  el.hidden = false;
}

el.addEventListener("click", () => { if (last) openSquare(last.n, { from: labEls[last.n], who: last.who }); });
