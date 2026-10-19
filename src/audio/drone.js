// A tanpura under the game, synthesised: each string is a rich periodic wave through a peaking band that rises
// as the note decays (the jawari), plucked in the usual Pa·Sa·Sa·Sa cycle. The stage follows the ashrama of
// whoever is furthest on (render/age.js): open in childhood, dense through gṛhastha, thinning through
// vānaprastha to one held Sa in sannyāsa, silent at the exit.
export const SA = 146.83; // D3, so the ladder's pentatonic on D4 is in key with it
const PA = 0.75, SA2 = 2, SA1 = 1;
// one per ASHRAMAS entry, then silence
const STAGES = [
  { strings: [PA, SA2, SA2, SA1], gap: 1.6, gain: 0.55, bright: 1 },
  { strings: [PA, SA2, SA2, SA1], gap: 1.2, gain: 0.7, bright: 0.9 },
  { strings: [PA, SA2, SA2, SA1], gap: 1, gain: 0.85, bright: 1.15, double: true },
  { strings: [SA2, SA2, SA1], gap: 1.6, gain: 0.6, bright: 0.7 },
  { strings: [], gain: 0.5, bright: 0.6, sustain: true },
  { strings: [], gain: 0.25, bright: 0.5, sustain: true },
  { strings: [], gain: 0, silent: true },
];

// out is where the drone plays into; lite halves the strings for a weak device.
export function makeDrone(ctx, out, { lite = false } = {}) {
  const bus = ctx.createGain();
  bus.gain.value = 0.0001;
  // a little room, from two short feedback delays
  const wet = ctx.createGain(), lp = ctx.createBiquadFilter();
  wet.gain.value = 0.22; lp.frequency.value = 3200;
  bus.connect(out); bus.connect(lp);
  for (const t of [0.083, 0.127]) {
    const d = ctx.createDelay(), fb = ctx.createGain();
    d.delayTime.value = t; fb.gain.value = 0.45;
    lp.connect(d); d.connect(fb).connect(d); d.connect(wet);
  }
  wet.connect(out);
  // many harmonics falling as 1/n, the odd ones a touch stronger, as on a bridge that buzzes
  const N = 28, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
  for (let n = 1; n <= N; n++) im[n] = (n % 2 ? 1.15 : 1) / n;
  const wave = ctx.createPeriodicWave(re, im);

  // a local xorshift for the small unevenness of a hand, never the game's dice
  let x = 88172645;
  const jitter = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) / 4294967296) * 2 - 1; };
  let stage = null, timer = null, nextAt = 0, step = 0, held = null, voices = 0;

  function pluck(at, freq, s) {
    const dur = 3.6 + jitter() * 0.4, g = ctx.createGain(), band = ctx.createBiquadFilter(), low = ctx.createBiquadFilter();
    band.type = "peaking"; band.Q.value = 3.5; band.gain.value = 14;
    band.frequency.setValueAtTime(700 * s.bright, at);
    band.frequency.exponentialRampToValueAtTime(4200 * s.bright, at + dur * 0.8);
    low.type = "lowpass";
    low.frequency.setValueAtTime(5200 * s.bright, at);
    low.frequency.exponentialRampToValueAtTime(1400, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.09, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.045, at + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    for (const cents of lite ? [0] : [-3, 3]) {
      const o = ctx.createOscillator();
      o.setPeriodicWave(wave);
      o.frequency.value = freq * 2 ** ((cents + jitter()) / 1200);
      o.connect(band);
      o.start(at); o.stop(at + dur + 0.05);
      voices++; o.onended = () => voices--;
    }
    band.connect(low).connect(g).connect(bus);
  }

  // sannyāsa: one Sa held, its band drifting slowly instead of being plucked
  function hold(s) {
    const g = ctx.createGain(), band = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), depth = ctx.createGain(), now = ctx.currentTime;
    band.type = "peaking"; band.Q.value = 3; band.gain.value = 10; band.frequency.value = 1600 * s.bright;
    lfo.frequency.value = 0.09; depth.gain.value = 900 * s.bright;
    lfo.connect(depth).connect(band.frequency);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 3);
    const oscs = (lite ? [0] : [-4, 0, 4]).map(c => {
      const o = ctx.createOscillator();
      o.setPeriodicWave(wave); o.frequency.value = SA * 2 ** (c / 1200);
      o.connect(band); o.start();
      return o;
    });
    band.connect(g).connect(bus); lfo.start();
    voices += oscs.length;
    return { stop(at) { g.gain.setTargetAtTime(0.0001, at, 0.8); [...oscs, lfo].forEach(o => o.stop(at + 5)); voices -= oscs.length; } };
  }

  // look half a second ahead every 200 ms, so the cycle keeps time whatever the page is doing
  function schedule() {
    const s = STAGES[stage];
    if (!s?.strings.length) return;
    const strings = lite ? s.strings.slice(-2) : s.strings;
    while (nextAt < ctx.currentTime + 0.5) {
      const i = step % strings.length;
      pluck(nextAt, SA * strings[i], s);
      if (s.double && !lite) pluck(nextAt + s.gap / 2, SA * strings[(i + 2) % strings.length] * 1.002, s);
      // the first string waits a little longer, as tanpura players do
      nextAt += s.gap * (i === 0 ? 1.25 : 1) + jitter() * 0.03;
      step++;
    }
  }

  return {
    get stage() { return stage; },
    get voices() { return voices; },
    // move to stage i, crossfading over about three seconds
    set(i) {
      if (i === stage) return;
      const s = STAGES[Math.min(i, STAGES.length - 1)], now = ctx.currentTime;
      stage = i;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(s.silent ? 0.0001 : s.gain, now, s.silent ? 1.3 : 1);
      if (held && !s.sustain) { held.stop(now); held = null; }
      if (s.sustain && !held) held = hold(s);
      if (!timer) { nextAt = now + 0.05; timer = setInterval(schedule, 200); }
      nextAt = Math.max(nextAt, now + 0.05);
      schedule();
    },
    // fade out fast and stop scheduling
    stop() {
      if (stage == null) return;
      const now = ctx.currentTime;
      clearInterval(timer); timer = null; stage = null;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(0.0001, now, 0.05);
      if (held) { held.stop(now); held = null; }
    },
    // drop about 6 dB under a snake or ladder cue, then come back
    duck(secs = 0.8) {
      if (stage == null) return;
      const now = ctx.currentTime, g = STAGES[stage].gain;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(g * 0.5, now, 0.05);
      bus.gain.setTargetAtTime(g, now + secs, 0.4);
    },
  };
}
