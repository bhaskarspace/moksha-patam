// ---- The camera: a gentle zoom that follows a move, and the whole board whenever someone can act ----
// A transform on #cam, eased by a CSS transition so the compositor runs it. It only ever moves during a move:
// it is back at the whole board before any card opens, when a turn ends, and the moment anyone touches the
// board, so reading is never done zoomed. Off under reduced motion and on a low-quality device.
import { ROWS } from "../content.js";
import { $, quality } from "../ui.js";
import { colRow } from "./ground.js";

const cam = $("cam"), board = $("board"), MAX = 1.3, motion = matchMedia("(prefers-reduced-motion: reduce)");
let scale = 1, held = false;
export const cameraOn = () => !motion.matches && quality !== "low";

// square n's centre as a fraction of the board
const at = n => { const { col, row } = colRow(Math.max(1, n)); return { x: (col + 0.5) / 10, y: (ROWS - 1 - row + 0.5) / ROWS }; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function set(s, cx = 0.5, cy = 0.5, instant = false) {
  scale = s;
  // what is drawn outside the camera (the door on 105) steps aside while it is zoomed
  board.toggleAttribute("data-zoomed", s !== 1);
  // keep the point in the middle without showing past the board's edge
  const tx = clamp(50 - s * cx * 100, 100 * (1 - s), 0), ty = clamp(50 - s * cy * 100, 100 * (1 - s), 0);
  const t = s === 1 ? "" : `translate(${tx}%, ${ty}%) scale(${s})`;
  if (!instant) return void (cam.style.transform = t);
  cam.style.transition = "none";
  cam.style.transform = t;
  void cam.offsetWidth;
  cam.style.transition = "";
}

// Frame squares a and b together, as close as the cap allows.
export function frame(a, b = a) {
  if (!cameraOn() || held) return;
  const p = at(a), q = at(b), w = Math.abs(p.x - q.x) + 0.3, h = Math.abs(p.y - q.y) + 0.3;
  set(clamp(Math.min(1 / w, 1 / h), 1, MAX), (p.x + q.x) / 2, (p.y + q.y) / 2);
}
// Back to the whole board: eased at an ashrama change or a turn's end, at once before a card opens.
export function pullBack(instant = false) {
  if (scale !== 1 || instant) set(1, 0.5, 0.5, instant);
}
// Someone touched the board: show all of it and stay out of the way until the next turn.
export function hold() { held = true; pullBack(); }
export function release() { held = false; }
export const cameraScale = () => scale;

motion.addEventListener?.("change", () => pullBack(true));
