// Sound, synthesised with Web Audio so there are no files to load. The context starts on the
// first tap or key, as browsers require, and never while muted: a muted player has no context at all.
// Under reduced motion every cue is shorter and softer.
import { prefs, setPref } from "../prefs.js";
import { reduced, quality } from "../ui.js";
import { makeDrone } from "./drone.js";
import { makeShepard } from "./shepard.js";

let ctx = null, noise = null, master = null, drone = null, shepard = null;
// the drone stage the game wants (an ASHRAMAS index, or past the end for silence), or null before the first roll
let wanted = null;
// the square the Shepard tone follows (the furthest player's), and whether someone has been let out
let lifted = { lead: null, won: false };
const SOFT = reduced ? 0.6 : 1;
// iOS can refuse a resume, or report "interrupted"; the next gesture tries again
const resume = () => ctx.resume().catch(() => {});

export function unlockAudio() {
  if (prefs.mute) return;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5 * SOFT;
    master.connect(ctx.destination);
    // one second of white noise from a fixed xorshift sequence, so audio never touches the game's dice
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0, x = 2463534242; i < d.length; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; d[i] = ((x >>> 0) / 4294967296) * 2 - 1; }
    drone = makeDrone(ctx, master, { lite: quality === "low" });
    // the divine row's glissando layers over the drone, whose held Sa is its pedal
    shepard = makeShepard(ctx, master, { lite: quality === "low" });
  }
  if (ctx.state !== "running" && !document.hidden) resume();
  if (wanted != null) drone.set(wanted);
  if (lifted.lead != null) shepard.set(lifted.lead, lifted.won);
}

// Set the drone's stage, or null to stop it. It plays only once a gesture has made a context and sound is on.
export function setDrone(stage) {
  wanted = stage;
  if (!drone || prefs.mute) return;
  stage == null ? drone.stop() : drone.set(stage);
}

// Follow the furthest player's square with the Shepard tone; null before the first roll. It sets targets only:
// the tone glides to them, so a bounce or a jump never clicks (REDESIGN.md Phase 7).
export function setShepard(lead, won = false) {
  lifted = { lead, won };
  if (!shepard || prefs.mute) return;
  shepard.set(lead, won);
}

export const muted = () => prefs.mute;
// Muting fades the drone and then suspends the context, so nothing runs; unmuting is a click, which is
// the gesture that may create or resume it.
export function setMuted(m) {
  setPref("mute", m);
  if (!m) return unlockAudio();
  if (!ctx) return;
  drone.stop();
  shepard.stop();
  setTimeout(() => { if (prefs.mute) ctx.suspend().catch(() => {}); }, 200);
}

// Nothing plays in a hidden tab.
document.addEventListener("visibilitychange", () => {
  if (!ctx || prefs.mute) return;
  document.hidden ? ctx.suspend().catch(() => {}) : resume();
});

// For ?debug: what the sound is doing.
export const audioState = () => ({ ctx: ctx?.state ?? null, stage: drone?.stage ?? null, voices: drone?.voices ?? 0, wanted, muted: prefs.mute, shepard: shepard?.state ?? null });
const ready = () => ctx && !prefs.mute && ctx.state === "running";

function env(g, at, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

// A burst of filtered noise; f0 → f1 sweeps the band.
function hiss(at, dur, f0, f1, peak, q = 1.2, type = "bandpass") {
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise;
  src.playbackRate.value = 1;
  bp.type = type; bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, at);
  bp.frequency.exponentialRampToValueAtTime(f1, at + dur);
  env(g, at, peak, Math.min(0.03, dur / 4), dur);
  src.connect(bp).connect(g).connect(master);
  src.start(at, (at * 7.3) % 0.5);
  src.stop(at + dur + 0.1);
}

function tone(at, freq, dur, peak, type = "triangle", glideTo = null) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
  env(g, at, peak, 0.01, dur);
  o.connect(g).connect(master);
  o.start(at);
  o.stop(at + dur + 0.1);
}

export const sound = {
  // wooden die knocking about in a cupped hand
  rattle() {
    if (!ready()) return;
    const now = ctx.currentTime, n = reduced ? 3 : 7;
    for (let i = 0; i < n; i++) {
      const at = now + i * 0.075 + ((i * 37) % 11) / 1000;
      hiss(at, 0.035, 1800 + ((i * 53) % 7) * 220, 1200, 0.5, 6);
      tone(at, 180 + ((i * 29) % 5) * 30, 0.04, 0.12, "square");
    }
  },
  // a palm-leaf page drawn out of the bundle
  open() {
    if (!ready()) return;
    const now = ctx.currentTime;
    hiss(now, 0.22 * SOFT, 700, 2600, 0.22, 0.8);
  },
  close() {
    if (!ready()) return;
    const now = ctx.currentTime;
    hiss(now, 0.16 * SOFT, 2200, 650, 0.18, 0.8);
  },
  // rising notes of a pentatonic scale: sa re ga pa dha sa
  ladder() {
    if (!ready()) return;
    drone.duck();
    const now = ctx.currentTime, base = 293.66;
    [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2].forEach((r, i) => tone(now + i * 0.085, base * r, 0.5 * SOFT, 0.16, "triangle"));
  },
  // a low falling tone under a hiss
  snake() {
    if (!ready()) return;
    drone.duck(1);
    const now = ctx.currentTime;
    hiss(now, 0.5 * SOFT, 5200, 3000, 0.16, 0.7, "highpass");
    tone(now + 0.05, 196, 0.7 * SOFT, 0.2, "sawtooth", 62);
  },
  // the fall past the top of the heavens: the hiss, and then the Shepard tone itself falls, the one resolution in the piece
  fall(secs) {
    if (!ready()) return;
    const now = ctx.currentTime;
    hiss(now, 0.5 * SOFT, 5200, 3000, 0.16, 0.7, "highpass");
    shepard.fall(secs);
  },
};
