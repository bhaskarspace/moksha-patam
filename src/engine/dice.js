// ---- What a board is played with (REDESIGN.md Phase 18) ----
// Each old board brought its own randomizer, and it is a real design lever (Schmidt-Madsen 2019, ch. 5, "Randomizing
// Agents", pp. 203–205): the Vaiṣṇava charts were played mostly with cowries, counted by the shells that fall face up; the
// Jaina charts with a four-sided stick die, which Jeṭhābhāī names (JBRR 1). A plain die is the modern way, and a setting
// on either. Every draw is off the game's own sequence (src/rng.js), the page's and tools/sim.mjs's alike. Pure.
import { die, next } from "../rng.js";

// Seven cowries, each face up a little less often than not: 45%, as Schmidt-Madsen measured with a set brought home
// from India (2019, p. 206 fn. 345), so a 1 comes 8.7% of the time and a 0, which moves nothing, 1.5%.
export const COWRIES = 7, COWRIE_UP = 0.45;
// The stick die configured 1-2-5-6 (ibid. p. 204; Lüders 1907: 17), as the Jaina playthrough uses it (p. 217).
export const STICK = [1, 2, 5, 6];
export const RANDS = ["die", "cowries", "stick"];

// One throw of kind, as { v, up }: v the count moved by, up the shells that fell face up (cowries only)
export function throwOf(rng, kind = "die") {
  if (kind === "cowries") {
    const up = Array.from({ length: COWRIES }, () => next(rng) < COWRIE_UP);
    return { v: up.filter(Boolean).length, up };
  }
  if (kind === "stick") return { v: STICK[Math.floor(next(rng) * STICK.length)] };
  return { v: die(rng) };
}
// The chance of each count, for the tests and the sim's report
export function oddsOf(kind = "die") {
  if (kind === "stick") return Object.fromEntries(STICK.map(v => [v, 1 / STICK.length]));
  if (kind !== "cowries") return Object.fromEntries([1, 2, 3, 4, 5, 6].map(v => [v, 1 / 6]));
  const C = (n, k) => { let c = 1; for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i; return c; };
  return Object.fromEntries(Array.from({ length: COWRIES + 1 }, (_, k) => [k, C(COWRIES, k) * COWRIE_UP ** k * (1 - COWRIE_UP) ** (COWRIES - k)]));
}
