// Moksha Patam: the page's wiring. Rules live in engine/, drawing in render/, content in content/*.json.
import { GOAL, TOP, ROWS, ASHRAMAS, LADDERS, SNAKES, SQ, HEAVEN, STR, squareOf } from "./content.js";
import { lang, urlLang, setLangValue, L, num, t, tIn } from "./i18n.js";
import { G, defaultSetup, pname, pnameIn, cur, newState, loadSelf, saveSelf } from "./state.js";
import { prefs, setPref, lifeLived, beFirst, freshViewer, firstLife } from "./prefs.js";
import { $, COLORS, esc, reduced, sleep, quality, forcedQuality, setQuality } from "./ui.js";
import { die, makeRng, freshSeed } from "./rng.js";
import { TUMBLE, planTurn, resolveChoice, endTurn, addLog, diceFor, movesFor, moveFor } from "./engine/turn.js";
import { optionsFor, choiceFor, situationAt, momentOf } from "./engine/qbn.js";
import { S, colRow, labEls, buildCells, draw, drawAge, fxClear, focusSquare } from "./render/board.js";
import { lens, wash, stageOf } from "./render/age.js";
import { ageStep } from "./engine/self.js";
import { castOf, meetsNamed } from "./engine/cast.js";
import { frame, pullBack, hold, release } from "./render/camera.js";
import { spriteURL } from "./render/sprites.js";
import { tokenEls, buildTokens, place, retrigger, climb, swallow, swallowSecs, animate } from "./render/tokens.js";
import { openSquare, openEntry, closeCard, cardIdle, cardOpen, cardCarried, cardBlocking, cardExpanded, releaseCard, setCardRoll, setCardDecide, optionNote, refreshRoll, refreshCard, onCardChange } from "./render/card.js";
import { landHuman, clearLanded, drawLanded } from "./render/landed.js";
import { sheetState } from "./render/sheet.js";
import { renderCodex, showTab } from "./render/codex.js";
import { renderLog } from "./render/log.js";
import { openLife, refreshLife, closeLife, lifeText } from "./render/life.js";
import { sound, unlockAudio, setDrone, setShepard, setMuted, audioState } from "./audio/engine.js";

const PIPS = { 1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8] };

// ---- Dice ----
// One die below the endgame, two from 94 (REDESIGN.md Phase 9).
const dieEls = [$("die"), $("die2")];
for (const d of dieEls) for (let i = 0; i < 9; i++) d.appendChild(document.createElement("span"));
function showDice(dice) {
  dieEls[1].hidden = dice.length < 2;
  dice.forEach((v, k) => {
    [...dieEls[k].children].forEach((s, i) => s.classList.toggle("on", PIPS[v].includes(i)));
    dieEls[k].setAttribute("aria-label", `🎲 ${num(v)}`);
  });
}
// the dice also tumble in the card's Roll, since on a phone the panel's dice are off screen behind the card
const tumble = dice => { showDice(dice); G.face = dice; refreshRoll(); };
// Draws exactly what engine/turn.js rollDice does: each frame a face for every die, then each die its value.
// A forced value (mp.roll) is not drawn; one forced value is every die's.
async function rollDice(n) {
  const rng = G.state.rng;
  dieEls[1].hidden = n < 2;
  for (const d of dieEls.slice(0, n)) { d.classList.remove("rolling"); void d.offsetWidth; d.classList.add("rolling"); }
  sound.rattle();
  for (let i = 0; i < TUMBLE; i++) { tumble(Array.from({ length: n }, () => die(rng))); await sleep(75); }
  const forced = G.forcedRoll == null ? null : Array.isArray(G.forcedRoll) ? G.forcedRoll : Array(n).fill(G.forcedRoll);
  G.forcedRoll = null;
  const dice = Array.from({ length: n }, (_, k) => forced?.[k] ?? die(rng));
  tumble(dice);
  return dice;
}

// ---- Choosing between the dice ----
// A person sees both dice and moves by either, or in 94–100 sits the year out; a computer chooses at once, the
// same way tools/sim.mjs does. The choice is offered on the panel and, for a reader on a phone, on the card.
const moveLabel = (l, v) => (v ? tIn(l, "diceBy", { v }) : tIn(l, "sit"));
function choose(dice) {
  const moves = movesFor(G.state, dice);
  return new Promise(resolve => {
    G.choosing = { dice, moves, resolve };
    const pick = $("pick");
    pick.innerHTML = moves.map(v => `<button type="button" data-v="${v}"${v ? "" : ` title="${esc(t("sitHint"))}"`}>${esc(moveLabel(lang, v))}</button>`).join("");
    pick.hidden = false;
    $("roll").hidden = true;
    $("hint").textContent = t(moves.includes(0) ? "diceChooseSit" : "diceChoose", { a: num(dice[0]), b: num(dice[1]) });
    refreshRoll();
    if (!cardOpen()) pick.querySelector("button")?.focus({ preventScroll: true });
  });
}
function pickMove(v) {
  const c = G.choosing;
  if (!c || !c.moves.includes(v)) return;
  G.choosing = null;
  $("pick").hidden = true; $("pick").innerHTML = "";
  $("roll").hidden = false;
  c.resolve(v);
}
$("pick").addEventListener("click", e => {
  const o = e.target.closest("[data-o]");
  if (o) return pickOption(o.dataset.o);
  const b = e.target.closest("[data-v]"); if (b) pickMove(+b.dataset.v);
});

// ---- Choosing on a situation's square (REDESIGN.md Phase 10) ----
// A person chooses on the card, which opens on the situation, or on the panel, or by key (1, 2, 3). An option a
// gate withholds is shown, greyed, with the reason, and cannot be taken. A computer chooses at once, as the sim does.
// the panel's buttons, drawn again when the language changes
function drawDecide() {
  const d = G.deciding, p = G.state.players[G.plan.idx];
  $("pick").innerHTML = d.opts.map(o => `<button type="button" data-o="${esc(o.id)}"${o.open ? "" : ` aria-disabled="true"`}>${esc(L(o.label.en, o.label.hi))}<small>${esc(o.open ? optionNote(lang, G.plan.target, o) : L(o.why.en, o.why.hi))}</small></button>`).join("");
  $("hint").textContent = t("chooseHint", { name: pname(p) });
}
function decide(sit, p) {
  const opts = optionsFor(p, sit);
  return new Promise(resolve => {
    G.deciding = { sit, opts, resolve };
    drawDecide();
    $("pick").hidden = false;
    $("roll").hidden = true;
    refreshRoll(); refreshCard();
    if (!cardOpen()) pick.querySelector("button:not([aria-disabled])")?.focus({ preventScroll: true });
  });
}
function pickOption(id) {
  const d = G.deciding, o = d?.opts.find(x => x.id === id);
  if (!o?.open) return;
  G.deciding = null;
  $("pick").hidden = true; $("pick").innerHTML = "";
  $("roll").hidden = false;
  d.resolve(id);
}
setCardDecide(pickOption);

// ---- Quality ----
// A device that drops frames during its first two moves draws less from then on (ui.js).
let watched = 0;
function watchFrames() {
  if (forcedQuality || quality === "low" || watched >= 2) return () => {};
  watched++;
  const ts = [];
  // a move abandoned by a new game never calls back, so the watch ends itself
  let on = true, last = performance.now(), until = last + 20000;
  const tick = now => { ts.push(now - last); last = now; if (on && now < until) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  return () => {
    on = false;
    const f = ts.slice(1).sort((a, b) => a - b);
    if (f.length >= 30 && f[Math.floor(f.length * 0.75)] > 28) { setQuality("low"); pullBack(true); draw(); }
  };
}

// ---- Game flow ----
function log(e) {
  addLog(G.state, e);
  renderLog();
}

async function takeTurn() {
  const state = G.state;
  if (G.busy || state.over) return;
  const g = G.gen;
  G.busy = true; render();
  // nobody moves while a situation waits on its card for a choice
  await waitCard();
  if (g !== G.gen) return;
  const p = cur(), idx = state.turn, el = tokenEls[idx];
  // A person's roll takes away the card and the line under the board: the next landing tells its own. From 94 the
  // card stays until the dice are chosen between, since on a phone the choice is on it (REDESIGN.md Phase 9).
  let shut = null;
  if (p.type === "human") { clearLanded(); G.humanRolled = true; if (cardOpen() && diceFor(p) < 2) shut = closeCard(); }
  release();
  const dice = await rollDice(diceFor(p));
  await shut;
  if (g !== G.gen) return;
  state.dice = dice;
  // a choice with only one move in it (a double, where there is no sitting) is not asked
  const only = dice.length > 1 && movesFor(state, dice).length === 1;
  const v = dice.length < 2 || only ? dice[0] : p.type === "human" ? await choose(dice) : moveFor(state, dice);
  if (g !== G.gen) return;
  if (p.type === "human" && !shut && cardOpen()) await closeCard();
  if (g !== G.gen) return;
  state.last = v || dice[0];
  // the drone begins with the first roll
  setDrone(lens(state).droneStage);
  const watching = watchFrames();
  let plan = planTurn(state, v, dice);
  G.plan = plan;
  plan.pre.forEach(log);
  // every roll moves now: a bounce can come back to the square it started from, but it still walks
  {
    await sleep(150);
    const born = stageOf(p);
    frame(p.pos || 1, plan.path.at(-1));
    // the walk follows the planned path, which turns at the top of the board on a bounce
    for (const n of plan.path) {
      if (g !== G.gen) return;
      if (n > 1 && p.pos > 0) { const dc = colRow(n).col - colRow(p.pos).col; if (dc) p.face = dc > 0 ? "r" : "l"; }
      p.pos = n; el._frame = 1 - el._frame;
      retrigger(el, "hop");
      place();
      // the Shepard tone follows the walk square by square, rising toward the exit
      setShepard(lens(state).lead);
      await sleep(200);
    }
    if (g !== G.gen) return;
    el._frame = 0; place();
    // a new ashrama is seen whole: the one this landing's years bring, not the square's
    if (stageOf({ ...p, years: ageStep(p.years ?? 0, p.pos) }) !== born) pullBack();
    await waitCard();
    if (g !== G.gen) return;
    // Weighted by what happened (REDESIGN.md Phase 11): a person's situation, snake, ladder, first meeting by name,
    // first realm and the exit open the full card; any other landing of theirs is a line under the board.
    // Only the situation waits on its card, for the choice; the others go with the game.
    let full = false;
    if (plan.situation) {
      if (p.type === "human") {
        full = true;
        G.waitingCard = true; refreshRoll();
        openSquare(p.pos, { landing: true, who: idx });
      }
      const id = p.type === "human" ? await decide(plan.situation, p) : choiceFor(state, plan.situation);
      if (g !== G.gen) return;
      plan = resolveChoice(state, plan, id);
      G.plan = plan;
      refreshCard();
      if (p.type === "human") releaseCard();
      G.waitingCard = false; refreshRoll();
    } else if (!plan.sit && p.type === "human" && fullCard(state, plan, idx)) {
      // a year sat out lands nowhere new, so nothing opens for it
      full = true;
      // settles once the card is up, since it no longer waits to be closed: the camera moves again only after that
      await openSquare(p.pos, { landing: true, who: idx, focus: false });
      if (g !== G.gen) return;
    }
    if (!plan.sit && !full) {
      // a computer's landing is in the moves log; the line keeps the person's last moment
      if (p.type === "human") landHuman(p.pos, idx);
    }
    plan.after.forEach(log);
    if (plan.jump) {
      if (g !== G.gen) return;
      // the card stays open over the jump, so it waits only a reading beat (a pause, not a motion)
      if (full && cardOpen()) await new Promise(r => setTimeout(r, reduced ? 300 : 900));
      if (g !== G.gen) return;
      // the Brahmā snake is the one place the divine row's tone truly falls; under reduced motion it still takes a moment
      if (plan.jump.rebirth) sound.fall(swallowSecs(p.pos, plan.jump.to) || 1.2);
      else (plan.jump.kind === "snake" ? sound.snake : sound.ladder)();
      frame(p.pos, plan.jump.to);
      await (plan.jump.kind === "snake" ? swallow(idx, p.pos, plan.jump.to) : climb(idx, p.pos, plan.jump.to));
      if (g !== G.gen) return;
    }
  }
  endTurn(state, plan);
  G.plan = null; G.face = null;
  // the viewer's own life is over, or begun again: the first life's quiet cards end with it (prefs.js)
  if (p.type === "human" && (plan.died || plan.win || plan.jump?.rebirth) && firstLife()) { lifeLived(); refreshCard(); }
  // a person whose years run out reads their life at once, rather than watching the others finish
  if (plan.died && p.type === "human") openLife(idx);
  watching();
  pullBack();
  G.busy = false;
  render();
  age();
  queueCpu();
  pump();
}

// Whether a person's landing opens the full card: everything that changes a life, or every landing when the reader
// has asked for that. plan has not been ended yet, so p.life is the life before this landing.
function fullCard(state, plan, idx) {
  if (prefs.everyCard || plan.jump || plan.target === GOAL) return true;
  const p = state.players[idx], n = plan.target;
  if (HEAVEN[n]) return !p.life?.includes(n);
  return meetsNamed(state, idx, momentOf(n, plan.told?.[0]).moment ?? squareOf(n)?.moment);
}

// Waits while a situation's card waits for its choice. No other card holds the game up.
async function waitCard() {
  if (!cardBlocking()) return;
  G.waitingCard = true; refreshRoll();
  await cardIdle();
  G.waitingCard = false; refreshRoll();
}

// ---- Rolling from the card (REDESIGN.md Phase 6) ----
// The card's Roll is for the next person to roll, counting on from the turn under way, so pressing it while a
// computer is still to play lets that turn run on the board and then rolls for the reader.
const FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
function rollInfo(l) {
  const s = G.state;
  if (!s || s.over || !s.players.some(q => q.type === "human" && !q.dead)) return null;
  if (G.choosing) return { choose: G.choosing.moves.map(v => ({ v, label: moveLabel(l, v) })) };
  // the choice on a situation is in the card's body, not its Roll
  if (G.deciding) return null;
  const n = s.players.length, plan = G.plan, humans = s.players.filter(q => q.type === "human").length;
  let i = plan ? (plan.again ? plan.idx : (plan.idx + 1) % n) : s.turn;
  for (let k = 0; k < n && (s.players[i].type !== "human" || s.players[i].dead); k++) i = (i + 1) % n;
  const p = s.players[i], dot = humans > 1 ? COLORS[p.color] : null;
  // already moving on the reader's behalf: show the die, or who is rolling now
  if (G.rollQueued || (G.busy && !G.waitingCard)) {
    const mover = s.players[plan?.idx ?? s.turn];
    const who = mover.type === "cpu" ? tIn(l, "rolling", { name: pnameIn(mover, l) }) : "";
    return { label: [G.face ? G.face.map(f => FACES[f]).join(" ") : "", who].filter(Boolean).join("  ") || FACES[s.last || 6], ready: false, dot: null };
  }
  const again = plan ? plan.again : s.turn === i && s.log[0]?.k === "lSix";
  return { label: again ? tIn(l, "rollAgain") : humans > 1 ? tIn(l, "rollFor", { name: pnameIn(p, l) }) : tIn(l, "roll"), ready: true, dot };
}
function requestRoll() { G.rollQueued = true; refreshRoll(); pump(); }
function pump() {
  if (!G.rollQueued || G.busy) return;
  if (G.state.over) { G.rollQueued = false; return refreshRoll(); }
  if (cur().type !== "human") return;
  G.rollQueued = false;
  takeTurn();
}
setCardRoll(rollInfo, requestRoll, pickMove);
// closing the card calls off a roll that hasn't started yet
onCardChange(() => { if (!cardOpen() && G.rollQueued) { G.rollQueued = false; render(); } });

function queueCpu() {
  clearTimeout(G.cpuTimer);
  if (!G.state.over && cur().type === "cpu") G.cpuTimer = setTimeout(takeTurn, reduced ? 200 : 700);
}

// ---- The ageing board (render/age.js): repainted when a turn ends, fading over 600 ms ----
let aged = null, ageSeq = 0;
const mix = (a, b, u) => ({ sepia: a.sepia + (b.sepia - a.sepia) * u, dim: a.dim + (b.dim - a.dim) * u });
function age(instant = false) {
  const L = lens(G.state), to = Array.from({ length: TOP + 1 }, (_, n) => (n ? wash(n, L) : null));
  for (let n = 1; n <= TOP; n++) labEls[n]?.classList.toggle("ahead", to[n].dim > 0);
  setDrone(G.state.last != null ? L.droneStage : null);
  setShepard(G.state.last != null ? L.lead : null, G.state.winner != null);
  const from = aged, seq = ++ageSeq;
  aged = to;
  if (instant || !from) return drawAge(to);
  return animate(600, u => { if (seq === ageSeq) drawAge(to.map((w, n) => (n ? mix(from[n], w, u) : null))); });
}

// ---- Rendering ----
function render() {
  const state = G.state, p = cur();
  $("turnDot").style.background = COLORS[p.color];
  $("turnName").textContent = state.winner != null ? t("wins", { name: pname(state.players[state.winner]) }) : pname(p);
  const human = p.type === "human";
  $("roll").disabled = G.busy || state.over || !human;
  $("roll").textContent = human ? t("roll") : t("rolling", { name: pname(p) });
  $("hint").textContent = state.over ? t("hintOver") : human ? t("hintHuman") : t("hintCpu");
  if (G.deciding) drawDecide();
  showDice(state.dice?.length ? state.dice : [state.last || 6]);
  refreshRoll();
  $("seed").textContent = `${t("seed")} ${state.rng.seed}`;

  place();
  renderLog();

  const w = state.winner, humans = state.players.filter(q => q.type === "human");
  $("win").hidden = !state.over;
  if (w != null) {
    const wp = state.players[w];
    $("winTitle").textContent = t("winTitle", { name: pname(wp) });
    $("winText").textContent = wp.type === "human" ? t("winHuman") : t("winCpu");
  } else if (state.over) {
    // A life that ran out of years ends on its own account, not on a race nobody won (REDESIGN.md Phase 8).
    // Only a game of several people has a race to report.
    const one = humans.length === 1 ? humans[0] : null;
    $("winTitle").textContent = one ? t("lifeTitle", { name: pname(one) }) : t("raceNone");
    $("winText").textContent = one ? t("diedText") : "";
  }
}

// ---- Setup panel ----
function renderSetup() {
  const setup = G.setup;
  $("count").setAttribute("aria-label", t("players"));
  $("count").innerHTML = [2, 3, 4].map(n => `<button type="button" data-n="${n}" aria-pressed="${n === setup.count}">${t("nPlayers", { n })}</button>`).join("");
  $("prows").innerHTML = setup.rows.slice(0, setup.count).map((r, i) => `
    <div class="prow">
      <span class="dot" style="background:${COLORS[i]}"></span>
      <input type="text" id="pname${i}" value="${esc(r.name)}" placeholder="${esc(t("def" + i))}" maxlength="16" aria-label="${t("colour" + i)}">
      <select id="ptype${i}" aria-label="${t("colour" + i)}">
        <option value="human"${r.type === "human" ? " selected" : ""}>${t("human")}</option>
        <option value="cpu"${r.type === "cpu" ? " selected" : ""}>${t("cpu")}</option>
      </select>
      <select id="pgender${i}" aria-label="${t("namingAs")} · ${t("colour" + i)}">
        ${[["", "genderAny"], ["f", "genderF"], ["m", "genderM"], ["n", "genderN"]].map(([v, k]) => `<option value="${v}"${(r.gender || "") === v ? " selected" : ""}>${t(k)}</option>`).join("")}
      </select>
    </div>`).join("");
  $("ruleSix").checked = setup.rules.six;
  $("ruleBrahmaloka").checked = !!setup.rules.brahmaloka;
  $("prefDepth").innerHTML = [["story", "depthStory"], ["school", "depthSchool"], ["scholar", "depthScholar"]]
    .map(([v, k]) => `<option value="${v}"${v === prefs.depth ? " selected" : ""}>${t(k)}</option>`).join("");
  $("prefEvery").checked = prefs.everyCard;
  $("prefBoth").checked = prefs.both;
}
function readSetup() {
  const setup = G.setup;
  setup.rows.slice(0, setup.count).forEach((r, i) => {
    r.name = $("pname" + i).value; r.type = $("ptype" + i).value; r.gender = $("pgender" + i).value;
  });
  setup.rules = { six: $("ruleSix").checked, brahmaloka: $("ruleBrahmaloka").checked };
}

// Static text, the ashrama labels on the frame and the language buttons.
function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t("title");
  document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  renderMute();
  // band centres, in rows from the bottom: two rows per stage
  $("ashramas").innerHTML = ASHRAMAS.slice(0, 5).map(([, en, hi], i) => `<span style="top:${((ROWS - (2 * i + 1)) / ROWS) * 100}%">${L(en, hi)}</span>`).join("");
}

function setLang(l) {
  if (l === lang) return;
  readSetup();
  setLangValue(l);
  try { localStorage.setItem("mp-lang", l); } catch {}
  applyStatic();
  buildCells();
  age(true);
  renderSetup();
  render();
  renderCodex();
  refreshCard();
  refreshLife();
  drawLanded();
}
document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));

$("count").addEventListener("click", e => {
  const b = e.target.closest("button[data-n]"); if (!b) return;
  readSetup(); G.setup.count = +b.dataset.n; renderSetup();
});

// ?seed=N fixes the first game's dice, so a life can be replayed or a bug reported with its seed.
const urlSeed = new URLSearchParams(location.search).get("seed");
let nextSeed = urlSeed != null && /^\d+$/.test(urlSeed) ? +urlSeed >>> 0 : null;

function startGame() {
  G.gen++;
  clearTimeout(G.cpuTimer);
  // a game left after a roll was a life, as one that ended is (prefs.js)
  if (G.humanRolled && firstLife()) lifeLived();
  G.rollQueued = false; G.plan = null; G.face = null; G.waitingCard = false; G.humanRolled = false;
  // a choice still waiting belongs to the game being left
  G.choosing = null; G.deciding = null; $("pick").hidden = true; $("pick").innerHTML = ""; $("roll").hidden = false;
  closeCard({ instant: true });
  closeLife();
  $("toastSlot").innerHTML = "";
  clearLanded();
  if (S) fxClear();
  G.busy = false;
  G.state = newState(nextSeed ?? freshSeed());
  nextSeed = null;
  buildTokens();
  render();
  age(true);
  queueCpu();
}
$("newGame").addEventListener("click", () => { readSetup(); startGame(); });
$("again").addEventListener("click", startGame);
$("readLife").addEventListener("click", () => openLife());

// ---- The naming, before the board (docs/NARRATIVE.md §3) ----
// The first player's name and gender, asked as the first thing that happens. Gender is required: Hindi
// verbs agree with it. A name left blank is drawn from content/names.json when the game starts.
function openNaming() {
  const r = G.setup.rows[0];
  $("namingName").value = r.name;
  document.querySelectorAll("#namingGenders input").forEach(i => { i.checked = i.value === r.gender; });
  $("naming").showModal();
}
$("namingForm").addEventListener("submit", () => {
  readSetup();
  const r = G.setup.rows[0];
  r.name = $("namingName").value.trim(); r.type = "human";
  r.gender = new FormData($("namingForm")).get("gender");
  saveSelf(r.name, r.gender);
  renderSetup();
  // nothing has been rolled yet, so the same seed gives the same game, now with its name
  nextSeed = G.state.rng.seed;
  startGame();
});
$("naming").addEventListener("cancel", e => e.preventDefault());
$("roll").addEventListener("click", takeTurn);
document.addEventListener("keydown", e => {
  // choosing on a situation: 1, 2 and 3 are its options in order
  if (G.deciding && /^[1-3]$/.test(e.key) && !e.target.closest("input, select, textarea") && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const o = G.deciding.opts[+e.key - 1];
    if (o) { e.preventDefault(); return pickOption(o.id); }
  }
  // choosing between the endgame's dice: 1 and 2 are the dice, S or 0 sits the year out
  if (G.choosing && !e.target.closest("input, select, textarea") && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const { dice } = G.choosing, v = e.key === "1" ? dice[0] : e.key === "2" ? dice[1] : /^[s0]$/i.test(e.key) ? 0 : null;
    if (v != null) { e.preventDefault(); return pickMove(v); }
  }
  if (e.code !== "Space" || e.target.closest("input, select, button, textarea, summary")) return;
  if (e.target.closest("[role=button]")) return;
  e.preventDefault();
  // a situation's choice is made with 1, 2 and 3, not by rolling past it
  if (cardBlocking()) return;
  // a person's roll takes the card away (REDESIGN.md Phase 11)
  if (cur().type === "human" && !G.busy && !G.state.over) return takeTurn();
  if (cardOpen()) closeCard();
});

// ---- Reading the board without playing: any square, any move in the log ----
// touching the board shows all of it, whatever the camera was doing
$("board").addEventListener("pointerdown", hold, { passive: true });
$("labels").addEventListener("focusin", hold);
$("labels").addEventListener("click", e => {
  const lab = e.target.closest(".lab");
  if (lab) openSquare(+lab.dataset.n, { from: lab });
});
// The board's squares in visual order, top-left first, for the arrow keys.
const gridIndex = n => { const { col, row } = colRow(n); return (ROWS - 1 - row) * 10 + col; };
const atIndex = i => +$("labels").children[i]?.dataset.n;
$("labels").addEventListener("keydown", e => {
  const lab = e.target.closest(".lab");
  if (!lab) return;
  const n = +lab.dataset.n;
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); return openSquare(n, { from: lab }); }
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -10, ArrowDown: 10 }[e.key];
  if (!step) return;
  e.preventDefault();
  const i = gridIndex(n) + step;
  if (i >= 0 && i < ROWS * 10 && (Math.abs(step) === 10 || Math.floor(i / 10) === Math.floor(gridIndex(n) / 10))) focusSquare(atIndex(i));
});
$("log").addEventListener("click", e => {
  const b = e.target.closest("[data-sq]");
  if (b) openSquare(+b.dataset.sq, { from: labEls[+b.dataset.sq] });
});

// ---- Preferences, which apply at once ----
$("prefDepth").addEventListener("change", e => { setPref("depth", e.target.value); refreshCard(); });
$("prefEvery").addEventListener("change", e => setPref("everyCard", e.target.checked));
$("prefBoth").addEventListener("change", e => { setPref("both", e.target.checked); refreshCard(); });
function renderMute() {
  const b = $("mute");
  b.setAttribute("aria-pressed", String(!prefs.mute));
  b.setAttribute("aria-label", t(prefs.mute ? "soundOff" : "soundOn"));
  b.title = t(prefs.mute ? "soundOff" : "soundOn");
  b.classList.toggle("off", prefs.mute);
}
$("mute").addEventListener("click", () => { setMuted(!prefs.mute); renderMute(); });
// browsers start audio only from a gesture
["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, unlockAudio, { passive: true }));
onCardChange(renderCodex);

// #sq/36 or #codex/nyaya opens that card, so any card can be linked.
function openFromHash() {
  const m = location.hash.match(/^#(sq|codex)\/([\w-]+)$/);
  if (!m) return;
  if (m[1] === "sq" && +m[2] >= 1 && +m[2] <= TOP) openSquare(+m[2]);
  else if (m[1] === "codex") openEntry(m[2]);
}
addEventListener("hashchange", openFromHash);

new ResizeObserver(draw).observe($("cells"));

// ?debug exposes helpers for testing: mp.jump(n) moves the current player, mp.roll(v) rolls a fixed number
// (mp.roll(a, b) fixes both endgame dice, and mp.pick(v) moves by one of them, 0 to sit),
// mp.seed() reads the current game's seed and mp.seed(n) starts a new game with that seed.
if (new URLSearchParams(location.search).has("debug")) {
  window.mp = {
    jump(n) { cur().pos = n; render(); age(true); },
    // mp.years(n) sets how many years the current player has lived, so the end of a life can be reached on demand
    years(n) { if (n != null) { cur().years = n; render(); age(true); } return cur().years; },
    // the lens the board is aged through: { fadeAge, dimAge, lead, droneStage }
    age: () => lens(G.state),
    // { ctx, stage, voices, wanted, muted }
    audio: audioState,
    // mp.quality("low") draws less: no camera, no motion extras, no paper grain
    quality(q) { if (q) { setQuality(q); pullBack(true); draw(); } return quality; },
    roll(...vs) { G.forcedRoll = vs.length > 1 ? vs : vs[0]; return takeTurn(); },
    // the moves the dice now offer, or null when nothing is waiting on a choice
    get choosing() { return G.choosing ? [...G.choosing.moves] : null; },
    pick: pickMove,
    // the options a situation offers, with whether each is open, or null when nothing is waiting on one
    get deciding() { return G.deciding ? G.deciding.opts.map(o => ({ id: o.id, open: o.open })) : null; },
    choose: pickOption,
    // the situation on square n, or null (REDESIGN.md Phase 10)
    situation: n => situationAt(n),
    // how many dice player i (the current one by default) has spent on practice in this life
    practised: (i = G.state.turn) => G.state.players[i].practised ?? 0,
    seed(n) { if (n == null) return G.state.rng.seed; nextSeed = n >>> 0; startGame(); return G.state.rng.seed; },
    get state() { return G.state; },
    // true while a turn is being played out
    get busy() { return G.busy; },
    open: openSquare,
    // the card as it stands: { detent, height, half, full } on a phone (null on a wide screen), opened further, rolled from
    sheet: () => ({ open: cardOpen(), sheet: sheetState(), expanded: cardExpanded(), carried: cardCarried() }),
    // presses the card's Roll; mp.rollFromCard(v) fixes the next roll, so call it on the reader's own turn
    rollFromCard(v) {
      const b = document.querySelector('#leaf .roll-c[aria-disabled="false"]');
      if (b && v != null) G.forcedRoll = v;
      b?.click();
      return !!b;
    },
    entry: openEntry,
    close: closeCard,
    sprite: spriteURL,
    data: { GOAL, TOP, LADDERS, SNAKES, SQ, HEAVEN, STR },
    setLang,
    life: openLife,
    // mp.rules({ brahmaloka: true }) changes the running game's rules
    rules(r) { if (r) Object.assign(G.state.rules, r); return { ...G.state.rules }; },
    lifeText: (i = 0, l) => lifeText(G.state, i, l),
    // mp.cast(0) is player 0's cast for this game, names, genders and ages, as the account draws it (Phase 10C)
    cast: (i = 0, life = 0) => castOf(G.state, i, life),
    naming: openNaming,
    // mp.first() treats this viewer as new from here on, as ?first does: the first life's cards, every bridge untold
    first() { beFirst(); refreshCard(); return firstLife(); },
    // the line under the board, or null when it is empty
    landed: () => $("landed").textContent || null,
  };
}

function start(data) {
  G.setup = data?.setup || defaultSetup();
  if (data?.setup?.lang && !urlLang) setLangValue(data.setup.lang);
  applyStatic();
  buildCells();
  renderSetup();
  if (data?.state) {
    G.state = data.state;
    G.state.rng ||= makeRng(freshSeed()); // saves from before the seeded die
    G.state.over ??= G.state.winner != null; // saves from before a life could end without a winner
    G.busy = false; buildTokens(); render(); age(true); queueCpu();
  }
  else {
    startGame();
    // the naming comes first for someone new, unless they arrived on a link to one card
    if (freshViewer || (!data?.setup && !loadSelf() && !location.hash)) openNaming();
  }
  draw();
  renderCodex();
  showTab("moves");
  openFromHash();
}
window.claude?.hot?.snapshot?.(() => ({ setup: { ...G.setup, lang }, state: G.state }));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});

// Installable and offline: the service worker caches the page, its icons and its fonts.
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
