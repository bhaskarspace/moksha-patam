// ---- The card: a pothi folio for one square or one Codex entry ----
// It stays open until the reader closes it. A computer's landing card closes itself after a
// reading-length pause, unless the reader touches it, and then it waits like any other.
import { GOAL, LADDERS, SNAKES, SQ, HEAVEN, READINGS, CODEX, ENTRY_IDS, REFS, entryOf, sourceOf, srcOfSquare, squareOf, snakeOn } from "../content.js";
import { lang, tIn, numIn, srcIn, pick, fill } from "../i18n.js";
import { prefs, hasMet, meet } from "../prefs.js";
import { G, pnameIn } from "../state.js";
import { $, esc, reduced, art } from "../ui.js";
import { sound } from "../audio/engine.js";
import { ashramaIn, labEls } from "./board.js";

const dlg = $("folio"), leaf = $("leaf");
const other = l => (l === "hi" ? "en" : "hi");
const DEPTHS = ["story", "school", "scholar"];
const deep = d => DEPTHS.indexOf(prefs.depth) >= DEPTHS.indexOf(d);

let view = null;           // { type: "square", n } or { type: "entry", id }
let cardLang = null;       // the card's own language, when the reader flips it
let backTo = null;         // the square an entry was opened from
let subject = null;        // the player a square's moment is about; the player whose turn it is when unset
let autoTimer = null, closing = false, waiters = [];
const onChange = new Set(); // called after a card opens or closes, so the Codex panel can refresh

export const cardOpen = () => dlg.open;
export const cardIdle = () => (dlg.open ? new Promise(r => waiters.push(r)) : Promise.resolve());
export const onCardChange = fn => onChange.add(fn);

// ---- What a square's card says, in language l ----
function squareInfo(n, l) {
  const T = (k, v) => tIn(l, k, v), o = other(l), r = READINGS[n] || {};
  const sl = !HEAVEN[n] && (LADDERS[n] || SNAKES[n]), scholar = deep("scholar");
  const skt = (scholar && r.iast) || sl?.skt || "";
  if (sl) {
    const virtue = !!LADDERS[n];
    return { kind: virtue ? "virtue" : "vice", big: sl.ic, title: sl[l], alt: [sl[o], skt],
      eb: `${T(virtue ? "virtue" : "vice")} · ${ashramaIn(l, n)}`, ft: T(virtue ? "ladderTo" : "snakeTo", { n: sl.to }) };
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
  return { kind: "story", big: q.ic, title: q[l], alt: [q[o], scholar ? r.iast : ""], eb: `${T("story")} · ${ashramaIn(l, n)}`, ft: "" };
}

// The player a moment is about, as a name in language l and a gender for agreement.
function person(l) {
  const p = G.state?.players[subject ?? G.state.turn];
  return p ? { name: pnameIn(p, l), gender: p.gender } : { name: "", gender: "m" };
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

function frame(l, { kind, eb, big, sqn, age, body, foot, prev, next, prevLabel, nextLabel }) {
  const T = (k, v) => tIn(l, k, v);
  return `<div class="flourish" aria-hidden="true">${extras(kind)}</div>
    <header class="leaf-top">
      <span class="eb">${eb}</span>
      <div class="leaf-tools">
        <div class="lang-mini" role="group" aria-label="${T("cardLang")}">
          <button type="button" data-cl="en" aria-pressed="${l === "en"}">EN</button><button type="button" data-cl="hi" lang="hi" aria-pressed="${l === "hi"}">हिं</button>
        </div>
        <button type="button" class="x" data-act="close" aria-label="${T("close")}" autofocus>×</button>
      </div>
    </header>
    <div class="leaf-main">
      <div class="leaf-margin" aria-hidden="true"><span class="glyph">${big}</span>${sqn ? `<span class="sqn">${sqn}</span>` : ""}${age ? `<span class="age">${age}</span>` : ""}<span class="hole"></span></div>
      <div class="leaf-text" lang="${l}">${body}</div>
    </div>
    <footer class="leaf-foot">
      ${prev != null ? `<button type="button" class="nav" data-act="prev" aria-label="${prevLabel}">‹ <span>${prev}</span></button>` : "<span></span>"}
      <span class="ft">${foot}</span>
      ${next != null ? `<button type="button" class="nav" data-act="next" aria-label="${nextLabel}"><span>${next}</span> ›</button>` : "<span></span>"}
    </footer>`;
}

// A citation, linked to its Codex source. The source's one-line gloss shows the first time it is met,
// and always for scholars.
function srcLine(src, l, met) {
  if (!src) return "";
  const sid = sourceOf(src), s = sid && CODEX.sources[sid], firstTime = sid && !hasMet(sid);
  met.push(sid);
  return `<p class="srcline">` + (sid ? `<a class="src" href="#codex/${sid}" data-entry="${sid}">${esc(srcIn(l, src))}</a>` : `<span class="src">${esc(srcIn(l, src))}</span>`) +
    (s && (firstTime || deep("scholar")) ? `<span class="gloss">${esc(pick(s.gloss, l))}</span>` : "") + `</p>`;
}

function squareHtml(n, l) {
  const T = (k, v) => tIn(l, k, v), info = squareInfo(n, l), r = READINGS[n] || {};
  const src = srcOfSquare(n), met = [];
  // the moment, when there is one, is what is happening to the player; the mirror is the text that holds
  // it. With no moment the card is exactly the Phase 2 card: no age, and the Phase 2 lead as the mirror.
  const sq = squareOf(n), m = sq.moment, mirror = m?.mirror || sq.mirror;
  const age = m && sq.age != null ? ageIn(l, sq.age) : "";
  let body = `<h2 id="leafTitle">${esc(info.title)}</h2>`;
  const alt = info.alt.filter(Boolean).join(" · ");
  if (alt) body += `<p class="alt" lang="${other(l)}">${esc(alt)}</p>`;
  const moment = m ? texts(l, fill(m.en, person("en")), fill(m.hi, person("hi")), n > 100 ? "moment remnant" : "moment") : "";
  // a snake tail one square below its remedy says so (REDESIGN.md Phase 4, item 3)
  const remedy = sq.remedy ? texts(l, fill(sq.remedy.en, person("en")), fill(sq.remedy.hi, person("hi")), "remedy") : "";
  body += `<div class="story">${moment}${remedy}${texts(l, mirror.en, mirror.hi, m ? "mirror" : "")}${bi(l, r.line2, "line2")}</div>`;
  // the views panel is the point of square 110, so it shows at every depth: six definitions side by side
  const viewList = (vs, cls) => `<ul class="${cls}">` + vs.map(v => `<li>${entryLink(v.id, l)}${texts(l, v.en, v.hi)}</li>`).join("") + `</ul>`;
  if (r.views && (n === GOAL || deep("school"))) {
    body += `<h3 class="sub">${T(n === GOAL ? "viewsGoal" : "views")}</h3>` + viewList(r.views, n === GOAL ? "views side" : "views");
    met.push(...r.views.map(v => v.id));
  }
  if (r.beyond && (n === GOAL || deep("school"))) {
    body += `<h3 class="sub">${T("viewsBeyond")}</h3>` + viewList(r.beyond, "views");
    met.push(...r.beyond.map(v => v.id));
  }
  if (r.schools && deep("school")) {
    body += `<h3 class="sub">${T("argued")}</h3><ul class="chips">` +
      r.schools.map(s => `<li>${entryLink(s.id, l)}${texts(l, s.en, s.hi)}</li>`).join("") + `</ul>`;
    met.push(...r.schools.map(s => s.id));
  }
  // a square with no voices shows its scholar note at school depth rather than a bare lead
  if (deep("scholar") || (deep("school") && !r.schools?.length && !r.views?.length)) body += bi(l, r.scholar, "note");
  if (deep("scholar")) {
    if (r.figures?.length) {
      body += `<p class="people"><span>${T("people")}:</span> ${r.figures.map(id => entryLink(id, l, "plink")).join(" · ")}</p>`;
      met.push(...r.figures);
    }
  }
  body += srcLine(src, l, met);
  // a snake that starts on a god's square (109, merit spent) follows the god, in the snakes' own voice
  const sn = snakeOn(n);
  if (sn) {
    const sm = sn.moment;
    body += `<section class="snake-on"><h3 class="sub">${art(`sn-${n}`, sn.ic, "spr snake-glyph")} ${esc(T("meritSnake"))}</h3>` +
      `<h2 class="snake-title">${esc(sn[l])}</h2><p class="alt" lang="${other(l)}">${esc([sn[other(l)], sn.skt].join(" · "))}</p>` +
      `<div class="story">${sm ? texts(l, fill(sm.en, person("en")), fill(sm.hi, person("hi")), "moment") : ""}${texts(l, sn.mirror.en, sn.mirror.hi, sm ? "mirror" : "")}</div>`;
    if (sn.schools && deep("school")) {
      body += `<ul class="chips">` + sn.schools.map(s => `<li>${entryLink(s.id, l)}${texts(l, s.en, s.hi)}</li>`).join("") + `</ul>`;
      met.push(...sn.schools.map(s => s.id));
    }
    body += srcLine(sn.src, l, met) + `</section>`;
  }
  return {
    kind: info.kind, met,
    html: frame(l, { kind: info.kind, eb: info.eb + (age ? ` · ${age}` : ""), big: n === GOAL ? info.big : art(`sq-${n}`, info.big), sqn: numIn(l, n), age, body, foot: info.ft,
      prev: n > 1 ? numIn(l, n - 1) : null, next: n < GOAL ? numIn(l, n + 1) : null, prevLabel: T("prevSq"), nextLabel: T("nextSq") }),
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
// leaf is drawn, so "new" marks show on the card that introduced them.
function paint({ landing = false } = {}) {
  const l = cardLang ?? lang;
  const { kind, html, met } = view.type === "square" ? squareHtml(view.n, l) : entryHtml(view.id, l);
  leaf.className = "leaf " + kind + (landing ? " landed" : "");
  leaf.innerHTML = html;
  meet(met.filter(Boolean));
  // the address bar names what is open, so a card can be linked
  history.replaceState(null, "", location.pathname + location.search + (view.type === "square" ? `#sq/${view.n}` : `#codex/${view.id}`));
  onChange.forEach(fn => fn());
}

// ---- Opening and closing ----
const visible = el => { const r = el?.getBoundingClientRect(); return r && r.width > 0 && r.bottom > 0 && r.top < innerHeight; };

// Morphs the source square into the card with a view transition, or zooms where that is missing.
async function transition(update, label) {
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
  const wasOpen = dlg.open;
  view = next;
  subject = who;
  if (wasOpen) { paint({ landing }); turnPage(); return cardIdle(); }
  cardLang = null;
  const label = from ?? (next.type === "square" ? labEls[next.n] : null);
  sound.open();
  await transition(() => { paint({ landing }); dlg.showModal(); }, label);
  if (auto) {
    const words = leaf.querySelector(".story")?.textContent.split(/\s+/).length ?? 20;
    autoTimer = setTimeout(closeCard, Math.min(4200, 1400 + words * 90));
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
  else if (document.startViewTransition && visible(label)) {
    await document.startViewTransition(() => { dlg.close(); label.style.viewTransitionName = "folio"; }).finished.catch(() => {});
    label.style.viewTransitionName = "";
  } else {
    await leaf.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.97)" }], { duration: 160, easing: "ease-in" }).finished.catch(() => {});
    dlg.close();
  }
  closing = false; view = null; cardLang = null; backTo = null; subject = null;
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  waiters.splice(0).forEach(r => r());
  onChange.forEach(fn => fn());
}

// Paging within an open card: a quick slide, so it reads as turning a leaf.
function turnPage(dir = 0) {
  if (reduced) return;
  leaf.querySelector(".leaf-main")?.animate([{ opacity: 0, transform: `translateX(${dir * 18}px)` }, { opacity: 1, transform: "none" }], { duration: 200, easing: "ease-out" });
}
function go(dir) {
  if (!view) return;
  if (view.type === "square") {
    const n = view.n + dir;
    if (n < 1 || n > GOAL) return;
    view = { type: "square", n };
  } else {
    const id = ENTRY_IDS[ENTRY_IDS.indexOf(view.id) + dir];
    if (!id) return;
    view = { type: "entry", id };
  }
  paint(); turnPage(dir);
}

// A touch, a key or a hover means someone is reading: stop the computer's countdown.
const pin = () => clearTimeout(autoTimer);
["pointerdown", "pointermove", "keydown", "wheel"].forEach(ev => leaf.addEventListener(ev, pin, { passive: true }));

dlg.addEventListener("cancel", e => { e.preventDefault(); closeCard(); });
dlg.addEventListener("click", e => {
  if (e.target === dlg) return closeCard();
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "close") return closeCard();
  if (act === "prev" || act === "next") return go(act === "prev" ? -1 : 1);
  if (act === "back") { const n = backTo; backTo = null; view = { type: "square", n }; paint(); turnPage(-1); return; }
  const cl = e.target.closest("[data-cl]")?.dataset.cl;
  if (cl) { cardLang = cl; paint(); return leaf.querySelector(`[data-cl="${cl}"]`)?.focus(); }
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
