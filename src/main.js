// Moksha Patam: the page's wiring. Rules live in engine/, drawing in render/, content in content/*.json.
import { GOAL, ROWS, ASHRAMAS, LADDERS, SNAKES, SQ, HEAVEN, STR } from "./content.js";
import { lang, urlLang, setLangValue, L, num, t } from "./i18n.js";
import { G, defaultSetup, pname, cur, newState, loadSelf, saveSelf } from "./state.js";
import { prefs, setPref } from "./prefs.js";
import { $, COLORS, esc, reduced, sleep, quality, forcedQuality, setQuality } from "./ui.js";
import { die, makeRng, freshSeed } from "./rng.js";
import { TUMBLE, planTurn, endTurn, addLog } from "./engine/turn.js";
import { S, colRow, labEls, buildCells, draw, drawAge, fxClear, focusSquare } from "./render/board.js";
import { lens, wash, stageAt } from "./render/age.js";
import { frame, pullBack, hold, release } from "./render/camera.js";
import { spriteURL } from "./render/sprites.js";
import { tokenEls, buildTokens, place, retrigger, climb, swallow, animate } from "./render/tokens.js";
import { openSquare, openEntry, closeCard, cardIdle, cardOpen, refreshCard, onCardChange } from "./render/card.js";
import { renderCodex, showTab } from "./render/codex.js";
import { renderLog } from "./render/log.js";
import { openLife, refreshLife, closeLife, lifeText } from "./render/life.js";
import { sound, unlockAudio, setDrone, setMuted, audioState } from "./audio/engine.js";

const PIPS = { 1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8] };

// ---- Die ----
const dieEl = $("die");
for (let i = 0; i < 9; i++) dieEl.appendChild(document.createElement("span"));
function showDie(v) {
  [...dieEl.children].forEach((s, i) => s.classList.toggle("on", PIPS[v].includes(i)));
  dieEl.setAttribute("aria-label", `🎲 ${num(v)}`);
}
async function rollDie() {
  const rng = G.state.rng;
  dieEl.classList.remove("rolling"); void dieEl.offsetWidth; dieEl.classList.add("rolling");
  sound.rattle();
  for (let i = 0; i < TUMBLE; i++) { showDie(die(rng)); await sleep(75); }
  const v = G.forcedRoll ?? die(rng);
  G.forcedRoll = null;
  showDie(v);
  return v;
}

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
  if (G.busy || state.winner != null) return;
  const g = G.gen;
  G.busy = true; render();
  // nobody moves while someone is reading a card
  await cardIdle();
  if (g !== G.gen) return;
  const p = cur(), idx = state.turn, el = tokenEls[idx];
  release();
  const v = await rollDie();
  if (g !== G.gen) return;
  state.last = v;
  // the drone begins with the first roll
  setDrone(lens(state).droneStage);
  const watching = watchFrames();
  const plan = planTurn(state, v);
  plan.pre.forEach(log);
  // every roll moves now: a bounce can come back to the square it started from, but it still walks
  {
    await sleep(150);
    const born = stageAt(p.pos);
    frame(p.pos || 1, plan.path.at(-1));
    // the walk follows the planned path, which turns at 110 on a bounce
    for (const n of plan.path) {
      if (g !== G.gen) return;
      if (n > 1 && p.pos > 0) { const dc = colRow(n).col - colRow(p.pos).col; if (dc) p.face = dc > 0 ? "r" : "l"; }
      p.pos = n; el._frame = 1 - el._frame;
      retrigger(el, "hop");
      place();
      await sleep(200);
    }
    if (g !== G.gen) return;
    el._frame = 0; place();
    // a new ashrama is seen whole
    if (stageAt(p.pos) !== born) pullBack();
    await cardIdle();
    if (g !== G.gen) return;
    if (prefs.landAll || !SQ[p.pos]) {
      // a person's landing card waits for them; a computer's closes itself unless someone starts reading it
      await openSquare(p.pos, { landing: true, auto: p.type === "cpu" });
      if (g !== G.gen) return;
    }
    plan.after.forEach(log);
    if (plan.jump) {
      await cardIdle();
      if (g !== G.gen) return;
      (plan.jump.kind === "snake" ? sound.snake : sound.ladder)();
      frame(p.pos, plan.jump.to);
      await (plan.jump.kind === "snake" ? swallow(idx, p.pos, plan.jump.to) : climb(idx, p.pos, plan.jump.to));
      if (g !== G.gen) return;
    }
  }
  endTurn(state, plan);
  watching();
  pullBack();
  G.busy = false;
  render();
  age();
  queueCpu();
}

function queueCpu() {
  clearTimeout(G.cpuTimer);
  if (G.state.winner == null && cur().type === "cpu") G.cpuTimer = setTimeout(takeTurn, reduced ? 200 : 700);
}

// ---- The ageing board (render/age.js): repainted when a turn ends, fading over 600 ms ----
let aged = null, ageSeq = 0;
const mix = (a, b, u) => ({ sepia: a.sepia + (b.sepia - a.sepia) * u, dim: a.dim + (b.dim - a.dim) * u });
function age(instant = false) {
  const L = lens(G.state), to = Array.from({ length: GOAL + 1 }, (_, n) => (n ? wash(n, L) : null));
  for (let n = 1; n <= GOAL; n++) labEls[n]?.classList.toggle("ahead", to[n].dim > 0);
  setDrone(G.state.last != null ? L.droneStage : null);
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
  $("roll").disabled = G.busy || state.winner != null || !human;
  $("roll").textContent = human ? t("roll") : t("rolling", { name: pname(p) });
  $("hint").textContent = state.winner != null ? t("hintOver") : human ? t("hintHuman") : t("hintCpu");
  showDie(state.last || 6);
  $("seed").textContent = `${t("seed")} ${state.rng.seed}`;

  place();
  renderLog();

  const w = state.winner;
  $("win").hidden = w == null;
  if (w != null) {
    const wp = state.players[w];
    $("winTitle").textContent = t("winTitle", { name: pname(wp) });
    $("winText").textContent = wp.type === "human" ? t("winHuman") : t("winCpu");
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
  $("prefLand").checked = prefs.landAll;
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
  closeCard({ instant: true });
  closeLife();
  $("toastSlot").innerHTML = "";
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
  if (e.code !== "Space" || e.target.closest("input, select, button, textarea, summary")) return;
  if (e.target.closest("[role=button]")) return;
  e.preventDefault();
  if (cardOpen()) return closeCard();
  if (cur().type === "human") takeTurn();
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
$("prefLand").addEventListener("change", e => setPref("landAll", e.target.checked));
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
  if (m[1] === "sq" && +m[2] >= 1 && +m[2] <= GOAL) openSquare(+m[2]);
  else if (m[1] === "codex") openEntry(m[2]);
}
addEventListener("hashchange", openFromHash);

new ResizeObserver(draw).observe($("cells"));

// ?debug exposes helpers for testing: mp.jump(n) moves the current player, mp.roll(v) rolls a fixed number,
// mp.seed() reads the current game's seed and mp.seed(n) starts a new game with that seed.
if (new URLSearchParams(location.search).has("debug")) {
  window.mp = {
    jump(n) { cur().pos = n; render(); age(true); },
    // the lens the board is aged through: { fadeAge, dimAge, lead, droneStage }
    age: () => lens(G.state),
    // { ctx, stage, voices, wanted, muted }
    audio: audioState,
    // mp.quality("low") draws less: no camera, no motion extras, no paper grain
    quality(q) { if (q) { setQuality(q); pullBack(true); draw(); } return quality; },
    roll(v) { G.forcedRoll = v; return takeTurn(); },
    seed(n) { if (n == null) return G.state.rng.seed; nextSeed = n >>> 0; startGame(); return G.state.rng.seed; },
    get state() { return G.state; },
    open: openSquare,
    entry: openEntry,
    close: closeCard,
    sprite: spriteURL,
    data: { LADDERS, SNAKES, SQ, HEAVEN, STR },
    setLang,
    life: openLife,
    // mp.rules({ brahmaloka: true }) changes the running game's rules
    rules(r) { if (r) Object.assign(G.state.rules, r); return { ...G.state.rules }; },
    lifeText: (i = 0, l) => lifeText(G.state, i, l),
    naming: openNaming,
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
    G.busy = false; buildTokens(); render(); age(true); queueCpu();
  }
  else {
    startGame();
    // the naming comes first for someone new, unless they arrived on a link to one card
    if (!data?.setup && !loadSelf() && !location.hash) openNaming();
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
