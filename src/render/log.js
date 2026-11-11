// ---- The players list and the move log ----
import { GOAL, ASHRAMAS, legendOf } from "../content.js";
import { t, num, L, fill } from "../i18n.js";
import { G, pname } from "../state.js";
import { $, COLORS, esc } from "../ui.js";
import { squareName, sqNum } from "./board.js";
import { stageOf, stageName } from "./sprites.js";
import { stageOf as ashramaOfPlayer } from "./age.js";
import { gone } from "../engine/turn.js";
import { isCloth } from "../engine/cloth.js";
import { isAnimal, interludeOf } from "../engine/animal.js";
import { renderLedger } from "./ledger.js";
import { LAWS } from "../engine/laws/index.js";

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

// What the panel says a player is: how the life ended (Phase 16: a debt, the door or the years), the creature of an
// animal interlude, or the stage of life and its āśrama.
const ENDED = { ledger: "deadLedger", door: "deadDoor" };
function stageLine(pl, i) {
  // on an old cloth, the legend of the square the pawn stands on (Phase 18)
  if (isCloth()) return esc(squareName(pl.pos));
  if (pl.fell) return t("fell");
  if (pl.pos === 0) return t("notBorn");
  if (pl.dead) return fill(t(ENDED[pl.death?.by] ?? "dead"), { gender: pl.gender });
  if (pl.free) return t("freeStage");
  if (isAnimal(G.state, i)) { const a = t("a_" + (interludeOf(G.state, i)?.kind ?? "tortoise")); return a.charAt(0).toUpperCase() + a.slice(1); }
  // a life born again through Śiva's snake says so while it is a child (Phase 17)
  return [...(pl.rebirths && stageOf(pl) === 0 ? [fill(t("bornAgainStage"), { gender: pl.gender })] : []), ...new Set([stageName(stageOf(pl), pl.gender), ashramaIn(pl)])].join(" · ");
}

// What the player's law says on their line (Phase 17 step 5: Yoga's stillness, in words, never a count)
const lawLine = (pl, i) => { const k = !gone(pl) && LAWS[pl.law ?? G.state.rules?.law ?? "board"]?.line(pl); return k ? `<span class="self still">${esc(t(k))}</span>` : ""; };
export function renderPlayers() {
  $("players").innerHTML = G.state.players.map((pl, i) => `
    <li class="${i === G.state.turn && !G.state.over ? "current" : ""}${gone(pl) ? " dead" : ""}">
      <span class="dot" style="background:${COLORS[pl.color]}"></span>
      <span><span class="pname">${esc(pname(pl))}</span><span class="kind">${pl.type === "cpu" ? t("cpu") : ""}</span>
        <span class="stage">${stageLine(pl, i)}</span>
        ${selfLine(pl) && !gone(pl) ? `<span class="self">${esc(selfLine(pl))}</span>` : ""}${lawLine(pl, i)}</span>
      <span class="pos">${pl.fell ? "" : pl.pos === 0 ? t("start") : pl.pos === GOAL && !isCloth() ? t("moksha") : isCloth() && legendOf(pl.pos)?.top ? sqNum(pl.pos) : t("square", { n: pl.pos })}</span>
    </li>`).join("");
  renderLedger();
}

// The life an entry is about: the seat's player, or a life of it Śiva's snake closed (Phase 17, p.past).
const lifeOfEntry = e => {
  const p = e.who == null ? null : G.state.players[e.who];
  return p && (e.life ?? 0) !== (p.rebirths ?? 0) ? p.past?.[e.life ?? 0] ?? p : p;
};

// A log entry as the log says it, in the page's language.
export function entryText(e) {
  const who = lifeOfEntry(e);
  // Hindi agrees with the life the line is about ({पहुँचा|पहुँची})
  // a law is kept by its id, and named in the page's language (Phase 17)
  const law = e.v?.law && LAWS[e.v.law] ? t(LAWS[e.v.law].text.name) : "";
  // an old cloth's squares as the board writes them (the 84's top 1 to 6, Phase 18)
  const at = isCloth() && e.v ? { pos: e.v.pos != null ? sqNum(e.v.pos) : undefined, to: e.v.to != null ? sqNum(e.v.to) : undefined } : {};
  // an animal born in a seat (Phase 19) is named by its kind, in the page's language
  const animal = e.v?.animal ? { animal: t("a_" + e.v.animal), animalO: t("ao_" + e.v.animal) } : {};
  return e.k ? fill(t(e.k, { ...e.v, ...at, name: who ? pname(who) : "", what: e.v?.sq ? squareName(e.v.sq) : "", law, ...animal }), { gender: who?.gender }) : e.text;
}

export function renderLog() {
  $("log").innerHTML = G.state.log.map(e => {
    const who = e.who == null ? null : G.state.players[e.who];
    // the squares a move walked over, each opening its card, so a game shows far more of the board than it lands on
    if (e.k === "lPassed") return `
    <li class="passed"><span class="dot" style="background:transparent;border-color:transparent;box-shadow:none"></span><span>${esc(t("lPassed"))} ${e.v.passed.map(n => `<button type="button" class="logbtn" data-sq="${n}">${esc(squareName(n) || num(n))}</button>`).join(" · ")}</span></li>`;
    const text = entryText(e);
    // each move reopens the card of the square it landed on
    const sq = e.v?.sq ?? (e.k === "lWin" ? GOAL : null);
    return `
    <li class="${e.kind}"><span class="dot" style="background:${who ? COLORS[who.color] : "transparent"};${who ? "" : "border-color:transparent;box-shadow:none"}"></span>${sq ? `<button type="button" class="logbtn" data-sq="${sq}">${esc(text)}</button>` : `<span>${esc(text)}</span>`}</li>`;
  }).join("");
}
