// ---- The book as it is written (REDESIGN.md Phase 20, step 0) ----
// On a desktop 1400px and wider the left of the page is the life's book, written as the life goes: the account
// (src/engine/account.js), newest line at the bottom, in the card's manuscript idiom. Before its first line it holds
// the few lines about the game that sit under the panel at other widths. Played together it follows the person whose
// turn it is, with a tab for every seat; on an old cloth it is the path by legend. Narrower, it is never drawn: the
// book stays behind "Read the lives". It is aria-live polite and never takes focus; only its new lines are added, so
// a screen reader hears the new lines and nothing twice.
import { lang, tIn } from "../i18n.js";
import { G, pnameIn } from "../state.js";
import { $, COLORS, esc, reduced } from "../ui.js";
import { lifeOf } from "../engine/account.js";
import { isCloth } from "../engine/cloth.js";
import { BOARD_ID, legendOf } from "../content.js";
import { sqNumIn } from "./board.js";

const wide = matchMedia("(min-width: 1400px)");
const who = $("bookWho"), text = $("bookText"), scroller = $("bookScroll");
// the seat shown, the game it belongs to, the turn last seen, and what was last written, to write only what changed
let whose = 0, game = null, lastTurn = -1, key = "";

// The book's blocks for seat i, in language l: [{ tag, cls, text }]
function blocksOf(state, i, l) {
  const p = state.players[i], T = (k, v) => tIn(l, k, v);
  const intro = [{ tag: "p", cls: "life-open book-intro", text: T(isCloth() ? `board${BOARD_ID}About` : "intro") }];
  if (!p.life?.length) return intro;
  if (isCloth()) {
    return [{ tag: "h2", cls: "", text: T("pathOf", { name: pnameIn(p, l) }) },
      ...p.life.map(n => ({ tag: "p", cls: "book-path", text: `${sqNumIn(l, n)}  ${legendOf(n)?.[l] ?? ""}` }))];
  }
  const { title, paras, end, curse, fates } = lifeOf(state, i, l);
  const out = [{ tag: "h2", cls: "", text: title }];
  for (const q of paras) out.push({ tag: "h3", cls: "sub", text: q.head }, { tag: "p", cls: "", text: q.text });
  // a life still being lived has no ending yet; one the game has closed is read to its end, as the book reads it
  if (state.over) {
    const e = [end, curse].filter(Boolean).join(" ");
    if (e) out.push({ tag: "p", cls: "life-end", text: e });
    if (fates.length) out.push({ tag: "p", cls: "life-fates", text: fates.join(" ") });
  }
  return out;
}

// Write only what changed: a block whose text grew is rewritten in place, new blocks are added, stale ones removed.
function write(blocks) {
  const kids = text.children;
  for (let k = 0; k < blocks.length; k++) {
    const b = blocks[k], el = kids[k];
    if (el && el.tagName === b.tag.toUpperCase() && el.className === b.cls) {
      if (el.textContent !== b.text) el.textContent = b.text;
      continue;
    }
    while (kids.length > k) text.lastChild.remove();
    const n = document.createElement(b.tag);
    if (b.cls) n.className = b.cls;
    n.textContent = b.text;
    text.appendChild(n);
  }
  while (kids.length > blocks.length) text.lastChild.remove();
}

function tabs(state, l) {
  if (state.players.length < 2) { who.hidden = true; who.innerHTML = ""; return; }
  who.hidden = false;
  who.setAttribute("aria-label", tIn(l, "lifeWhose"));
  who.innerHTML = state.players.map((p, i) =>
    `<button type="button" data-who="${i}" aria-pressed="${i === whose}"><span class="dot" style="background:${COLORS[p.color]}"></span>${esc(pnameIn(p, l))}</button>`).join("");
}

// After every turn (main.js render). Cheap when nothing in the shown life has changed, and nothing at all below 1400px.
export function drawBook() {
  if (!wide.matches) return;
  const state = G.state;
  if (!state) return;
  if (state !== game) {
    game = state; lastTurn = -1; key = "";
    whose = Math.max(0, state.players.findIndex(p => p.type === "human"));
  }
  // the book follows the person whose turn it is; a computer's turn leaves it where it is, and so does a seat the
  // reader chose, until the next person's turn
  if (state.turn !== lastTurn) {
    lastTurn = state.turn;
    if (state.players[state.turn]?.type === "human" && !state.over) whose = state.turn;
  }
  if (whose >= state.players.length) whose = 0;
  const p = state.players[whose], l = lang;
  const k = [state.rng.seed, BOARD_ID, whose, l, state.players.length, p.name, p.rebirths ?? 0, p.past?.length ?? 0, p.life?.length ?? 0, p.told?.length ?? 0, p.years, !!state.over, state.players.map(q => q.name).join()].join("|");
  if (k === key) return;
  const sameLife = key.split("|").slice(0, 8).join("|") === k.split("|").slice(0, 8).join("|");
  key = k;
  tabs(state, l);
  text.lang = l;
  const atEnd = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 32;
  // a new life, seat or language is written whole and silently; only the lines added to the same life are spoken
  if (!sameLife) { text.setAttribute("aria-live", "off"); text.replaceChildren(); }
  write(blocksOf(state, whose, l));
  if (!sameLife) requestAnimationFrame(() => text.setAttribute("aria-live", "polite"));
  // newest line at the bottom: kept in view unless the reader has scrolled back up to read
  if (atEnd || !sameLife) scroller.scrollTo({ top: scroller.scrollHeight, behavior: reduced || !sameLife ? "instant" : "smooth" });
}

who.addEventListener("click", e => {
  const b = e.target.closest("button[data-who]");
  if (!b) return;
  whose = +b.dataset.who;
  key = "";
  drawBook();
});
wide.addEventListener("change", () => { key = ""; drawBook(); });
