// ---- The lives, side by side (REDESIGN.md Phase 19) ----
// At the end of a game of two or more seats, played together or as a race: every life's path drawn on one board in its
// player's colour; who each soul became over the years, as shapes (the guṇas, never a number or an axis); how each life
// ended and how many lives each soul took, in words and beads; what each life did at the squares two lives chose on; the
// lives that crossed; and every life's book beside the others, since the cast is drawn per life. It can be saved as an
// image (a canvas drawn here) and copied as text. The game is played again from its inputs to draw who each became
// (src/engine/compare.js replay); a game that cannot be (begun before Phase 19, or set by hand) is drawn without it.
import { COLS, ROWS, TOP, GOAL, BOARD, squareOf, HEAVEN, SNAKES, LADDERS } from "../content.js";
import { lang, tIn, wordsIn, fill } from "../i18n.js";
import { G } from "../state.js";
import { $, P_HEX, esc } from "../ui.js";
import { colRow, groundOf } from "./ground.js";
import { lifeOf } from "../engine/account.js";
import { optionOf } from "../engine/qbn.js";
import { replay, inputsOf, replayable, sameGame, compareOf } from "../engine/compare.js";

const dlg = $("compareDlg"), leaf = $("cmpLeaf");
let model = null, tab = 0, note = "";

// the square's name in language l, as the board writes it
function sqName(n, l) {
  if (n === GOAL) return tIn(l, "moksha");
  const h = HEAVEN[n] ?? SNAKES[n] ?? LADDERS[n] ?? squareOf(n);
  return h ? h[l] || h.en : "";
}
const nameIn = (x, l) => x[l] || x.en;
// a life's name as the screen says it: an animal's is the creature's
const lifeName = (life, l) => (life.animal ? fill(tIn(l, "animalTitle", { name: nameIn(life.name, l), animal: tIn(l, "a_" + life.animal) }), { gender: life.gender }) : nameIn(life.name, l));
const livesWord = (n, l) => (n === 1 ? tIn(l, "cmpLivesOne") : tIn(l, "cmpLives", { n: wordsIn(l, n) }));
const humanLives = s => s.lives.filter(x => !x.animal).length;

// The comparison of the game in play, built once when the screen opens
function build(state) {
  let traces = null;
  if (replayable(state)) {
    const r = replay(inputsOf(state));
    if (r.ok && sameGame(state, r.state)) traces = r.traces;
  }
  return { ...compareOf(state, traces), replayed: !!traces };
}

export function openCompare(state = G.state) {
  model = build(state);
  tab = 0; note = "";
  if (!dlg.open) dlg.showModal();
  paint();
  leaf.querySelector(".cmp-close")?.focus();
}
export const closeCompare = () => { if (dlg.open) dlg.close(); };
export const compareOpen = () => dlg.open;
export const refreshCompare = () => { if (dlg.open && model) paint(); };
export const compareModel = () => model;

// ---- drawing ----
const pal = k => BOARD.palette[k];
// A life's squares as the token went: a throw walks square by square along the rows, a snake or a ladder is one stroke
function routed(path) {
  const out = [];
  const walk = (a, b) => { for (let n = a + 1; n <= b; n++) out.push(n); };
  for (const n of path) {
    if (n < 1 || n > TOP) continue;
    const a = out.at(-1);
    if (a == null || n === a) { if (a == null) out.push(n); continue; }
    // the head or foot this throw reached, if the square it ended on is where that one leads
    const via = [...Array(12)].map((_, k) => a + 1 + k).find(x => (LADDERS[x]?.to ?? SNAKES[x]?.to) === n);
    if (via) { walk(a, via); out.push(n); } else if (n > a && n - a <= 12) walk(a, n); else out.push(n);
  }
  return out;
}
// The board at width W, with every life's path on it; returns its height
function drawBoard(c, W, x0 = 0, y0 = 0) {
  const cell = W / COLS, H = cell * ROWS;
  c.save();
  c.translate(x0, y0);
  for (let n = 1; n <= TOP; n++) {
    const { col, row } = colRow(n);
    c.fillStyle = groundOf(n)[0];
    c.fillRect(col * cell, (ROWS - 1 - row) * cell, cell + 0.5, cell + 0.5);
  }
  // the painted snakes and ladders, as the board has them now
  const art = $("art");
  if (art?.width) c.drawImage(art, 0, 0, W, H);
  c.fillStyle = "rgba(245, 233, 201, 0.35)";
  c.fillRect(0, 0, W, H);
  const at = (n, off) => { const { col, row } = colRow(n); return [(col + 0.5) * cell + off, (ROWS - 1 - row + 0.5) * cell + off]; };
  model.souls.forEach((s, si) => {
    const off = (si - (model.souls.length - 1) / 2) * cell * 0.09;
    s.lives.forEach((life, k) => {
      const pts = routed(life.path).map(n => at(n, off));
      if (pts.length < 2) return;
      const last = k === s.lives.length - 1;
      c.lineJoin = c.lineCap = "round";
      for (const [w, col, a] of [[0.11, pal("black"), last ? 0.35 : 0.15], [0.065, P_HEX[s.color], last ? 0.95 : 0.4]]) {
        c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = cell * w;
        c.beginPath(); pts.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      }
      c.globalAlpha = 1;
      // where the life ended: let go is the gold ring, any other end a dot in the life's colour
      const [x, y] = pts.at(-1), r = cell * (last ? 0.17 : 0.11);
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = P_HEX[s.color]; c.fill();
      c.lineWidth = cell * 0.04; c.strokeStyle = life.end === "liberated" || life.end === "svarga" ? pal("gold-hi") : pal("black"); c.stroke();
    });
  });
  c.restore();
  return H;
}
// Who soul s became: its lives' guṇas in turn, as three bands of a ribbon (sattva above, rajas, tamas below), W by h
function drawRibbon(c, s, W, h, x0 = 0, y0 = 0) {
  const pts = s.lives.flatMap((life, k) => (life.trace ?? []).map(x => ({ g: x.g, k })));
  if (!pts.length) return false;
  const cols = [pal("yellow"), pal("vermilion"), pal("indigo")], step = W / pts.length;
  pts.forEach(({ g }, j) => {
    const sum = g[0] + g[1] + g[2] || 1;
    let y = y0;
    for (let b = 0; b < 3; b++) {
      const bh = (g[b] / sum) * h;
      c.fillStyle = cols[b];
      c.fillRect(x0 + j * step, y, step + 0.6, bh + 0.6);
      y += bh;
    }
  });
  // a thin break where one life gave way to the next
  c.fillStyle = pal("cream");
  pts.forEach((x, j) => { if (j && x.k !== pts[j - 1].k) c.fillRect(x0 + j * step - 1, y0, 2, h); });
  return true;
}
// a canvas sized for the device, drawn at CSS width w
function sized(cv, w, h) {
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = w + "px"; cv.style.height = h + "px";
  const c = cv.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return c;
}

// ---- the leaf ----
const beads = s => s.lives.map(l => `<span class="bead${l.animal ? " animal" : ""}${l.end === "liberated" || l.end === "svarga" ? " free" : ""}" aria-hidden="true"></span>`).join("");
function sameHtml(l) {
  if (!model.same.length) return `<p class="cmp-none">${esc(tIn(l, "cmpSameNone"))}</p>`;
  return `<dl class="cmp-same">` + model.same.map(({ sq, by }) => `<dt>${esc(sqName(sq, l))}</dt>` + by.map(b => {
    const lab = id => { const o = optionOf(sq, id); return o ? o.label[l] || o.label.en : id; };
    const s = model.souls[b.seat], k = b.chose !== b.took ? "cmpSameRebel" : "cmpSameRow";
    return `<dd><span class="dot" style="background:${P_HEX[s.color]}"></span>${esc(tIn(l, k, { name: nameIn(b.name, l), chose: lab(b.chose), took: lab(b.took) }))}</dd>`;
  }).join("")).join("") + `</dl>`;
}
function metHtml(l) {
  if (!model.met.length) return `<p class="cmp-none">${esc(tIn(l, "cmpMetNone"))}</p>`;
  return `<ul class="cmp-met">` + model.met.map(m => `<li><span class="dot" style="background:${P_HEX[model.souls[m.a.seat].color]}"></span><span class="dot" style="background:${P_HEX[model.souls[m.b.seat].color]}"></span>${esc(tIn(l, "cmpMetLine", { a: nameIn(m.a.name, l), b: nameIn(m.b.name, l), sq: sqName(m.sq, l) }))}</li>`).join("") + `</ul>`;
}
function bookHtml(s, l) {
  return s.lives.map(life => {
    const b = lifeOf(life.st, s.seat, l);
    return `<article class="cmp-life"><h4>${esc(b.title)}</h4>${b.open ? `<p>${esc(b.open)}</p>` : ""}${b.paras.map(p => `<h5>${esc(p.head)}</h5><p>${esc(p.text)}</p>`).join("")}<p class="cmp-end">${esc([b.end, b.curse].filter(Boolean).join(" "))}</p>${b.fates?.length ? `<p class="cmp-fates">${esc(b.fates.join(" "))}</p>` : ""}</article>`;
  }).join("");
}
function paint() {
  const l = lang, souls = model.souls, traced = souls.some(s => s.lives.some(x => x.trace));
  leaf.innerHTML = `
    <header class="leaf-top"><span class="eb">${esc(tIn(l, "title"))}</span>
      <button type="button" class="x cmp-close" aria-label="${esc(tIn(l, "close"))}">×</button></header>
    <div class="cmp-body">
      <h2 id="cmpTitle">${esc(tIn(l, "togetherTitle"))}</h2>
      <ul class="cmp-souls">${souls.map(s => {
        const last = s.lives.at(-1);
        return `<li><span class="dot" style="background:${P_HEX[s.color]}"></span><b>${esc(tIn(l, "cmpSoul", { name: lifeName(last, l) }))}</b> <span class="beads" role="img" aria-label="${esc(livesWord(humanLives(s), l))}">${beads(s)}</span>
          <span class="cmp-ends">${s.lives.map(x => `${esc(lifeName(x, l))}: ${esc(tIn(l, "cmpEnd_" + x.end))}`).join(" · ")}</span></li>`;
      }).join("")}</ul>
      <h3>${esc(tIn(l, "cmpBoard"))}</h3>
      <canvas class="cmp-board" role="img" aria-label="${esc(tIn(l, "cmpBoardAlt"))}"></canvas>
      <h3>${esc(tIn(l, "cmpGunas"))}</h3>
      ${traced ? `<p class="cmp-note">${esc(tIn(l, "cmpGunasNote"))}</p>` + souls.map(s => `<div class="cmp-gunas"><span class="dot" style="background:${P_HEX[s.color]}"></span><canvas data-seat="${s.seat}" aria-hidden="true"></canvas></div>`).join("") : `<p class="cmp-note">${esc(tIn(l, "cmpNoTrace"))}</p>`}
      <h3>${esc(tIn(l, "cmpSame"))}</h3>${sameHtml(l)}
      <h3>${esc(tIn(l, "cmpMet"))}</h3>${metHtml(l)}
      <h3>${esc(tIn(l, "cmpBooks"))}</h3>
      <div class="cmp-tabs" role="tablist">${souls.map((s, i) => `<button type="button" role="tab" id="cmpTab-${i}" aria-controls="cmpBook-${i}" aria-selected="${i === tab}" tabindex="${i === tab ? 0 : -1}" data-tab="${i}"><span class="dot" style="background:${P_HEX[s.color]}"></span>${esc(lifeName(s.lives.at(-1), l))}</button>`).join("")}</div>
      <div class="cmp-books" style="--n:${souls.length}">${souls.map((s, i) => `<section class="cmp-book${i === tab ? " on" : ""}" id="cmpBook-${i}" role="tabpanel" aria-labelledby="cmpTab-${i}">${bookHtml(s, l)}</section>`).join("")}</div>
      <p class="cmp-acts"><button type="button" data-act="save">${esc(tIn(l, "cmpSave"))}</button> <button type="button" class="ghost" data-act="copy">${esc(tIn(l, "cmpCopy"))}</button> <span class="hint" aria-live="polite">${esc(note)}</span></p>
    </div>`;
  drawAll();
}
function drawAll() {
  const cv = leaf.querySelector(".cmp-board");
  if (!cv) return;
  // the body's width inside its padding, the board no wider than a phone held sideways reads it
  const b = cv.parentElement, cs = getComputedStyle(b), inner = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const w = Math.min(inner || 600, 720);
  drawBoard(sized(cv, w, (w / COLS) * ROWS), w);
  for (const r of leaf.querySelectorAll(".cmp-gunas canvas")) {
    const rw = r.parentElement.clientWidth - 24 || 560, s = model.souls[+r.dataset.seat];
    drawRibbon(sized(r, rw, 30), s, rw, 30);
  }
}
addEventListener("resize", () => { if (dlg.open && model) drawAll(); });

// ---- the image and the text ----
// The comparison as one picture, 1080 wide: the title, the board with every path, and each soul with its lives and who it
// became. The page's own fonts, so Hindi is drawn as it is read.
export function imageOf(l = lang) {
  const W = 1080, pad = 48, inner = W - 2 * pad, cell = inner / COLS, bh = cell * ROWS, rowH = 120;
  const H = pad + 70 + bh + 30 + model.souls.length * rowH + 70;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = Math.ceil(H);
  const c = cv.getContext("2d"), font = getComputedStyle(document.body).fontFamily;
  const serif = getComputedStyle(leaf).fontFamily || font;
  c.fillStyle = pal("cream"); c.fillRect(0, 0, W, H);
  c.fillStyle = pal("black"); c.textBaseline = "alphabetic";
  c.font = `400 44px ${serif}`;
  c.fillText(tIn(l, "togetherTitle"), pad, pad + 40);
  drawBoard(c, inner, pad, pad + 70);
  let y = pad + 70 + bh + 30;
  for (const s of model.souls) {
    c.fillStyle = P_HEX[s.color];
    c.beginPath(); c.arc(pad + 12, y + 18, 12, 0, Math.PI * 2); c.fill();
    c.fillStyle = pal("black"); c.font = `600 28px ${font}`;
    c.fillText(tIn(l, "cmpSoul", { name: lifeName(s.lives.at(-1), l) }), pad + 36, y + 28);
    // a bead a life, filled gold for the life let go
    s.lives.forEach((x, k) => {
      c.beginPath(); c.arc(W - pad - 12 - (s.lives.length - 1 - k) * 26, y + 18, 9, 0, Math.PI * 2);
      c.fillStyle = x.end === "liberated" || x.end === "svarga" ? pal("gold") : x.animal ? pal("malachite") : P_HEX[s.color]; c.fill();
    });
    c.font = `400 20px ${font}`; c.fillStyle = pal("lac");
    const ends = s.lives.map(x => `${lifeName(x, l)}: ${tIn(l, "cmpEnd_" + x.end)}`).join(" · ");
    c.fillText(ends.length > 90 ? ends.slice(0, 88) + "…" : ends, pad + 36, y + 56);
    drawRibbon(c, s, inner - 36, 26, pad + 36, y + 72);
    y += rowH;
  }
  c.fillStyle = pal("lac"); c.font = `italic 400 20px ${serif}`;
  c.fillText(tIn(l, "cmpFoot"), pad, H - pad + 10);
  return cv;
}
// The comparison as text: each soul and how its lives ended, the squares two lives chose on, the lives that crossed, and
// every book, in the page's language
export function textOf(l = lang) {
  const out = [tIn(l, "togetherTitle"), ""];
  for (const s of model.souls) out.push(`${tIn(l, "cmpSoul", { name: lifeName(s.lives.at(-1), l) })} (${livesWord(humanLives(s), l)}): ` + s.lives.map(x => `${lifeName(x, l)}, ${tIn(l, "cmpEnd_" + x.end)}`).join("; "));
  out.push("", tIn(l, "cmpSame"));
  if (!model.same.length) out.push(tIn(l, "cmpSameNone"));
  for (const { sq, by } of model.same) {
    const lab = id => optionOf(sq, id)?.label[l] ?? id;
    out.push(`${sqName(sq, l)}: ` + by.map(b => tIn(l, b.chose !== b.took ? "cmpSameRebel" : "cmpSameRow", { name: nameIn(b.name, l), chose: lab(b.chose), took: lab(b.took) })).join("; "));
  }
  out.push("", tIn(l, "cmpMet"));
  out.push(...(model.met.length ? model.met.map(m => tIn(l, "cmpMetLine", { a: nameIn(m.a.name, l), b: nameIn(m.b.name, l), sq: sqName(m.sq, l) })) : [tIn(l, "cmpMetNone")]));
  for (const s of model.souls) for (const life of s.lives) {
    const b = lifeOf(life.st, s.seat, l);
    out.push("", "", [b.title, b.open, ...b.paras.map(p => `${p.head}\n${p.text}`), [b.end, b.curse].filter(Boolean).join(" "), (b.fates ?? []).join(" ")].filter(Boolean).join("\n\n"));
  }
  return out.join("\n") + "\n";
}
async function save() {
  const cv = imageOf();
  const blob = await new Promise(r => cv.toBlob(r, "image/png"));
  if (!blob) return;
  const file = new File([blob], "moksha-patam-lives.png", { type: "image/png" });
  // on a phone, the picture goes to the share sheet; elsewhere it is downloaded
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: tIn(lang, "togetherTitle") }); note = tIn(lang, "cmpSaved"); paintNote(); return; } catch { return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  note = tIn(lang, "cmpSaved"); paintNote();
}
async function copy() {
  try { await navigator.clipboard.writeText(textOf()); note = tIn(lang, "cmpCopied"); } catch { note = ""; }
  paintNote();
}
const paintNote = () => { const h = leaf.querySelector(".cmp-acts .hint"); if (h) h.textContent = note; };

leaf.addEventListener("click", e => {
  if (e.target.closest(".cmp-close")) return closeCompare();
  const t = e.target.closest("[data-tab]");
  if (t) return showTab(+t.dataset.tab, false);
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "save") save();
  if (act === "copy") copy();
});
// the books' tabs (a phone shows one book at a time): the arrow keys, Home and End move between them
function showTab(i, focus = true) {
  tab = (i + model.souls.length) % model.souls.length;
  leaf.querySelectorAll(".cmp-tabs [role=tab]").forEach((b, k) => { b.setAttribute("aria-selected", String(k === tab)); b.tabIndex = k === tab ? 0 : -1; });
  leaf.querySelectorAll(".cmp-book").forEach((b, k) => b.classList.toggle("on", k === tab));
  if (focus) leaf.querySelector(`#cmpTab-${tab}`)?.focus();
}
leaf.addEventListener("keydown", e => {
  if (!e.target.closest(".cmp-tabs")) return;
  const k = { ArrowRight: tab + 1, ArrowLeft: tab - 1, Home: 0, End: model.souls.length - 1 }[e.key];
  if (k == null) return;
  e.preventDefault();
  showTab(k);
});
