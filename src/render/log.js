// ---- The players list and the move log ----
import { GOAL } from "../content.js";
import { t, num } from "../i18n.js";
import { G, pname } from "../state.js";
import { $, COLORS, esc } from "../ui.js";
import { ashramaOf, squareName } from "./board.js";
import { stageOf, stageName } from "./sprites.js";

export function renderPlayers() {
  $("players").innerHTML = G.state.players.map((pl, i) => `
    <li class="${i === G.state.turn && G.state.winner == null ? "current" : ""}">
      <span class="dot" style="background:${COLORS[pl.color]}"></span>
      <span><span class="pname">${esc(pname(pl))}</span><span class="kind">${pl.type === "cpu" ? t("cpu") : ""}</span>
        <span class="stage">${pl.pos === 0 ? t("notBorn") : [...new Set([stageName(stageOf(pl.pos)), ashramaOf(pl.pos)])].join(" · ")}</span></span>
      <span class="pos">${pl.pos === 0 ? t("start") : pl.pos === GOAL ? t("moksha") : t("square", { n: pl.pos })}</span>
    </li>`).join("");
}

export function renderLog() {
  $("log").innerHTML = G.state.log.map(e => {
    const who = e.who == null ? null : G.state.players[e.who];
    // the squares a move walked over, each opening its card, so a game shows far more of the board than it lands on
    if (e.k === "lPassed") return `
    <li class="passed"><span class="dot" style="background:transparent;border-color:transparent;box-shadow:none"></span><span>${esc(t("lPassed"))} ${e.v.passed.map(n => `<button type="button" class="logbtn" data-sq="${n}">${esc(squareName(n) || num(n))}</button>`).join(" · ")}</span></li>`;
    const text = e.k ? t(e.k, { ...e.v, name: who ? pname(who) : "", what: e.v?.sq ? squareName(e.v.sq) : "" }) : e.text;
    // each move reopens the card of the square it landed on
    const sq = e.v?.sq ?? (e.k === "lWin" ? GOAL : e.k === "lExact" ? e.v.pos || null : null);
    return `
    <li class="${e.kind}"><span class="dot" style="background:${who ? COLORS[who.color] : "transparent"};${who ? "" : "border-color:transparent;box-shadow:none"}"></span>${sq ? `<button type="button" class="logbtn" data-sq="${sq}">${esc(text)}</button>` : `<span>${esc(text)}</span>`}</li>`;
  }).join("");
}
