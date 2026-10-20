// ---- The card: a pothi folio for one square or one Codex entry ----
// It no longer holds the game up (REDESIGN.md Phase 11): the dice stay live while it is open, and the next roll takes
// it away. Only a situation waiting on a choice is modal, until the choice is made.
import { GOAL, TOP, ASHRAMAS, LADDERS, SNAKES, SQ, HEAVEN, READINGS, CODEX, ENTRY_IDS, REFS, entryOf, sourceOf, srcOfSquare, squareOf, snakeOn, bridgeOf } from "../content.js";
import { lang, tIn, numIn, srcIn, pick, fill, castFill, ageWordsIn } from "../i18n.js";
import { ageStep, stageOfYears, bhumikaOf, freshGunas, SANNYASA, yearsAlong } from "../engine/self.js";
import { castOf, castAlong, peopleOf, introIn } from "../engine/cast.js";
import { momentOf, destOf } from "../engine/qbn.js";
import { prefs, hasMet, meet, firstLife, firstOpened, openFirst, knowsWho, meetWho } from "../prefs.js";
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
let closing = false, waiters = [];
// The card opens with its story; the voices wait behind one tap. Opened further, it stays so while the card is open,
// through paging, the Codex and every roll from it, and is collapsed again when the card closes.
let expanded = false;
// Blocking: a situation waits on its card for the choice, so the card is modal and the turn waits on it. Every other
// card goes with the game (Phase 6 called this being rolled from): the turn never waits for it.
let blocking = false;
// The first life (REDESIGN.md Phase 11): the story behind a moment is one tap away, and opened, stays so for the rest
// of that life. The bridges told on this card are kept, so a redraw still tells them.
let storyOpen = false, bridged = new Set();
let rollSrc = () => null, rollFn = () => {}, pickFn = () => {};
const onChange = new Set(); // called after a card opens or closes, so the Codex panel can refresh

export const cardOpen = () => dlg.open;
export const cardCarried = () => dlg.open && !blocking;
export const cardBlocking = () => dlg.open && blocking;
export const cardExpanded = () => dlg.open && expanded;
export const cardIdle = () => (dlg.open && blocking ? new Promise(r => waiters.push(r)) : Promise.resolve());
export const onCardChange = fn => onChange.add(fn);
// The card's Roll: `src(l)` says who would roll and whether they can, as { label, ready, dot } or null; `fn` rolls.
// While the endgame's dice wait for a choice (REDESIGN.md Phase 9) it says { choose: [{ v, label }] } instead,
// and `pick(v)` makes the move, so a reader on a phone chooses on the card that covers the panel.
export const setCardRoll = (src, fn, pick) => { rollSrc = src; rollFn = fn; pickFn = pick; };
// Taking an option on a situation's card (REDESIGN.md Phase 10): `fn(id)`.
let decideFn = () => {};
export const setCardDecide = fn => { decideFn = fn; };
// What an option visibly does, in language l: where it takes the player from square n, and the years it costs. Its
// guna and aims are never said.
export function optionNote(l, n, o) {
  const to = destOf(n, o), where = to < n ? tIn(l, "optDown", { n: numIn(l, to) }) : to > n ? tIn(l, "optUp", { n: numIn(l, to) }) : tIn(l, "optHere", { n: numIn(l, n) });
  return o.cost ? `${where} · ${o.cost === 1 ? tIn(l, "optYear") : tIn(l, "optYears", { n: numIn(l, o.cost) })}` : where;
}

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
// Which of square n's moments its subject's landing there told (REDESIGN.md Phase 10): the other one, or a situation's
// chosen outcome, only on the square they are standing on, during the landing or after it. A square browsed tells
// its own. The years a choice cost are the square again in the life, told "stay", and are looked past.
function toldHere(n) {
  const p = subjectOf(), plan = G.plan;
  if (!p || p.pos !== n) return null;
  if (plan && G.state.players[plan.idx] === p) return plan.target === n ? plan.told?.[0] ?? null : plan.final === n ? plan.told?.at(-1) ?? null : null;
  if (p.told?.length !== p.life?.length) return null;
  let k = p.life.length - 1;
  while (k > 0 && p.told[k] === "stay") k--;
  return p.life[k] === n ? p.told[k] : null;
}
// The situation waiting on square n for its subject's choice, if one is.
const pendingOn = n => { const plan = G.plan; return plan?.situation && plan.target === n && subjectOf() === G.state.players[plan.idx] ? plan.situation : null; };
function person(l, n) {
  const p = subjectOf(), here = livedOn(n), a = here ? here.years : squareOf(n)?.age;
  const age = Number.isInteger(a) ? ageWordsIn(l, a, !!here?.still) : "";
  return p ? { name: pnameIn(p, l), gender: p.gender, age } : { name: "", gender: "m", age };
}
// A moment in language l as the card's subject lives it (REDESIGN.md Phase 10C): the cast by name once this life has
// met them, and on the square they are standing on, the name said at the end of the moment where the life meets
// someone. On their own square that is everyone met before this landing; on a square browsed, everyone met so far.
function momentIn(m, l, n, meeting = true) {
  const p = subjectOf(), text = s => fill(s, person(l, n));
  if (!p) return text(castFill(m[l] || m.en));
  const i = G.state.players.indexOf(p), here = livedOn(n), planning = G.plan && G.state.players[G.plan.idx] === p;
  // after a landing the life ends with it; during one it has not been added yet
  const along = yearsAlong(p.life || [], p.told || []).filter(e => e.via !== "stay"), upto = here && !planning ? along.length - 1 : along.length;
  const cc = castAlong(G.state, i, along.slice(0, Math.max(upto, 0))), last = cc.at(-1);
  const cast = last ? last.cast : castOf(G.state, i, 0), met = new Set(last ? [...last.before, ...(last.meets ? [last.about] : [])] : []);
  const intro = meeting && here && m.cast && !met.has(m.cast) && m.introduces !== false ? introIn(cast, m.cast, l) : "";
  return text(castFill(m[l] || m.en, peopleOf(cast, met, l, m.cast))) + (intro ? " " + intro : "");
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

// The mirror, and the first time it names someone, the bridge that says it is a story and who is in it (REDESIGN.md
// Phase 11). In the first life a mirror under a moment waits behind one line that reads as the start of the story:
// the bridge, or once that figure is known, just "The old story".
const storyHidden = m => !!m && firstLife() && firstOpened() === "moment" && !storyOpen;
function mirrorHtml(l, mirror, m, hideable = true) {
  const b = bridgeOf(mirror), tell = b && (!knowsWho(b.id) || bridged.has(b.id));
  const said = texts(l, mirror.en, mirror.hi, m ? "mirror" : "");
  if (hideable && storyHidden(m)) {
    const line = tell ? (l === "hi" ? b.hi : b.en) : tIn(l, "storyMore");
    return `<button type="button" class="story-more" data-act="story" aria-expanded="false" data-bridge="${tell ? esc(b.id) : ""}">${esc(line)}</button>`;
  }
  if (tell) bridged.add(b.id);
  return (tell ? texts(l, b.en, b.hi, "bridge") : "") + said;
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
  // a situation waiting on the choice shows its prompt, and the options under it; once chosen, its outcome
  const pending = pendingOn(n);
  const sq = squareOf(n), m = pending ? pending.prompt : momentOf(n, toldHere(n)).moment ?? sq.moment, mirror = m?.mirror || sq.mirror;
  const age = m && sq.age != null ? ageIn(l, livedOn(n)?.years ?? sq.age) : "";
  let body = `<h2 id="leafTitle">${esc(info.title)}</h2>`;
  const alt = info.alt.filter(Boolean).join(" · ");
  if (alt) body += `<p class="alt" lang="${other(l)}">${esc(alt)}</p>`;
  const moment = m ? texts(l, momentIn(m, "en", n, !pending), momentIn(m, "hi", n, !pending), n > 100 ? "moment remnant" : "moment") : "";
  // a snake tail one square below its remedy says so (REDESIGN.md Phase 4, item 3)
  const remedy = sq.remedy ? texts(l, fill(sq.remedy.en, person("en", n)), fill(sq.remedy.hi, person("hi", n)), "remedy") : "";
  // past the exit, the card says the way out is behind and below (REDESIGN.md Phase 7, item 3)
  const above = n > GOAL && HEAVEN[n] ? texts(l, ...["en", "hi"].map(x => tIn(x, "aboveExit", { n: numIn(x, GOAL), top: numIn(x, TOP) })), "remedy above") : "";
  // the options, each with what it visibly does; one a gate withholds is greyed, with why (§2.5), and cannot be taken
  const opts = pending && G.deciding?.sit === pending ? G.deciding.opts : null;
  const options = opts ? `<div class="options" role="group" aria-label="${esc(T("chooseLabel"))}">` + opts.map((o, i) =>
    `<button type="button" class="opt" data-act="opt" data-id="${esc(o.id)}"${o.open ? "" : ` aria-disabled="true" aria-describedby="why-${esc(o.id)}"`}>` +
    `<span class="opt-k" aria-hidden="true">${numIn(l, i + 1)}</span><span class="opt-l">${esc(o.label[l] || o.label.en)}</span>` +
    `<span class="opt-c">${esc(optionNote(l, n, o))}</span>` +
    (o.open ? "" : `<span class="opt-why" id="why-${esc(o.id)}">${esc(T("optWithheld"))} ${esc(o.why[l] || o.why.en)}</span>`) + `</button>`).join("") + `</div>` : "";
  body += `<div class="story">${moment}${options}${remedy}${pending ? "" : mirrorHtml(l, mirror, m)}${bi(l, r.line2, "line2")}${above}</div>`;
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
      `<div class="story">${sm ? texts(l, fill(sm.en, person("en", n)), fill(sm.hi, person("hi", n)), "moment") : ""}${mirrorHtml(l, sn.mirror, sm, false)}` +
      // the rebirth snake says when it takes someone, since most arrivals on its square are let be
      `${sn.rebirth ? texts(l, tIn("en", "fallWhen"), tIn("hi", "fallWhen"), "remedy fall") : ""}</div>`;
    if (sn.schools && deep("school")) {
      body += `<ul class="chips more-only">` + sn.schools.map(s => `<li>${entryLink(s.id, l)}${texts(l, s.en, s.hi)}</li>`).join("") + `</ul>`;
      metMore.push(...sn.schools.map(s => s.id));
    }
    body += srcLine(sn.src, l, met, { square: true }) + `</section>`;
  }
  // in the first life the voices wait until the story is open: one way on at a time
  if (!pending && storyHidden(m)) more = "";
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
  // a choice waiting on the card is read whole: on a phone the sheet rises, so no option is below the fold
  if (sheetOn() && leaf.querySelector(".options")) setDetent("full");
  meet([...out.met, ...(expanded ? metMore : [])].filter(Boolean));
  bridged.forEach(meetWho);
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

// Modal only while a situation waits on the card for its choice; otherwise the board and the dice stay live under it.
// On a wide screen a card that is not modal sits over the board, clear of the panel with the dice in it.
function show(block) {
  blocking = block;
  if (block) dlg.showModal(); else dlg.show();
  place();
}
function place() {
  const col = document.querySelector(".board-col")?.getBoundingClientRect();
  const over = dlg.open && !blocking && !sheetOn() && col && innerWidth > 820;
  dlg.style.left = over ? `${Math.max(12, col.left)}px` : "";
  dlg.style.right = over ? `${Math.max(12, innerWidth - col.right)}px` : "";
  dlg.style.width = over ? `${Math.min(780, Math.round(col.width))}px` : "";
}
addEventListener("resize", place);
// A situation's card is read from its title, not its ×: someone pressing Space to roll lands on a choice, and must not
// close it by the same key. The options take 1, 2 and 3.
function holdFocus() {
  const h = $("leafTitle");
  if (!h) return;
  h.tabIndex = -1;
  h.focus({ preventScroll: true });
}
// from modal to not, or back, without the card going anywhere
function setBlocking(block) {
  if (block === blocking || !dlg.open) return;
  dlg.close();
  show(block);
  if (block) holdFocus();
}
// The choice is made: the card stops holding the game up, and stays open to tell what was chosen.
export function releaseCard() {
  setBlocking(false);
  waiters.splice(0).forEach(r => r());
}

// focus: false opens the card without taking the focus, so a roll by key or button can be followed by another;
// a card the reader opened themselves focuses its ×.
async function open(next, { landing = false, from = null, who = null, focus = true } = {}) {
  const wasOpen = dlg.open, was = view;
  view = next;
  subject = who;
  const block = next.type === "square" && !!pendingOn(next.n);
  // already open: the leaf turns to the new square, forward or back
  if (wasOpen) {
    setBlocking(block);
    paint({ landing });
    turnPage(was?.type === "square" && next.type === "square" ? Math.sign(next.n - was.n) : 0);
    return cardIdle();
  }
  cardLang = null;
  // a card is read with the whole board behind it, and the morph starts from where the square really is
  pullBack(true);
  const label = from ?? (next.type === "square" ? labEls[next.n] : null);
  const before = document.activeElement;
  sound.open();
  await transition(() => {
    paint({ landing });
    // a card that is not to take the focus does not ask for it, rather than taking it and giving it back
    if (!focus && !block) leaf.querySelectorAll("[autofocus]").forEach(b => b.removeAttribute("autofocus"));
    show(block);
    if (block) holdFocus();
    else if (!focus) before && before !== document.body ? before.focus({ preventScroll: true }) : document.activeElement?.blur();
    cue();
  }, label);
  cue();
  return cardIdle();
}
export const openSquare = (n, opts) => open({ type: "square", n }, opts);
export const openEntry = (id, opts) => (entryOf(id) ? open({ type: "entry", id }, opts) : Promise.resolve());

export async function closeCard({ instant = false } = {}) {
  if (!dlg.open || closing) return;
  closing = true;
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
  closing = false; view = null; cardLang = null; backTo = null; subject = null; expanded = false; blocking = false;
  storyOpen = false; bridged = new Set();
  place();
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

// Rolling from the card: the same roll as the panel's, which takes the card away.
function roll() {
  const r = rollSrc(cardLang ?? lang);
  if (r?.ready) rollFn();
}

// Opening the story behind a moment, in the first life: it shows in place, and stays open on every card after this
// one until the life ends (prefs.js).
function openStory() {
  storyOpen = true;
  openFirst("mirror");
  const id = leaf.querySelector(".story-more")?.dataset.bridge;
  if (id) bridged.add(id);
  paint();
  leaf.querySelector(".story p.mirror, .story p.bridge")?.setAttribute("tabindex", "-1");
  leaf.querySelector(".story p.bridge, .story p.mirror")?.focus({ preventScroll: true });
}

dlg.addEventListener("cancel", e => { e.preventDefault(); closeCard(); });
// A card that is not modal has no backdrop and no cancel of its own: Escape closes it, and so does a click anywhere
// around it that is not itself a control (a square opens its own card, the Roll rolls, the log and the Codex open theirs).
document.addEventListener("keydown", e => { if (e.key === "Escape" && dlg.open && !blocking) { e.preventDefault(); closeCard(); } });
document.addEventListener("click", e => {
  if (!dlg.open || blocking || closing || leaf.contains(e.target)) return;
  if (!e.target.closest(".lab, button, a, input, select, label, summary, dialog")) closeCard();
});
dlg.addEventListener("click", e => {
  if (e.target === dlg) return closeCard();
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "close") return closeCard();
  if (act === "roll") return roll();
  if (act === "pick") return pickFn(+e.target.closest("[data-v]").dataset.v);
  if (act === "opt") { const b = e.target.closest("[data-id]"); if (b.getAttribute("aria-disabled") !== "true") decideFn(b.dataset.id); return; }
  if (act === "more") return setExpanded(!expanded);
  if (act === "story") return openStory();
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

// What a landing told, as { title, text } in language l, for the line under the board when the card does not open
// (REDESIGN.md Phase 11): the square's name and the moment, as the card would say it, without the mirror.
export function momentLine(n, who, l) {
  const keep = subject;
  subject = who;
  try {
    const m = momentOf(n, toldHere(n)).moment ?? squareOf(n)?.moment;
    return { title: squareInfo(n, l).title, text: m ? momentIn(m, l, n, false) : "" };
  } finally { subject = keep; }
}

// Redraws an open card when a preference or the language changes.
export function refreshCard() { if (dlg.open && view) paint(); }
