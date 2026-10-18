// ---- The life account (docs/NARRATIVE.md §9) ----
// At the end of a game, every moment a player landed on, in order, as prose: a paragraph per stage of
// life, stitched with the joining phrases in strings.JOINS. Built from player.life and the moments alone,
// so it reads in either language, and squares with no moment yet are passed over without a gap.
import { ASHRAMAS, LADDERS, SNAKES, JOINS, squareOf, snakeOn } from "../content.js";
import { lang, tIn, fill, numIn } from "../i18n.js";
import { G, pnameIn } from "../state.js";
import { $, COLORS, esc } from "../ui.js";

const dlg = $("lifeDlg"), leaf = $("lifeLeaf");
let whose = 0;

const stageOf = n => ASHRAMAS.findIndex(([max]) => n <= max);
// An English moment that does not open with the name reads on after a joining phrase in lower case:
// "Then for a week…". A capital followed by another capital ("I", an acronym) is left alone.
const after = (raw, text, l) => (l === "en" && !raw.startsWith("{name}") && /^\p{Lu}\p{Ll}/u.test(text) ? text[0].toLowerCase() + text.slice(1) : text);

// Player i's life in language l: { title, paras: [{ head, text }], end }.
export function lifeOf(state, i, l) {
  const p = state.players[i], who = { name: pnameIn(p, l), gender: p.gender };
  const paras = [];
  let prev = null, prevHad = false, k = 0;
  const life = p.life || [];
  for (const [i, n] of life.entries()) {
    const q = squareOf(n), m = q?.moment, from = prev, had = prevHad;
    prev = n; prevHad = !!m;
    if (!m) continue;
    const s = stageOf(n);
    let para = paras.at(-1);
    if (!para || para.s !== s) paras.push((para = { s, ages: [], parts: [] }));
    if (q.age != null) para.ages.push(Math.floor(q.age));
    // the square a snake or ladder led to follows on from it; anything else is just the next thing
    const join = had && SNAKES[from]?.to === n ? JOINS.snake : had && LADDERS[from]?.to === n ? JOINS.ladder : para.parts.length ? JOINS.then[k++ % JOINS.then.length] : null;
    const text = fill(m[l] || m.en, who);
    para.parts.push(join ? join[l] + after(m[l] || m.en, text, l) : text);
    // a snake that starts on a god's square was taken: its own moment follows the god's
    const sn = snakeOn(n);
    if (sn?.moment && life[i + 1] === sn.to) para.parts.push(fill(sn.moment[l] || sn.moment.en, who));
  }
  const T = (key, v) => tIn(l, key, v);
  const stage = s => (l === "hi" ? ASHRAMAS[s][2] : ASHRAMAS[s][1]);
  return {
    title: T("lifeTitle", { name: who.name }),
    paras: paras.map(({ s, ages, parts }) => {
      const a = Math.min(...ages), b = Math.max(...ages);
      const head = !ages.length ? stage(s) : a === b ? T("lifeAt", { stage: stage(s), a }) : T("lifeSpan", { stage: stage(s), a, b });
      return { head, text: parts.join(" ") };
    }),
    end: state.winner === i ? T("lifeEndWin") : !p.life?.length ? T("lifeUnborn", { name: who.name }) : T("lifeEndOpen", { n: p.pos }),
  };
}

// The same life as plain text, to copy or save.
export function lifeText(state, i, l = lang) {
  const { title, paras, end } = lifeOf(state, i, l);
  return [title, ...paras.map(p => `${p.head}\n${p.text}`), end].join("\n\n") + "\n";
}

function paint() {
  const state = G.state, l = lang, T = (k, v) => tIn(l, k, v);
  const { title, paras, end } = lifeOf(state, whose, l);
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
        ${paras.map(p => `<h3 class="sub">${esc(p.head)}</h3><p>${esc(p.text)}</p>`).join("")}
        <p class="life-end">${esc(end)}</p>
      </div>
    </div>
    <footer class="leaf-foot">
      <button type="button" class="ghost" data-act="copy">${T("lifeCopy")}</button>
      <span class="ft">${numIn(l, state.rng.seed)}</span>
      <button type="button" class="ghost" data-act="save">${T("lifeSave")}</button>
    </footer>`;
}

export function openLife(i = G.state.winner ?? G.state.turn) {
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
