// ---- The ageing board (REDESIGN.md §4 Phase 5) ----
// Squares behind the living fade toward sepia and squares ahead of them stay dim, keyed to the authored
// age on each square rather than to board position, and since Phase 8 to the years each player has actually
// lived, so a snake leaves the board as old as the player. Only the paint ages: labels, cards and clicks never do.
// Pure, so it runs in node and the same positions always give the same board.
import { GOAL, ASHRAMAS, squareOf } from "../content.js";
import { stageOfYears } from "../engine/self.js";

const EARTH = 100;
// years for a square to fade fully once everyone has lived past it, and for the dimness ahead to deepen
export const FADE_YEARS = 30, DIM_YEARS = 30;

// The authored age of square n, or null for the divine row, which has no age.
export const ageOf = n => (n >= 1 && n <= EARTH ? squareOf(n)?.age ?? null : null);
// How old a player at pos is: newborn in the tray, the oldest earthly age once in the divine row.
const ageAt = pos => (pos <= 0 ? 0 : pos > EARTH ? ageOf(EARTH) : ageOf(pos));
export const stageAt = pos => (pos === GOAL ? ASHRAMAS.length : ASHRAMAS.findIndex(([max]) => Math.max(pos, 1) <= max));
// How old a player is: the years lived, and never younger than the square they stand on. In play the two agree
// or the years are ahead (after a snake); only a token moved by hand (mp.jump) has a square older than its life.
// Above the world, at least the oldest earthly age.
export const yearsOf = p => Math.max(p.years ?? 0, ageAt(p.pos));
// A player's stage of life, by years: what the drone and the pixel art follow (REDESIGN.md Phase 8).
export const stageOf = p => (p.pos === GOAL ? ASHRAMAS.length : p.pos > EARTH ? stageAt(p.pos) : stageOfYears(yearsOf(p)));

// How the board looks before and through a life (REDESIGN.md Phase 13, item 6). Bhaskar chose the veil (26 Oct); the other
// two stay only under ?debug (?look=, mp.look):
//   veil    the squares ahead at full pigment under a thin cream veil, half the dimness, that lifts as they are reached
//   first   the whole cloth in full pigment until the game's first throw, and then the ageing as it always was
//   asrama  nothing dims within the oldest player's own stage of life; the ageing begins beyond the next āśrama
// The rule holds under all three: once the ageing begins a life never sees the whole board clearly, and it paints only the art.
export const LOOKS = ["veil", "first", "asrama"];
export const lookOf = q => (LOOKS.includes(q) ? q : LOOKS[0]);
export const VEIL = 0.5;

// Whose age the board shows. With every player: sepia is what all of them have left behind (the youngest),
// dim is what none of them has reached (the oldest), and the drone follows whoever is furthest on.
// lens(state, i) sees through one life only, for Phase 18. droneStage is an ASHRAMAS index, or
// ASHRAMAS.length for silence once someone reaches the exit.
// look null is the ageing as Phase 5 shipped it, with no first impression: what the tests below the page reason about.
export function lens(state, i = null, look = null) {
  const ps = i == null ? state.players : [state.players[i]];
  const pos = ps.map(p => p.pos), lead = Math.max(...pos), years = ps.map(yearsOf);
  const dimAge = Math.max(...years);
  return {
    fadeAge: Math.min(...years),
    // under asrama, the dimness waits for the end of the oldest's stage of life (the age of its last square)
    dimAge: look === "asrama" ? Math.max(dimAge, ageOf(ASHRAMAS[Math.min(stageOfYears(dimAge), 4)][0]) ?? dimAge) : dimAge,
    lead,
    droneStage: state.winner != null ? ASHRAMAS.length : stageOf(ps[pos.indexOf(lead)]),
    look,
    // the game's first throw has been made (state.last is set by every throw, and only by a throw)
    begun: state.last != null,
  };
}

const clamp = x => Math.max(0, Math.min(1, x));
// The board losing solidity (REDESIGN.md Phase 16): at the highest bhūmikās the painted things on the cloth, the snakes,
// the ladders and the vignettes, grow translucent, so turyā is seen and never named. 0 below the fifth bhūmikā (index 4),
// half at the sixth, whole at turyā; the highest any player at the table is in now. Paint only: the ground and every
// label stay as they are (styles.css #art, .cell .pic), so no label's contrast can change.
export const CLEAR_FROM = 4;
export const clearOf = state => clamp(Math.max(0, ...state.players.map(p => (p.bhumika ?? -1) - CLEAR_FROM)) / 2);
// How aged square n looks through a lens, as { sepia, dim } from 0 to 1. The divine row never fades and
// stays fully dim until someone reaches it. Ahead, the next years are barely dimmed and the far future most.
export function wash(n, { fadeAge, dimAge, lead, look = null, begun = true }) {
  if (look === "first" && !begun) return { sepia: 0, dim: 0 };
  const k = look === "veil" ? VEIL : 1, a = ageOf(n);
  if (a == null) return { sepia: 0, dim: n > lead ? k : 0 };
  return {
    sepia: a < fadeAge ? clamp((fadeAge - a) / FADE_YEARS) : 0,
    dim: a > dimAge ? k * clamp(0.2 + (0.8 * (a - dimAge)) / DIM_YEARS) : 0,
  };
}
