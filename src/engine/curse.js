// ---- The curse (REDESIGN.md Phase 14, docs/NARRATIVE.md §13.6) ----
// A fuse with a sentence. Early in the life someone ordinary says one line the player cannot yet understand: an old
// woman at the well, the barber. Each curse is tied to a family of late squares (content/curses.json). If the life
// lands on one after the line was said, the account closes it there ("the woman at the well had said so"); if it never
// does, the account closes it at the end, the other way. One is drawn per life, off a sequence of its own, so the dice
// never change; with the curses taken away (CURSES.list null) nothing is drawn and every account is as it was.
// Pure, so the page, tools/sim.mjs and the tests run it alike.
import { CURSES } from "../content.js";
import { makeRng, next } from "../rng.js";

// The curse drawn for player idx in this game, or null.
export function curseOf(state, idx) {
  const list = CURSES.list;
  if (!list?.length) return null;
  const forced = state.players[idx]?.curseId;
  if (forced) return list.find(c => c.id === forced) ?? null;
  const r = makeRng((state.rng.seed ^ 0x2c1b3c6d ^ Math.imul(idx + 1, 0x297a2d39)) >>> 0);
  return list[Math.floor(next(r) * list.length)];
}
// Whether a landing at these years is the one it is said at: the first old enough for it.
export const spokenAt = (c, years) => years >= c.from;
// The curse a finished or unfinished life carries, as { c, said, closedAt }: said is where in the life it was spoken
// (p.curse.i), closedAt where it came true, the first square of its family landed on after it, or null.
export function curseIn(p) {
  const c = p.curse && CURSES.list?.find(x => x.id === p.curse.id);
  if (!c) return null;
  const life = p.life || [], told = p.told || [];
  // a square lived again as a stay or sent back to by a reckoning is not landed on
  const k = life.findIndex((n, j) => j > p.curse.i && c.family.includes(n) && told[j] !== "stay" && told[j] !== "reckon");
  return { c, said: p.curse.i, age: p.curse.age, closedAt: k < 0 ? null : k };
}
