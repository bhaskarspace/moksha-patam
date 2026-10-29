// ---- The life account (docs/NARRATIVE.md §9): the dialog ----
// The prose itself is written by src/engine/account.js, which runs in node too. Since Phase 16 the life is read three
// ways, as tabs: the book (the account, Citragupta reading it; he is the hand, never a character), the path (the moves,
// pathOf) and the mirror (three questions put to the player, src/engine/mirror.js, answered nowhere and kept nowhere).
import { lang, tIn, numIn } from "../i18n.js";
import { G, pnameIn } from "../state.js";
import { $, COLORS, esc } from "../ui.js";
import { lifeOf, lifeText as textOf, pathOf } from "../engine/account.js";
import { mirrorOf, mirrorIn, mirrorIntroIn } from "../engine/mirror.js";
import { pastOf } from "../engine/samskara.js";
import { lawOf } from "../engine/laws/index.js";
import { prefs } from "../prefs.js";

const dlg = $("lifeDlg"), leaf = $("lifeLeaf");
// past: which of the seat's lives closed by Śiva's snake is read (Phase 17, p.past), or null for the one in it now
let whose = 0, tab = "book", past = null;
const TABS = ["book", "path", "mirror"], TAB_KEY = { book: "lifeBook", path: "lifePath", mirror: "lifeMirror" };

export { lifeOf };
export const lifeText = (state, i, l = lang) => textOf(state, i, l);

// What the open tab shows, in language l.
function panel(game, l, T) {
  const state = pastOf(game, whose, past);
  if (tab === "path") {
    const { rows, end } = pathOf(state, whose, l);
    return `<ol class="life-path">${rows.map(r => `<li><span class="pa">${esc(r.age)}</span><span class="ps">${esc(r.sq)}</span>${r.via ? `<span class="pv">${esc(r.via)}</span>` : ""}</li>`).join("")}</ol>` +
      (end ? `<p class="life-end">${esc(end)}</p>` : "");
  }
  if (tab === "mirror") {
    return `<p class="life-open">${esc(mirrorIntroIn(l))}</p>` +
      `<ol class="life-mirror">${mirrorOf(state, whose).map(m => `<li>${esc(mirrorIn(l, m))}</li>`).join("")}</ol>` +
      `<p><button type="button" class="ghost" data-act="skip">${T("mirrorSkip")}</button></p>`;
  }
  const { sub, open, paras, end, curse, fates } = lifeOf(state, whose, l);
  // the source of a law's last word (Sāṃkhya's dancer, Sāṃkhyakārikā 59), in the scholar layer
  const lw = lawOf(state, whose).text, src = lw.endSrc && prefs.depth === "scholar" && end.endsWith(tIn(l, lw.end)) ? tIn(l, lw.endSrc) : "";
  return `<p class="life-scribe">${esc(T("citragupta"))}</p>
        ${sub ? `<p class="life-sub">${esc(sub)}</p>` : ""}
        ${open ? `<p class="life-open">${esc(open)}</p>` : ""}
        ${paras.map(p => `<h3 class="sub">${esc(p.head)}</h3><p>${esc(p.text)}</p>`).join("")}
        <p class="life-end">${esc([end, curse].filter(Boolean).join(" "))}</p>
        ${src ? `<p class="life-src">${esc(src)}</p>` : ""}
        ${fates.length ? `<p class="life-fates">${esc(fates.join(" "))}</p>` : ""}`;
}

function paint(focusTab = false) {
  const state = G.state, l = lang, T = (k, v) => tIn(l, k, v), seat = state.players[whose];
  const { title } = lifeOf(pastOf(state, whose, past), whose, l);
  const tabs = state.players.length > 1
    ? `<div class="life-who" role="group" aria-label="${T("lifeWhose")}">` + state.players.map((p, i) =>
      `<button type="button" data-who="${i}" aria-pressed="${i === whose}"><span class="dot" style="background:${COLORS[p.color]}"></span>${esc(pnameIn(p, l))}</button>`).join("") + `</div>`
    : "";
  // a seat Śiva's snake has passed through has lived more than one life here: each is its own book (Phase 17)
  const lives = seat.past?.length
    ? `<div class="life-who life-lives" role="group" aria-label="${T("lifeLives")}">` + [...seat.past.map((q, k) => [k, q]), [-1, seat]].map(([k, q]) =>
      `<button type="button" data-life="${k}" aria-pressed="${(past ?? -1) === k}">${esc(pnameIn(q, l))}</button>`).join("") + `</div>`
    : "";
  // the three ways to read it, as an ARIA tablist (the Codex's pattern, src/render/codex.js): one panel, its content
  // the selected tab's; the arrow keys, Home and End move between them
  const ways = `<div class="life-tabs tabs" role="tablist" aria-label="${T("lifeTabs")}">` + TABS.map(k =>
    `<button type="button" role="tab" id="lifeTab-${k}" data-tab="${k}" aria-controls="lifePanel" aria-selected="${k === tab}" tabindex="${k === tab ? 0 : -1}">${T(TAB_KEY[k])}</button>`).join("") + `</div>`;
  leaf.innerHTML = `
    <header class="leaf-top">
      <span class="eb">${T("readLife")}</span>
      <div class="leaf-tools"><button type="button" class="x" data-act="close" aria-label="${T("close")}" autofocus>×</button></div>
    </header>
    ${tabs}
    ${lives}
    ${ways}
    <div class="leaf-main life-main">
      <div class="leaf-text" lang="${l}" id="lifePanel" role="tabpanel" aria-labelledby="lifeTab-${tab}">
        <h2 id="lifeTitle">${esc(title)}</h2>
        ${panel(state, l, T)}
      </div>
    </div>
    <footer class="leaf-foot">
      <button type="button" class="ghost" data-act="copy">${T("lifeCopy")}</button>
      <span class="ft">${numIn(l, state.rng.seed)}</span>
      <button type="button" class="ghost" data-act="save">${T("lifeSave")}</button>
      ${$("reborn")?.hidden === false ? `<button type="button" data-act="reborn">${T("reborn")}</button>` : ""}
    </footer>`;
  if (focusTab) leaf.querySelector(`#lifeTab-${tab}`)?.focus();
}
const showWay = (k, focus = true) => { tab = k; paint(focus); };

// The winner's life, or else the first person's, which is the life a game of one person is about.
// k is one of the seat's past lives (p.past), or none for the life in it now.
export function openLife(i = G.state.winner ?? Math.max(0, G.state.players.findIndex(p => p.type === "human")), k = null) {
  whose = i;
  past = k;
  tab = "book";
  paint();
  if (!dlg.open) dlg.showModal();
}
export const refreshLife = () => { if (dlg.open) paint(); };
export const closeLife = () => { if (dlg.open) dlg.close(); };

leaf.addEventListener("click", async e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.who) { whose = +b.dataset.who; past = null; return paint(); }
  if (b.dataset.life) { past = +b.dataset.life < 0 ? null : +b.dataset.life; return paint(); }
  if (b.dataset.tab) return showWay(b.dataset.tab);
  const act = b.dataset.act;
  if (act === "close") return dlg.close();
  // the mirror is skippable: back to the book, and nothing kept
  if (act === "skip") return showWay("book");
  // Be born again, from the book as from the end of the game (src/main.js)
  if (act === "reborn") { dlg.close(); return $("reborn").click(); }
  const view = pastOf(G.state, whose, past), text = lifeText(view, whose);
  if (act === "copy") {
    try { await navigator.clipboard.writeText(text); b.textContent = tIn(lang, "lifeCopied"); } catch {}
  } else if (act === "save") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    a.download = `${pnameIn(view.players[whose], "en").replace(/[^\w-]+/g, "-") || "life"}-${G.state.rng.seed}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
});
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
leaf.addEventListener("keydown", e => {
  if (!e.target.closest?.(".life-tabs")) return;
  const k = TABS.indexOf(tab), to = { ArrowRight: k + 1, ArrowLeft: k - 1, Home: 0, End: TABS.length - 1 }[e.key];
  if (to == null) return;
  e.preventDefault();
  showWay(TABS[(to + TABS.length) % TABS.length]);
});
