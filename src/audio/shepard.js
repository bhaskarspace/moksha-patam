// The Shepard–Risset glissando under the divine row (REDESIGN.md Phase 7, item 6): octave-spaced partials, each
// rising through a window that is silent at both ends, so the pitch climbs forever and never arrives. Walking
// toward the exit it rises; past the exit it rises faster through 106–110 and never resolves; the fall past the top
// (REDESIGN.md Phase 12) is the only place it truly falls. A sine an octave under Sa gives it weight.
//
// Board position never sets an audio parameter. It chooses targets (level, rate, brightness), which glide in JS,
// and a look-ahead scheduler writes short ramps that each begin where the last one ended. Nothing here calls
// cancelScheduledValues on a partial, so a jump or the fall can never click.
import { GOAL } from "../content.js";
import { SA } from "./drone.js";

// Partial k of K, at a phase p that only moves forward: its place in its own window (0 to 1), its pitch as
// octaves above the lowest, and its gain. The window is sin², exactly 0 where a partial jumps back down an
// octave, and the K windows always sum to K/2, so the loudness holds steady while the pitch rises.
export function voicing(p, K) {
  return Array.from({ length: K }, (_, k) => {
    const f = (((p + k / K) % 1) + 1) % 1;
    return { f, oct: K * f, gain: (2 / K) * Math.sin(Math.PI * f) ** 2 };
  });
}

// What the divine row asks of the tone at the furthest player's square. rate is octaves a second.
export function targets(lead, won) {
  if (won) return { level: 0, rate: 0, bright: 0.6 };                  // at the exit the climb simply stops
  if (lead == null || lead <= 100) return { level: 0, rate: 1 / 20, bright: 0.5 };
  if (lead < GOAL) { const u = (lead - 101) / (GOAL - 102); return { level: 0.45 + 0.45 * u, rate: 1 / 20 + u / 40, bright: 0.6 + 0.3 * u }; }
  return { level: 1, rate: 1 / 9, bright: 1 };                          // the higher heavens: faster, brighter, no end
}

const TICK = 0.1, AHEAD = 0.4, GLIDE = 1.5, PEAK = 0.05;
const glide = (x, to, dt, tau = GLIDE) => x + (to - x) * (1 - Math.exp(-dt / tau));

export function makeShepard(ctx, out, { lite = false } = {}) {
  const K = lite ? 4 : 6, low = lite ? SA / 2 : SA / 4;   // every partial passes through Sa's octaves
  const want = targets(null, false);
  // the tone as the scheduler last wrote it: phase, level, rate, brightness, and how far the fall has dropped it
  const st = { p: 0, level: 0, rate: want.rate, bright: want.bright, drop: 0 };
  let graph = null, timer = null, at = 0, fall = null, quietFor = 0;

  function build() {
    const bus = ctx.createGain(), lp = ctx.createBiquadFilter(), now = ctx.currentTime;
    bus.gain.value = 1;
    lp.type = "lowpass"; lp.Q.value = 0.5; lp.frequency.value = 1500 * st.bright;
    lp.connect(bus).connect(out);
    const parts = voicing(st.p, K).map(v => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(low * 2 ** (v.oct - st.drop), now);
      g.gain.setValueAtTime(0, now);
      o.connect(g).connect(lp); o.start(now);
      return { o, g, f: v.f };
    });
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.frequency.value = SA / 2; sg.gain.setValueAtTime(0, now);
    sub.connect(sg).connect(bus); sub.start(now);
    graph = { bus, lp, parts, sub, sg };
    at = now;
  }
  function teardown() {
    if (!graph) return;
    const g = graph, now = ctx.currentTime;
    graph = null;
    g.bus.gain.setTargetAtTime(0, now, 0.05);
    [...g.parts.map(x => x.o), g.sub].forEach(o => o.stop(now + 0.4));
    setTimeout(() => g.bus.disconnect(), 600);
  }

  // one step of dt seconds: glide toward the targets (or follow the fall), advance the phase, and write ramps to t1
  function step(t0, dt) {
    const t1 = t0 + dt;
    // a fall that ended on the last step left the tone silent at t0 and its window still down: put it back now
    const reset = !fall && st.drop > 0, p0 = st.p;
    if (reset) st.drop = 0;
    if (fall) {
      const u = Math.min(1, (t1 - fall.t0) / fall.secs);
      st.level = fall.level * (1 - u) ** 2;
      st.drop = 2 * u;                               // the window itself goes down two octaves: a real fall
      st.rate = fall.rate;
      // the window stays down until the next step, when the tone is silent and can be put back at once
      if (u >= 1) { fall = null; st.level = 0; st.rate = want.rate; }
    } else {
      st.level = glide(st.level, want.level, dt);
      st.rate = glide(st.rate, want.rate, dt);
      st.bright = glide(st.bright, want.bright, dt);
    }
    st.p = (st.p + (st.rate * dt) / K) % 1;
    if (!graph) return;
    const vs = voicing(st.p, K), v0 = reset && voicing(p0, K);
    if (reset) graph.lp.frequency.setValueAtTime(1500 * st.bright, t0);
    graph.parts.forEach((x, k) => {
      const v = vs[k], f0 = x.f;
      if (reset) x.o.frequency.setValueAtTime(low * 2 ** v0[k].oct, t0);
      // a partial that has come to the top of its window drops an octave there, where its gain is exactly 0
      if (v.f < f0 && st.rate > 0) {
        const tw = t0 + dt * Math.min(1, Math.max(0, (1 - f0) / (v.f + 1 - f0)));
        x.o.frequency.exponentialRampToValueAtTime(low * 2 ** (K - st.drop), tw);
        x.g.gain.linearRampToValueAtTime(0, tw);
        x.o.frequency.setValueAtTime(low * 2 ** (0 - st.drop), tw);
      }
      x.o.frequency.exponentialRampToValueAtTime(low * 2 ** (v.oct - st.drop), t1);
      x.g.gain.linearRampToValueAtTime(PEAK * st.level * v.gain, t1);
      x.f = v.f;
    });
    graph.lp.frequency.linearRampToValueAtTime(1500 * st.bright * 2 ** -st.drop, t1);
    graph.sg.gain.linearRampToValueAtTime(PEAK * 0.6 * st.level, t1);
  }

  function schedule() {
    const now = ctx.currentTime;
    if (!graph && (want.level > 0 || fall)) build();
    if (!graph) return;
    // after a stall the last ramp has simply held its value; carry on from it, from now
    if (at < now) {
      graph.parts.forEach(x => { x.o.frequency.setValueAtTime(x.o.frequency.value, now); x.g.gain.setValueAtTime(x.g.gain.value, now); });
      at = now;
    }
    while (at < now + AHEAD) { step(at, TICK); at += TICK; }
    // silent for a while and asked to stay so: let the oscillators go
    quietFor = want.level === 0 && !fall && st.level < 1e-3 ? quietFor + TICK : 0;
    if (quietFor > 2) teardown();
  }

  return {
    get voices() { return graph ? K + 1 : 0; },
    get state() { return { level: +st.level.toFixed(3), rate: +st.rate.toFixed(3), falling: !!fall, voices: graph ? K + 1 : 0 }; },
    // the furthest player's square, and whether someone has been let out
    set(lead, won) {
      Object.assign(want, targets(lead, won));
      if (!timer) { timer = setInterval(schedule, TICK * 1000); }
      schedule();
    },
    // the fall: the tone falls for secs and ends on Sa, its phase brought round to a whole octave
    fall(secs) {
      if (!graph || st.level < 1e-3) return;
      const t0 = Math.max(at, ctx.currentTime), whole = (Math.ceil(st.p * K - 1e-9) - st.p * K) / K;
      fall = { t0, secs, level: st.level, rate: (whole * K) / secs };
    },
    // muted, or the page is going: fade fast and drop everything
    stop() {
      clearInterval(timer); timer = null;
      fall = null; st.level = 0; st.drop = 0; quietFor = 0;
      teardown();
    },
  };
}
