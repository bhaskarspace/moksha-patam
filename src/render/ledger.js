// ---- The scholar's ledger (REDESIGN.md Phase 12) ----
// At scholar depth only, the side panel lists each player's debts by the moment they were made in, and says in words
// where each one stands: made and not yet ripe (āgāmi), ripe and waiting (prārabdha), met, or carried into the store
// when the life is over (sañcita). Never a number of the ledger's: no weights, no fuses, no chance. It borrows the
// players list's look; Phase 13 paints it. Since Phase 17 a law that shows every consequence (Mīmāṃsā) shows it always,
// and says when each debt not yet ripe will ripen; a law that keeps no ledger (Cārvāka) says so.
import { lang, t, wordsIn } from "../i18n.js";
import { G, pname } from "../state.js";
import { prefs } from "../prefs.js";
import { $, COLORS, esc } from "../ui.js";
import { karmaOf, debtIn } from "../engine/karma.js";
import { lawOf } from "../engine/laws/index.js";

const row = (text, state) => `<span class="stage">${esc(text)}<br>${esc(state)}</span>`;

function ledgerOf(p, law) {
  if (!law.karma) return `<span class="stage">${esc(t("ledgerNone"))}</span>`;
  // a law that veils karma (Nyāya, Phase 17 step 5) never shows it, at any depth: only its signs
  if (law.veiled) return `<span class="stage">${esc(t("ledgerVeiled"))}</span>`;
  const who = { name: pname(p), gender: p.gender }, k = karmaOf(p);
  const debt = s => debtIn(lang, s, who);
  const met = (p.reckonings ?? []).filter(r => !r.dies).map(r => row(debt({ src: r.src, opt: r.opt, at: r.planted }), t("ledgerMet", { age: wordsIn(lang, Math.floor(r.age ?? 0)) })));
  const lines = [
    ...k.agami.map(s => row(debt(s), law.foresight ? t("ledgerRipens", { age: wordsIn(lang, Math.floor(s.at + s.fuse)) }) : t("ledgerHeld"))),
    ...k.prarabdha.map(s => row(debt(s), t("ledgerRipe"))),
    ...met,
    ...k.sancita.map(s => row(debt(s), t("ledgerStore"))),
  ];
  return lines.length ? lines.join("") : `<span class="stage">${esc(t("ledgerEmpty"))}</span>`;
}

export function renderLedger() {
  const scholar = prefs.depth === "scholar", on = !!G.state && (scholar || G.state.players.some((q, i) => lawOf(G.state, i).foresight));
  $("ledgerCard").hidden = !on;
  if (!on) return;
  $("ledger").innerHTML = G.state.players.map((p, i) => `
    <li>
      <span class="dot" style="background:${COLORS[p.color]}"></span>
      <span><span class="pname">${esc(pname(p))}</span>${ledgerOf(p, lawOf(G.state, i))}</span>
      <span></span>
    </li>`).join("");
  // the engine's own account of itself is the scholar's
  $("ledgerNote").textContent = scholar ? t("ledgerNote") : "";
}
