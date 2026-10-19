// ---- The card: a pothi folio for one square or one Codex entry ----
// It stays open until the reader closes it. A computer's landing card closes itself after a
// reading-length pause, unless the reader touches it, and then it waits like any other.
import { GOAL, TOP, ASHRAMAS, LADDERS, SNAKES, SQ, HEAVEN, READINGS, CODEX, ENTRY_IDS, REFS, entryOf, sourceOf, srcOfSquare, squareOf, snakeOn } from "../content.js";
import { lang, tIn, numIn, srcIn, pick, fill, ageWordsIn } from "../i18n.js";
import { ageStep, stageOfYears, bhumikaOf, freshGunas, SANNYASA } from "../engine/self.js";
import { prefs, hasMet, meet } from "../prefs.js";
import { G, pnameIn } from "../state.js";
import { $, esc, reduced, art } from "../ui.js";
import { sound } from "../audio/engine.js";
import { ashramaIn, labEls } from "./board.js";
import { pullBack } from "./camera.js";
import { illumined } from "./frame.js";
import { sheetOn, sheetBefore, sheetIn, sheetOut, sheetAfter, setDetent, toggleDetent, sheetDetent, onSheetClose } from "./sheet.js";

const dlg = $("folio"), leaf = $("leaf");
const other = l => (l === "hi" ? "en" : "hi");
const DEPTHS = ["story", "school", "scholar"];
const deep = d => DEPTHS.indexOf(prefs.depth) >= DEPTHS.indexOf(d);

let view = null;           // { type: "square", n } or { type: "entry", id }
let cardLang = null;       // the card's own language, when the reader flips it
let backTo = null;         // the square an entry was opened from
let subject = null;        // the player a square's moment is about; the player whose turn it is when unset
let autoTimer = null, closing = false, waiters = [];
// The card opens with its story; the voices wait behind one tap. Opened further, it stays so while the card is open,
// through paging, the Codex and every roll from it, and is collapsed again when the card closes.
let expanded = false;
// Rolled from: the reader asked to keep reading while the game goes on, so the card no longer holds the game
// up, never closes itself, and turns to each of the reader's landings in place (REDESIGN.md Phase 6).
let carried = false;
let rollSrc = () => null, rollFn = () => {}, pickFn = () => {};
const onChange = new Set(); // called after a card opens or closes, so the Codex panel can refresh

export const cardOpen = () => dlg.open;
export const cardCarried = () => dlg.open && carried;
export const cardExpanded = () => dlg.open && expanded;
export const cardIdle = () => (dlg.open && !carried ? new Promise(r => waiters.push(r)) : Promise.resolve());
export const onCardChange = fn => onChange.add(fn);
// The card's Roll: `src(l)` says who would roll and whether they can, as { label, ready, dot } or null; `fn` rolls.
// While the endgame's dice wait for a choice (REDESIGN.md Phase 9) it says { choose: [{ v, label }] } instead,
// and `pick(v)` makes the move, so a reader on a phone chooses on the card that covers the panel.
export const setCardRoll = (src, fn, pick) => { rollSrc = src; rollFn = fn; pickFn = pick; };

// ---- What a square's card says, in language l ----
function squareInfo(n, l) {
  const T = (k, v) => tIn(l, k, v), o = other(l), r = READINGS[n] || {};
  const sl = !HEAVEN[n] && (LADDERS[n] || SNAKES[n]), scholar = deep("scholar");
  const skt = (scholar && r.iast) || sl?.skt || "";
  if (sl) {
    const virtue = !!LADDERS[n];
    return { kind: virtue ? "virtue" : "vice", big: sl.ic, title: sl[l], alt: [sl[o], skt],
      eb: `${T(virtue ? "virtue" : "vice")} · ${stageIn(l, n)}`, ft: T(virtue ? "ladderTo" : "snakeTo", { n: sl.to }) };
  }
  if (n === GOAL) {
    return { kind: "goal", big: "ॐ", title: l === "hi" ? "मोक्ष" : "Moksha", alt: [o === "hi" ? "मोक्ष" : "Moksha", scholar ? r.iast : T("liberation")],
      eb: T("end"), ft: "" };
  }
  if (HEAVEN[n]) {
    const h = HEAVEN[n];
    const sn = snakeOn(n);
    return { kind: "heaven", big: h.ic, title: h[l], alt: [h[o], scholar ? r.iast : ""], eb: T("realm"), ft: sn ? T("snakeTo", { n: sn.to }) : "" };
  }
  const q = SQ[n];
  return { kind: "story", big: q.ic, title: q[l], alt: [q[o], scholar ? r.iast : ""], eb: `${T("story")} · ${stageIn(l, n)}`, ft: "" };
}

// The player a moment is about, as a name in language l, a gender for agreement, and the age the moment says.
// On the square they are standing on that is the years they have lived (REDESIGN.md Phase 8), "still" so when a
// snake has just put them there; on any other square, the age the square is written for.
const subjectOf = () => G.state?.players[subject ?? G.state.turn];
// Who is standing on square n, as { p, years, still }: during a landing the turn has not been ended yet, so
// the years are the ones this landing brings.
function livedOn(n) {
  const p = subjectOf(), plan = G.plan;
  if (!p || p.pos !== n || p.pos > 100) return null;
  if (plan && G.state.players[plan.idx] === p && plan.target === n) return { p, years: ageStep(p.years ?? 0, n), still: false };
  if (!p.life?.length) return null;
  const head = SNAKES[p.life.at(-2)];
  // never younger than the square: only a token moved by hand (mp.jump) can be
  return { p, years: Math.max(p.years ?? 0, squareOf(n)?.age ?? 0), still: !!head && !head.rebirth && head.to === n && p.life.at(-1) === n };
}
function person(l, n) {
  const p = subjectOf(), here = livedOn(n), a = here ? here.years : squareOf(n)?.age;
  const age = Number.isInteger(a) ? ageWordsIn(l, a, !!here?.still) : "";
  return p ? { name: pnameIn(p, l), gender: p.gender, age } : { name: "", gender: "m", age };
}
// The stage a card's eyebrow names. On the subject's own square it is the stage they are actually in, by years,
// and in sannyasa the bhumika they have reached rather than the one the square implies; elsewhere the square's.
function stageIn(l, n) {
  const here = livedOn(n);
  if (!here) return ashramaIn(l, n);
  const s = stageOfYears(here.years);
  return s === SANNYASA ? tIn(l, "bhumika" + bhumikaOf(here.p.gunas ?? freshGunas(), here.p.practised ?? 0)) : l === "hi" ? ASHRAMAS[s][2] : ASHRAMAS[s][1];
}

// An authored age as the card furniture says it: a newborn, months for a baby, then years.
export const ageIn = (l, a) => (a === 0 ? tIn(l, "ageBirth") : a < 1 ? tIn(l, "ageMonths", { n: Math.round(a * 12) }) : tIn(l, "age", { n: a }));

// A bilingual text as paragraphs: the card's language, then the other one when both are wanted.
const texts = (l, en, hi, cls = "") => {
  const [a, b] = l === "hi" ? [hi, en] : [en, hi];
  return `<p class="${cls}">${esc(a)}</p>` + (prefs.both && b ? `<p class="${cls} second" lang="${other(l)}">${esc(b)}</p>` : "");
};
const bi = (l, obj, cls) => (obj ? texts(l, obj.en || "", obj.hi || pick(obj, "hi"), cls) : "");
const entryName = (id, l) => esc(pick(entryOf(id)?.e.name, l));
const entryLink = (id, l, cls = "chip") => `<a class="${cls}${hasMet(id) ? "" : " new"}" href="#codex/${id}" data-entry="${id}">${cls === "chip" ? art(`seal-${id}`, "", "seal") : ""}${entryName(id, l)}</a>`;

function extras(kind) {
  const rnd = i => (i * 37) % 100;
  if (kind === "virtue") return `<div class="rays"></div>` + [...Array(7)].map((_, i) => `<span class="sp" style="left:${8 + rnd(i + 1) * 0.84}%;animation-delay:${(i * 0.26).toFixed(2)}s">✦</span>`).join("");
  if (kind === "heaven" || kind === "goal") return `<div class="rays"></div>` + [...Array(6)].map((_, i) => `<span class="pt" style="left:${6 + rnd(i + 2) * 0.86}%;animation-delay:${(i * 0.4).toFixed(2)}s">🌸</span>`).join("");
  return "";
}

// The toggle for what a card says beyond its story, or nothing when there is nothing more at this depth.
const moreBtn = l => `<button type="button" class="more-btn" data-act="more" aria-controls="leafMore" aria-expanded="${expanded}">${tIn(l, expanded ? "less" : deep("scholar") ? "moreScholar" : "moreSchool")}</button>`;

// On a phone the grip, the × and the Roll sit where a thumb reaches; on a wide screen the × stays top right.
// Each control that moves is drawn in both places and styles.css hides one, which also takes it out of the
// accessibility tree, and the dialog's first focus lands on whichever × is showing.
function frame(l, { kind, eb, big, sqn, age, body, more = "", foot, prev, next, prevLabel, nextLabel }) {
  const T = (k, v) => tIn(l, k, v);
  const x = cls => `<button type="button" class="x ${cls}" data-act="close" aria-label="${T("close")}" autofocus>×</button>`;
  return `<div class="flourish" aria-hidden="true">${extras(kind)}</div>
    <header class="leaf-top">
      <button type="button" class="grip" data-act="grip" aria-label="${T(sheetDetent() === "full" ? "gripLess" : "gripMore")}" aria-expanded="${sheetDetent() === "full"}"><span></span></button>
      <span class="eb">${eb}${foot ? `<span class="ft-top">${foot}</span>` : ""}</span>
      <span class="cnote" hidden></span>
      <div class="leaf-tools">
        <div class="lang-mini" role="group" aria-label="${T("cardLang")}">
          <button type="button" data-cl="en" aria-pressed="${l === "en"}">EN</button><button type="button" data-cl="hi" lang="hi" aria-pressed="${l === "hi"}">हिं</button>
        </div>
        ${x("x-top")}
      </div>
    </header>
    <div class="leaf-main">
      <div class="leaf-margin" aria-hidden="true"><span class="glyph">${big}</span>${sqn || age ? `<span class="tally">${sqn ? `<span class="sqn">${sqn}</span>` : ""}${age ? `<span class="age">${age}</span>` : ""}</span>` : ""}<span class="hole"></span></div>
      <div class="leaf-text" lang="${l}">${body}${more ? moreBtn(l) + `<div class="more" id="leafMore"${expanded ? "" : " hidden"}>${more}</div>` : ""}</div>
    </div>
    <footer class="leaf-foot">
      ${x("x-foot")}
      ${prev != null ? `<button type="button" class="nav" data-act="prev" aria-label="${prevLabel}">‹ <span>${prev}</span></button>` : "<span></span>"}
      <div class="mid"><span class="ft">${foot}</span><button type="button" class="roll-c" data-act="roll" hidden></button><span class="pick-c" role="group" hidden></span></div>
      ${next != null ? `<button type="button" class="nav" data-act="next" aria-label="${nextLabel}"><span>${next}</span> ›</button>` : "<span></span>"}
    </footer>`;
}

// A citation, linked to its Codex source. On a square it is bare in the story, and the source's one-line gloss
// is behind the toggle: the first time it is met at school depth, and always for scholars. An entry shows it as before.
function srcLine(src, l, met, { square = false } = {}) {
  if (!src) return "";
  const sid = sourceOf(src), s = sid && CODEX.sources[sid], firstTime = sid && !hasMet(sid);
  met.push(sid);
  const gloss = s && (square ? deep("school") && (firstTime || deep("scholar")) : firstTime || deep("scholar"));
  return `<p class="srcline">` + (sid ? `<a class="src" href="#codex/${sid}" data-entry="${sid}">${esc(srcIn(l, src))}</a>` : `<span class="src">${esc(srcIn(l, src))}</span>`) +
    (gloss ? `<span class="gloss${square ? " more-only" : ""}">${esc(pick(s.gloss, l))}</span>` : "") + `</p>`;
}

function squareHtml(n, l) {
  const T = (k, v) => tIn(l, k, v), info = squareInfo(n, l), r = READINGS[n] || {};
  const src = srcOfSquare(n), met = [];
  // the moment, when there is one, is what is happening to the player; the mirror is the text that holds
  // it. With no moment the card is exactly the Phase 2 card: no age, and the Phase 2 lead as the mirror.
  const sq = squareOf(n), m = sq.moment, mirror = m?.mirror || sq.mirror;
  const age = m && sq.age != null ? ageIn(l, livedOn(n)?.years ?? sq.age) : "";
  let body = `<h2 id="leafTitle">${esc(info.title)}</h2>`;
  const alt = info.alt.filter(Boolean).join(" · ");
  if (alt) body += `<p class="alt" lang="${other(l)}">${esc(alt)}</p>`;
  const moment = m ? texts(l, fill(m.en, person("en", n)), fill(m.hi, person("hi", n)), n > 100 ? "moment remnant" : "moment") : "";
  // a snake tail one square below its remedy says so (REDESIGN.md Phase 4, item 3)
  const remedy = sq.remedy ? texts(l, fill(sq.remedy.en, person("en", n)), fill(sq.remedy.hi, person("hi", n)), "remedy") : "";
  // past the exit, the card says the way out is behind and below (REDESIGN.md Phase 7, item 3)
  const above = n > GOAL && HEAVEN[n] ? texts(l, ...["en", "hi"].map(x => tIn(x, "aboveExit", { n: numIn(x, GOAL), top: numIn(x, TOP) })), "remedy above") : "";
  body += `<div class="story">${moment}${remedy}${texts(l, mirror.en, mirror.hi, m ? "mirror" : "")}${bi(l, r.line2, "line2")}${above}</div>`;
  // what the toggle opens: the voices, and the notes, at the reader's depth
  // Codex entries in it count as met only once the reader opens it
  let more = "";
  const metMore = [];
  // the views panel is the point of the exit, so it is part of its story at every depth: six definitions side by side
  const viewList = (vs, cls) => `<ul class="${cls}">` + vs.map(v => `<li>${entryLink(v.id, l)}${texts(l, v.en, v.hi)}</li>`).join("") + `</ul>`;
  if (r.views && n === GOAL) {
    body += `<h3 class="sub">${T("viewsGoal")}</h3>` + viewList(r.views, "views side");
    met.push(...r.views.map(v => v.id));
  } else if (r.views && deep("school")) {
    more += `<h3 class="sub">${T("views")}</h3>` + viewList(r.views, "views");
    metMore.push(...r.views.map(v => v.id));
  }
  if (r.beyond && (n === GOAL || deep("school"))) {
    const html = `<h3 class="sub">${T("viewsBeyond")}</h3>` + viewList(r.beyond, "views");
    if (n === GOAL) body += html; else more += html;
    (n === GOAL ? met : metMore).push(...r.beyond.map(v => v.id));
  }
  if (r.schools && deep("school")) {
    more += `<h3 class="sub">${T("argued")}</h3><ul class="chips">` +
      r.schools.map(s => `<li>${entryLink(s.id, l)}${texts(l, s.en, s.hi)}</li>`).join("") + `</ul>`;
    metMore.push(...r.schools.map(s => s.id));
  }
  // a square with no voices shows its scholar note at school depth rather than a bare lead
  if (deep("scholar") || (deep("school") && !r.schools?.length && !r.views?.length)) more += bi(l, r.scholar, "note");
  if (deep("scholar")) {
    if (r.figures?.length) {
      more += `<p class="people"><span>${T("people")}:</span> ${r.figures.map(id => entryLink(id, l, "plink")).join(" · ")}</p>`;
      metMore.push(...r.figures);
    }
  }
  body += srcLine(src, l, met, { square: true });
  // a snake that starts on a god's square (108, merit spent) follows the god, in the snakes' own voice
  const sn = snakeOn(n);
  if (sn) {
    const sm = sn.moment;
    body += `<section class="snake-on"><h3 class="sub">${art(`sn-${n}`, sn.ic, "spr snake-glyph")} ${esc(T("meritSnake"))}</h3>` +
      `<h2 class="snake-title">${esc(sn[l])}</h2><p class="alt" lang="${other(l)}">${esc([sn[other(l)], sn.skt].join(" · "))}</p>` +
      `<div class="story">${sm ? texts(l, fill(sm.en, person("en", n)), fill(sm.hi, person("hi", n)), "moment") : ""}${texts(l, sn.mirror.en, sn.mirror.hi, sm ? "mirror" : "")}` +
      // the rebirth snake says when it takes someone, since most arrivals on its square are let be
      `${sn.rebirth ? texts(l, tIn("en", "fallWhen"), tIn("hi", "fallWhen"), "remedy fall") : ""}</div>`;
    if (sn.schools && deep("school")) {
      body += `<ul class="chips more-only">` + sn.schools.map(s => `<li>${entryLink(s.id, l)}${texts(l, s.en, s.hi)}</li>`).join("") + `</ul>`;
      metMore.push(...sn.schools.map(s => s.id));
    }
    body += srcLine(sn.src, l, met, { square: true }) + `</section>`;
  }
  return {
    kind: info.kind, met, metMore,
    html: frame(l, { kind: info.kind, eb: info.eb + (age ? ` · ${age}` : ""), big: n === GOAL ? illumined(null, info.big) : illumined(document.getElementById(`sq-${n}`) ? `sq-${n}` : null, info.big), sqn: numIn(l, n), age, body, more, foot: info.ft,
      prev: n > 1 ? numIn(l, n - 1) : null, next: n < TOP ? numIn(l, n + 1) : null, prevLabel: T("prevSq"), nextLabel: T("nextSq") }),
  };
}

function entryHtml(id, l) {
  const T = (k, v) => tIn(l, k, v), { kind, e } = entryOf(id), o = other(l), i = ENTRY_IDS.indexOf(id);
  const alt = [pick(e.name, o), e.iast && e.iast !== e.name.en ? e.iast : ""].filter(Boolean).join(" · ");
  let body = `<h2 id="leafTitle">${esc(pick(e.name, l))}</h2>` + (alt ? `<p class="alt">${esc(alt)}</p>` : "");
  if (e.tag || e.dates) body += `<p class="tag">${esc(pick(e.tag || e.dates, l))}</p>`;
  body += `<div class="story">${bi(l, e.line || e.gloss)}</div>`;
  if (e.body) body += bi(l, e.body, "note");
  if (e.moksha) body += `<h3 class="sub">${T("mokshaFor")}</h3>` + bi(l, e.moksha, "moksha");
  const people = kind === "school" ? Object.keys(CODEX.figures).filter(f => CODEX.figures[f].school === id) : kind === "figure" && e.school ? [e.school] : [];
  if (people.length) body += `<p class="people"><span>${T(kind === "school" ? "people" : "school")}:</span> ${people.map(p => entryLink(p, l, "plink")).join(" · ")}</p>`;
  const refs = REFS[id] || [];
  if (refs.length) body += `<p class="onboard"><span>${T("onBoard")}:</span> ${refs.map(n => `<a href="#sq/${n}" data-sq="${n}">${numIn(l, n)}</a>`).join(" ")}</p>`;
  if (e.url) body += `<p class="srcline"><a class="src" href="${esc(e.url)}" target="_blank" rel="noopener">${T("readMore")} ↗</a></p>`;
  const prev = ENTRY_IDS[i - 1], next = ENTRY_IDS[i + 1];
  return {
    kind: "entry", met: [id, ...people],
    html: frame(l, { kind: "entry", eb: T(kind === "school" ? "entrySchool" : kind === "source" ? "entrySource" : "entryFigure"), big: kind === "school" ? "🪔" : kind === "source" ? "📜" : "🪷",
      body, foot: backTo != null ? `<button type="button" class="nav back" data-act="back">${T("back", { n: backTo })}</button>` : "",
      prev: prev ? entryName(prev, l) : null, next: next ? entryName(next, l) : null, prevLabel: T("prevEntry"), nextLabel: T("nextEntry") }),
  };
}

// Draws the current view into the leaf. Entries met here are added to the Codex after the
// leaf is drawn, so "new" marks show on the card that introduced them. Whatever control had focus has it again
// afterwards, so a keyboard or screen reader keeps its place when the leaf is redrawn under it.
let metMore = [];
function paint({ landing = false } = {}) {
  const l = cardLang ?? lang;
  const fa = leaf.contains(document.activeElement) ? document.activeElement : null;
  const again = fa?.dataset.act ? `[data-act="${fa.dataset.act}"]` : fa?.dataset.cl ? `[data-cl="${fa.dataset.cl}"]` : null;
  const out = view.type === "square" ? squareHtml(view.n, l) : entryHtml(view.id, l);
  leaf.className = "leaf " + out.kind + (landing ? " landed" : "") + (expanded ? " open" : "");
  leaf.innerHTML = out.html;
  metMore = out.metMore || [];
  meet([...out.met, ...(expanded ? metMore : [])].filter(Boolean));
  refreshRoll();
  if (again) [...leaf.querySelectorAll(again)].find(el => el.offsetParent)?.focus({ preventScroll: true });
  cue();
  // the address bar names what is open, so a card can be linked
  history.replaceState(null, "", location.pathname + location.search + (view.type === "square" ? `#sq/${view.n}` : `#codex/${view.id}`));
  onChange.forEach(fn => fn());
}

// While the text can scroll further, its lower edge fades, so a card that goes on never looks cut off.
function cue() {
  const m = leaf.querySelector(".leaf-main");
  if (m) m.classList.toggle("more-below", m.scrollHeight - m.scrollTop - m.clientHeight > 2);
}
leaf.addEventListener("scroll", cue, { capture: true, passive: true });
addEventListener("resize", () => dlg.open && cue());

// The card's Roll, redrawn in place whenever who can roll changes, so it never steals focus by being replaced.
export function refreshRoll() {
  const b = leaf.querySelector(".roll-c"), c = leaf.querySelector(".pick-c");
  if (!b) return;
  const r = dlg.open || view ? rollSrc(cardLang ?? lang) : null;
  const choose = r?.choose ?? null, was = c?.dataset.moves ?? "", moves = choose ? choose.map(o => o.v).join() : "";
  b.hidden = !r || !!choose;
  if (c) {
    c.hidden = !choose;
    // redrawn only when the choice changes, so a focused button keeps its focus
    if (moves !== was) {
      c.dataset.moves = moves;
      c.innerHTML = choose ? choose.map(o => `<button type="button" class="roll-c" data-act="pick" data-v="${o.v}" aria-disabled="false">${esc(o.label)}</button>`).join("") : "";
      if (choose) c.querySelector("button")?.focus({ preventScroll: true });
    }
  }
  if (!r || choose) return;
  b.innerHTML = (r.dot ? `<span class="dot" style="background:${r.dot}"></span>` : "") + esc(r.label);
  b.setAttribute("aria-disabled", String(!r.ready));
}

// Opens the voices, or closes them. On a phone, opening them also raises the sheet to full height.
function setExpanded(on) {
  expanded = on;
  leaf.classList.toggle("open", on);
  const more = $("leafMore"), btn = leaf.querySelector(".more-btn");
  if (more) more.hidden = !on;
  if (btn) {
    btn.setAttribute("aria-expanded", String(on));
    btn.textContent = tIn(cardLang ?? lang, on ? "less" : deep("scholar") ? "moreScholar" : "moreSchool");
  }
  if (on) meet(metMore.filter(Boolean));
  if (sheetOn()) setDetent(on ? "full" : "half");
  cue();
}

// A note in the card's top strip, for a computer's move while the reader rolls from the card.
export function cardNote(text) {
  const el = leaf.querySelector(".cnote");
  if (!el) return;
  el.textContent = text;
  el.hidden = !text;
}

// ---- Opening and closing ----
const visible = el => { const r = el?.getBoundingClientRect(); return r && r.width > 0 && r.bottom > 0 && r.top < innerHeight; };

// Morphs the source square into the card with a view transition, or zooms where that is missing.
// On a phone the card is a sheet and slides up instead: a square swelling into the width of the screen reads badly.
async function transition(update, label) {
  if (sheetOn()) { sheetBefore(); update(); return sheetIn(); }
  if (reduced) return update();
  if (document.startViewTransition && visible(label)) {
    label.style.viewTransitionName = "folio";
    const vt = document.startViewTransition(() => { label.style.viewTransitionName = ""; update(); });
    return vt.finished.catch(() => {});
  }
  update();
  if (visible(label)) {
    const from = label.getBoundingClientRect(), to = leaf.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
    leaf.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width})`, opacity: 0.3 }, { transform: "none", opacity: 1 }], { duration: 360, easing: "cubic-bezier(.2,.8,.25,1.1)" });
  }
}

async function open(next, { landing = false, auto = false, from = null, who = null } = {}) {
  clearTimeout(autoTimer);
  const wasOpen = dlg.open, was = view;
  view = next;
  subject = who;
  // already open: the leaf turns to the new square, forward or back
  if (wasOpen) {
    paint({ landing });
    turnPage(was?.type === "square" && next.type === "square" ? Math.sign(next.n - was.n) : 0);
    return cardIdle();
  }
  cardLang = null;
  // a card is read with the whole board behind it, and the morph starts from where the square really is
  pullBack(true);
  const label = from ?? (next.type === "square" ? labEls[next.n] : null);
  sound.open();
  await transition(() => { paint({ landing }); dlg.showModal(); cue(); }, label);
  cue();
  if (auto && !carried) {
    const words = leaf.querySelector(".story")?.textContent.split(/\s+/).length ?? 20;
    autoTimer = setTimeout(() => { if (!carried) closeCard(); }, Math.min(4200, 1400 + words * 90));
  }
  return cardIdle();
}
export const openSquare = (n, opts) => open({ type: "square", n }, opts);
export const openEntry = (id, opts) => (entryOf(id) ? open({ type: "entry", id }, opts) : Promise.resolve());

export async function closeCard({ instant = false } = {}) {
  if (!dlg.open || closing) return;
  closing = true;
  clearTimeout(autoTimer);
  const label = view?.type === "square" ? labEls[view.n] : null;
  if (!instant) sound.close();
  if (instant || reduced) dlg.close();
  else if (sheetOn()) { await sheetOut(); dlg.close(); }
  else if (document.startViewTransition && visible(label)) {
    await document.startViewTransition(() => { dlg.close(); label.style.viewTransitionName = "folio"; }).finished.catch(() => {});
    label.style.viewTransitionName = "";
  } else {
    await leaf.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.97)" }], { duration: 160, easing: "ease-in" }).finished.catch(() => {});
    dlg.close();
  }
  sheetAfter();
  closing = false; view = null; cardLang = null; backTo = null; subject = null; expanded = false; carried = false;
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  waiters.splice(0).forEach(r => r());
  onChange.forEach(fn => fn());
}
onSheetClose(() => closeCard());

// Paging within an open card: a quick slide, so it reads as turning a leaf.
function turnPage(dir = 0) {
  if (reduced) return;
  leaf.querySelector(".leaf-main")?.animate([{ opacity: 0, transform: `translateX(${dir * 18}px)` }, { opacity: 1, transform: "none" }], { duration: 200, easing: "ease-out" });
}
function go(dir) {
  if (!view) return;
  if (view.type === "square") {
    const n = view.n + dir;
    if (n < 1 || n > TOP) return;
    view = { type: "square", n };
  } else {
    const id = ENTRY_IDS[ENTRY_IDS.indexOf(view.id) + dir];
    if (!id) return;
    view = { type: "entry", id };
  }
  paint(); turnPage(dir);
}

// Rolling from the card: from here on the card goes with the game instead of holding it up.
function roll() {
  const r = rollSrc(cardLang ?? lang);
  if (!r?.ready) return;
  carried = true;
  clearTimeout(autoTimer);
  waiters.splice(0).forEach(w => w());
  rollFn();
}

// A touch, a key or a hover means someone is reading: stop the computer's countdown.
const pin = () => clearTimeout(autoTimer);
["pointerdown", "pointermove", "keydown", "wheel"].forEach(ev => leaf.addEventListener(ev, pin, { passive: true }));

dlg.addEventListener("cancel", e => { e.preventDefault(); closeCard(); });
dlg.addEventListener("click", e => {
  if (e.target === dlg) return closeCard();
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "close") return closeCard();
  if (act === "roll") return roll();
  if (act === "pick") return pickFn(+e.target.closest("[data-v]").dataset.v);
  if (act === "more") return setExpanded(!expanded);
  if (act === "grip") {
    toggleDetent();
    const g = leaf.querySelector(".grip");
    return g?.setAttribute("aria-label", tIn(cardLang ?? lang, sheetDetent() === "full" ? "gripLess" : "gripMore"));
  }
  if (act === "prev" || act === "next") return go(act === "prev" ? -1 : 1);
  if (act === "back") { const n = backTo; backTo = null; view = { type: "square", n }; paint(); turnPage(-1); return; }
  const cl = e.target.closest("[data-cl]")?.dataset.cl;
  if (cl) { cardLang = cl; paint(); return; }
  const entry = e.target.closest("[data-entry]")?.dataset.entry;
  if (entry) {
    e.preventDefault();
    if (view?.type === "square") backTo = view.n;
    view = { type: "entry", id: entry }; paint(); turnPage(1);
    return;
  }
  const sq = e.target.closest("[data-sq]")?.dataset.sq;
  if (sq) { e.preventDefault(); backTo = null; view = { type: "square", n: +sq }; paint(); turnPage(1); }
});
dlg.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); go(e.key === "ArrowLeft" ? -1 : 1); }
});

// Redraws an open card when a preference or the language changes.
export function refreshCard() { if (dlg.open && view) paint(); }
