// ---- The scholar's ledger (REDESIGN.md Phase 12) ----
// At scholar depth only, the side panel lists each player's debts by the moment they were made in, and says in words
// where each one stands: made and not yet ripe (āgāmi), ripe and waiting (prārabdha), met, or carried into the store
// when the life is over (sañcita). Never a number of the ledger's: no weights, no fuses, no chance. It borrows the
// players list's look; Phase 13 paints it.
import { lang, t, wordsIn } from "../i18n.js";
import { G, pname } from "../state.js";
import { prefs } from "../prefs.js";
import { $, COLORS, esc } from "../ui.js";
import { karmaOf, debtIn } from "../engine/karma.js";

const row = (text, state) => `<span class="stage">${esc(text)}<br>${esc(state)}</span>`;

function ledgerOf(p) {
  const who = { name: pname(p), gender: p.gender }, k = karmaOf(p);
  const debt = s => debtIn(lang, s, who);
  const met = (p.reckonings ?? []).map(r => row(debt({ src: r.src, opt: r.opt, at: r.planted }), t("ledgerMet", { age: wordsIn(lang, Math.floor(r.age ?? 0)) })));
  const lines = [
    ...k.agami.map(s => row(debt(s), t("ledgerHeld"))),
    ...k.prarabdha.map(s => row(debt(s), t("ledgerRipe"))),
    ...met,
    ...k.sancita.map(s => row(debt(s), t("ledgerStore"))),
  ];
  return lines.length ? lines.join("") : `<span class="stage">${esc(t("ledgerEmpty"))}</span>`;
}

export function renderLedger() {
  const on = prefs.depth === "scholar" && !!G.state;
  $("ledgerCard").hidden = !on;
  if (!on) return;
  $("ledger").innerHTML = G.state.players.map(p => `
    <li>
      <span class="dot" style="background:${COLORS[p.color]}"></span>
      <span><span class="pname">${esc(pname(p))}</span>${ledgerOf(p)}</span>
      <span></span>
    </li>`).join("");
  $("ledgerNote").textContent = t("ledgerNote");
}
