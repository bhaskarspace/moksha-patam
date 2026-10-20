// ---- The life account (docs/NARRATIVE.md §9): the dialog ----
// The prose itself is written by src/engine/account.js, which runs in node too.
import { lang, tIn, numIn } from "../i18n.js";
import { G, pnameIn } from "../state.js";
import { $, COLORS, esc } from "../ui.js";
import { lifeOf, lifeText as textOf } from "../engine/account.js";

const dlg = $("lifeDlg"), leaf = $("lifeLeaf");
let whose = 0;

export { lifeOf };
export const lifeText = (state, i, l = lang) => textOf(state, i, l);

function paint() {
  const state = G.state, l = lang, T = (k, v) => tIn(l, k, v);
  const { title, sub, open, paras, end, fates } = lifeOf(state, whose, l);
  const tabs = state.players.length > 1
    ? `<div class="life-who" role="group" aria-label="${T("lifeWhose")}">` + state.players.map((p, i) =>
      `<button type="button" data-who="${i}" aria-pressed="${i === whose}"><span class="dot" style="background:${COLORS[p.color]}"></span>${esc(pnameIn(p, l))}</button>`).join("") + `</div>`
    : "";
  leaf.innerHTML = `
    <header class="leaf-top">
      <span class="eb">${T("readLife")}</span>
      <div class="leaf-tools"><button type="button" class="x" data-act="close" aria-label="${T("close")}" autofocus>×</button></div>
    </header>
    ${tabs}
    <div class="leaf-main life-main">
      <div class="leaf-text" lang="${l}">
        <h2 id="lifeTitle">${esc(title)}</h2>
        ${sub ? `<p class="life-sub">${esc(sub)}</p>` : ""}
        ${open ? `<p class="life-open">${esc(open)}</p>` : ""}
        ${paras.map(p => `<h3 class="sub">${esc(p.head)}</h3><p>${esc(p.text)}</p>`).join("")}
        <p class="life-end">${esc(end)}</p>
        ${fates.length ? `<p class="life-fates">${esc(fates.join(" "))}</p>` : ""}
      </div>
    </div>
    <footer class="leaf-foot">
      <button type="button" class="ghost" data-act="copy">${T("lifeCopy")}</button>
      <span class="ft">${numIn(l, state.rng.seed)}</span>
      <button type="button" class="ghost" data-act="save">${T("lifeSave")}</button>
    </footer>`;
}

// The winner's life, or else the first person's, which is the life a game of one person is about.
export function openLife(i = G.state.winner ?? Math.max(0, G.state.players.findIndex(p => p.type === "human"))) {
  whose = i;
  paint();
  if (!dlg.open) dlg.showModal();
}
export const refreshLife = () => { if (dlg.open) paint(); };
export const closeLife = () => { if (dlg.open) dlg.close(); };

leaf.addEventListener("click", async e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.who) { whose = +b.dataset.who; return paint(); }
  const act = b.dataset.act;
  if (act === "close") return dlg.close();
  const text = lifeText(G.state, whose);
  if (act === "copy") {
    try { await navigator.clipboard.writeText(text); b.textContent = tIn(lang, "lifeCopied"); } catch {}
  } else if (act === "save") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    a.download = `${pnameIn(G.state.players[whose], "en").replace(/[^\w-]+/g, "-") || "life"}-${G.state.rng.seed}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
});
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
