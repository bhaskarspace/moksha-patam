// Moksha Patam: the page's wiring. Rules live in engine/, drawing in render/, content in content/*.json.
import { GOAL, ROWS, ASHRAMAS, LADDERS, SNAKES, SQ, HEAVEN, STR } from "./content.js";
import { lang, urlLang, setLangValue, L, num, t } from "./i18n.js";
import { G, defaultSetup, cardsMode, pname, cur, newState } from "./state.js";
import { $, COLORS, esc, reduced, sleep } from "./ui.js";
import { die, makeRng, freshSeed } from "./rng.js";
import { TUMBLE, planTurn, endTurn, addLog } from "./engine/turn.js";
import { S, colRow, buildCells, draw, fxClear } from "./render/board.js";
import { spriteURL } from "./render/sprites.js";
import { tokenEls, buildTokens, place, retrigger, climb, swallow } from "./render/tokens.js";
import { showCard } from "./render/card.js";
import { renderLog } from "./render/log.js";

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
  for (let i = 0; i < TUMBLE; i++) { showDie(die(rng)); await sleep(75); }
  const v = G.forcedRoll ?? die(rng);
  G.forcedRoll = null;
  showDie(v);
  return v;
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
  const p = cur(), idx = state.turn, el = tokenEls[idx];
  const v = await rollDie();
  if (g !== G.gen) return;
  state.last = v;
  const plan = planTurn(state, v);
  plan.pre.forEach(log);
  if (plan.target !== p.pos) {
    await sleep(150);
    for (let n = p.pos + 1; n <= plan.target; n++) {
      if (g !== G.gen) return;
      if (n > 1) { const dc = colRow(n).col - colRow(n - 1).col; if (dc) p.face = dc > 0 ? "r" : "l"; }
      p.pos = n; el._frame = 1 - el._frame;
      retrigger(el, "hop");
      place();
      await sleep(200);
    }
    if (g !== G.gen) return;
    el._frame = 0; place();
    const mode = cardsMode(state.rules);
    if (mode === "all" || (mode === "special" && !SQ[p.pos])) { await showCard(p.pos, p.type === "cpu"); if (g !== G.gen) return; }
    plan.after.forEach(log);
    if (plan.jump) {
      await (plan.jump.kind === "snake" ? swallow(idx, p.pos, plan.jump.to) : climb(idx, p.pos, plan.jump.to));
      if (g !== G.gen) return;
    }
  }
  endTurn(state, plan);
  G.busy = false;
  render();
  queueCpu();
}

function queueCpu() {
  clearTimeout(G.cpuTimer);
  if (G.state.winner == null && cur().type === "cpu") G.cpuTimer = setTimeout(takeTurn, reduced ? 200 : 700);
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
    </div>`).join("");
  $("ruleExact").checked = setup.rules.exact;
  $("ruleSix").checked = setup.rules.six;
  const mode = cardsMode(setup.rules);
  $("ruleCards").innerHTML = [["all", "cardsAll"], ["special", "cardsSpecial"], ["off", "cardsOff"]]
    .map(([v, k]) => `<option value="${v}"${v === mode ? " selected" : ""}>${t(k)}</option>`).join("");
}
function readSetup() {
  const setup = G.setup;
  setup.rows.slice(0, setup.count).forEach((r, i) => {
    r.name = $("pname" + i).value; r.type = $("ptype" + i).value;
  });
  setup.rules = { exact: $("ruleExact").checked, six: $("ruleSix").checked, cards: $("ruleCards").value };
}

// Static text, the ashrama labels on the frame and the language buttons.
function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t("title");
  document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
  $("ruleExactText").textContent = t("ruleExact", { n: GOAL });
  document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
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
  renderSetup();
  render();
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
  G.cardClose?.();
  $("sqcard").hidden = true; $("toastSlot").innerHTML = "";
  if (S) fxClear();
  G.busy = false;
  G.state = newState(nextSeed ?? freshSeed());
  nextSeed = null;
  buildTokens();
  render();
  queueCpu();
}
$("newGame").addEventListener("click", () => { readSetup(); startGame(); });
$("again").addEventListener("click", startGame);
$("roll").addEventListener("click", takeTurn);
document.addEventListener("keydown", e => {
  if (e.code !== "Space" || e.target.closest("input, select, button, textarea, summary")) return;
  e.preventDefault();
  if (G.cardClose) return G.cardClose();
  if (cur().type === "human") takeTurn();
});

new ResizeObserver(draw).observe($("cells"));

// ?debug exposes helpers for testing: mp.jump(n) moves the current player, mp.roll(v) rolls a fixed number,
// mp.seed() reads the current game's seed and mp.seed(n) starts a new game with that seed.
if (new URLSearchParams(location.search).has("debug")) {
  window.mp = {
    jump(n) { cur().pos = n; render(); },
    roll(v) { G.forcedRoll = v; return takeTurn(); },
    seed(n) { if (n == null) return G.state.rng.seed; nextSeed = n >>> 0; startGame(); return G.state.rng.seed; },
    get state() { return G.state; },
    sprite: spriteURL,
    data: { LADDERS, SNAKES, SQ, HEAVEN, STR },
    setLang,
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
    G.busy = false; buildTokens(); render(); queueCpu();
  }
  else startGame();
  draw();
}
window.claude?.hot?.snapshot?.(() => ({ setup: { ...G.setup, lang }, state: G.state }));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
