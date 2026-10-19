// ---- The players list and the move log ----
import { GOAL, ASHRAMAS } from "../content.js";
import { t, num, L } from "../i18n.js";
import { G, pname } from "../state.js";
import { $, COLORS, esc } from "../ui.js";
import { squareName } from "./board.js";
import { stageOf, stageName } from "./sprites.js";
import { stageOf as ashramaOfPlayer } from "./age.js";

// Who a player is becoming, as words and never as a number (REDESIGN.md Phase 8): the strongest guna and the
// aim they have most of. Nothing is said until one guna stands out, so a life starts without a description.
function selfLine(p) {
  const g = p.gunas, a = p.aims;
  if (!g || !a || p.pos > 100) return "";
  const [k, v] = Object.entries(g).sort((x, y) => y[1] - x[1])[0];
  if (v < 0.4) return "";
  const aim = Object.entries(a).sort((x, y) => y[1] - x[1])[0][0];
  return t(`self_${k}_${aim}`);
}
const ashramaIn = p => { const s = ashramaOfPlayer(p); return s < ASHRAMAS.length ? L(ASHRAMAS[s][1], ASHRAMAS[s][2]) : t("moksha"); };

export function renderPlayers() {
  $("players").innerHTML = G.state.players.map((pl, i) => `
    <li class="${i === G.state.turn && !G.state.over ? "current" : ""}${pl.dead ? " dead" : ""}">
      <span class="dot" style="background:${COLORS[pl.color]}"></span>
      <span><span class="pname">${esc(pname(pl))}</span><span class="kind">${pl.type === "cpu" ? t("cpu") : ""}</span>
        <span class="stage">${pl.pos === 0 ? t("notBorn") : pl.dead ? t("dead") : [...new Set([stageName(stageOf(pl)), ashramaIn(pl)])].join(" · ")}</span>
        ${selfLine(pl) && !pl.dead ? `<span class="self">${esc(selfLine(pl))}</span>` : ""}</span>
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
    const sq = e.v?.sq ?? (e.k === "lWin" || e.k === "lWinAbove" ? GOAL : null);
    return `
    <li class="${e.kind}"><span class="dot" style="background:${who ? COLORS[who.color] : "transparent"};${who ? "" : "border-color:transparent;box-shadow:none"}"></span>${sq ? `<button type="button" class="logbtn" data-sq="${sq}">${esc(text)}</button>` : `<span>${esc(text)}</span>`}</li>`;
  }).join("");
}
