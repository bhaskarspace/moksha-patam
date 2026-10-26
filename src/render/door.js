// ---- The door and the wheel of time on 105 (REDESIGN.md Phase 14) ----
// A life the door refused stands before it closed, a small painted doorway behind the token, and round it the wheel of
// time: a spoke for each debt it was refused for. Each year sat there the spokes still owed turn a step; a debt met or
// paid stops its spoke, gold. When none is left the door opens; if the years run out first, it closes over the token.
// Time turns while the token stands still. Drawn over the cell, under the tokens, in the board's tokens only; it says
// nothing a screen reader needs, since the line under the board and the card say it in words. With reduced motion the
// same states show without the turning (styles.css).
import { GOAL, ROWS } from "../content.js";
import { G } from "../state.js";
import { $ } from "../ui.js";
import { debtKey } from "../engine/karma.js";
import { colRow } from "./board.js";

const el = $("door");
let drawn = null; // the key of what is drawn: whose wheel, for which refusal and how many spokes

// The wheel as it stands for player i at 105: { spokes: [{ step, gold }], open, shut }, or null when there is none.
export function wheelOf(state, i) {
  const p = state.players[i];
  if (!p || p.pos !== GOAL) return null;
  const open = state.winner === i, ref = p.refusals?.at(-1);
  if (!ref) return open ? { key: `${i}`, spokes: [], open, shut: false } : null;
  if (!p.door && !open && !p.dead) return null;
  const sits = (p.sittings ?? []).filter(s => s.at >= ref.at);
  const spokes = (ref.debts ?? []).map(d => {
    const key = debtKey(d), c = sits.findIndex(s => s.cleared && `${s.src}:${s.opt}:${s.planted}` === key);
    if (c >= 0) return { step: c, gold: true };
    // a debt a reckoning met while they sat stops where the years had turned it to then
    const rk = p.reckonings?.find(r => r.at >= ref.at && `${r.src}:${r.opt}:${r.planted}` === key);
    return rk ? { step: sits.filter(s => s.at < rk.at).length, gold: true } : { step: sits.length, gold: false };
  });
  return { key: `${i}:${ref.at}:${spokes.length}`, spokes, open, shut: !!p.dead };
}

// Draws the wheel of whoever stands at the door: the player whose turn it is, or else the first there.
export function drawDoor() {
  const state = G.state, ps = state?.players ?? [];
  const i = [state?.turn, ...ps.keys()].find(k => k != null && wheelOf(state, k));
  const w = i == null ? null : wheelOf(state, i);
  el.hidden = !w;
  if (!w) { drawn = null; return; }
  const { col, row } = colRow(GOAL);
  el.style.left = col * 10 + "%";
  el.style.top = ((ROWS - 1 - row) / ROWS) * 100 + "%";
  el.style.height = 100 / ROWS + "%";
  const n = w.spokes.length;
  if (drawn !== w.key) {
    drawn = w.key;
    el.innerHTML = `<svg viewBox="0 0 48 48">` +
      // the doorway fills the cell behind the token; the wheel is a little wider than the square, so it shows round it
      (n ? `<circle class="rim" cx="24" cy="24" r="32"/>` + w.spokes.map(() => `<g class="spoke"><line class="o" x1="24" y1="-14" x2="24" y2="-2"/><line x1="24" y1="-14" x2="24" y2="-2"/></g>`).join("") : "") +
      `<path class="arch" d="M7 46V20a17 17 0 0 1 34 0V46Z"/><path class="leaf l" d="M7 46V20a17 17 0 0 1 17-17V46Z"/>` +
      `<path class="leaf r" d="M41 46V20a17 17 0 0 0-17-17V46Z"/><path class="sill" d="M4 46h40"/></svg>`;
  }
  // a step of a quarter of the angle between two spokes: turning, never landing back where it was
  el.querySelectorAll(".spoke").forEach((g, k) => {
    const s = w.spokes[k];
    g.style.transform = `rotate(${((k + 0.5) * 360) / n + (s.step * 90) / n}deg)`;
    g.classList.toggle("gold", s.gold);
  });
  el.classList.toggle("open", w.open);
  el.classList.toggle("shut", w.shut);
}
