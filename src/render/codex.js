// ---- The Codex panel: schools, sources and people, filling in as the reader meets them ----
import { CODEX, ENTRY_GROUPS, ENTRY_IDS } from "../content.js";
import { lang, t, pick } from "../i18n.js";
import { hasMet, metCount } from "../prefs.js";
import { $, esc } from "../ui.js";
import { openEntry } from "./card.js";

let showAll = false;
try { showAll = localStorage.getItem("mp-codex-all") === "1"; } catch {}

const GROUP_LABEL = { school: "codexSchools", source: "codexSources", figure: "codexFigures" };

export function renderCodex() {
  const met = metCount(ENTRY_IDS);
  $("codexCount").textContent = `${met}/${ENTRY_IDS.length}`;
  $("codexPanel").innerHTML =
    `<p class="hint">${t("codexHint", { met, all: ENTRY_IDS.length })}</p>` +
    ENTRY_GROUPS.map(([kind, g]) => `<div><h3 class="eyebrow">${t(GROUP_LABEL[kind])}</h3><ul>` +
      Object.entries(CODEX[g]).map(([id, e]) => hasMet(id) || showAll
        ? `<li><a class="ent${hasMet(id) ? "" : " unmet"}" href="#codex/${id}" data-entry="${id}" lang="${lang}">${esc(pick(e.name))}</a></li>`
        : `<li><span class="ent locked" title="${t("codexLocked")}" aria-label="${t("codexLocked")}">· · ·</span></li>`).join("") +
      `</ul></div>`).join("") +
    `<label class="check"><input type="checkbox" id="codexAll"${showAll ? " checked" : ""}> <span>${t("codexAll")}</span></label>`;
}

$("codexPanel").addEventListener("click", e => {
  const a = e.target.closest("[data-entry]");
  if (!a) return;
  e.preventDefault();
  openEntry(a.dataset.entry, { from: a });
});
$("codexPanel").addEventListener("change", e => {
  if (e.target.id !== "codexAll") return;
  showAll = e.target.checked;
  try { localStorage.setItem("mp-codex-all", showAll ? "1" : "0"); } catch {}
  renderCodex();
});

// Moves | Codex tabs
export function showTab(which) {
  const codex = which === "codex";
  $("tabMoves").setAttribute("aria-selected", String(!codex));
  $("tabCodex").setAttribute("aria-selected", String(codex));
  $("log").hidden = codex;
  $("codexPanel").hidden = !codex;
  if (codex) renderCodex();
}
$("tabMoves").addEventListener("click", () => showTab("moves"));
$("tabCodex").addEventListener("click", () => showTab("codex"));
