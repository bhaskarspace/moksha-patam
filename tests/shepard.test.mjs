import test from "node:test";
import assert from "node:assert/strict";
import { voicing, targets, makeShepard } from "../src/audio/shepard.js";

test("the partials' windows always sum to the same loudness, and each is silent where it wraps", () => {
  for (const K of [4, 6]) {
    for (let p = 0; p < 1; p += 0.01) {
      const vs = voicing(p, K);
      assert.ok(Math.abs(vs.reduce((a, v) => a + v.gain, 0) - 1) < 1e-9, `K ${K}, phase ${p}`);
      for (const v of vs) if (v.f < 1e-6 || v.f > 1 - 1e-6) assert.ok(v.gain < 1e-9);
    }
  }
});

test("position chooses targets only: below heaven it is silent, past the exit it rises fastest, at the exit it stops", () => {
  assert.equal(targets(50, false).level, 0);
  assert.equal(targets(null, false).level, 0);
  assert.ok(targets(101, false).level > 0 && targets(104, false).level > targets(101, false).level);
  assert.ok(targets(104, false).rate > targets(101, false).rate);
  // past the exit the tone still rises, bouncing down from 110 included: position never makes it fall
  for (let n = 106; n <= 110; n++) assert.ok(targets(n, false).rate >= targets(104, false).rate && targets(n, false).level === 1);
  assert.deepEqual([targets(105, true).level, targets(105, true).rate], [0, 0]);
});

// A Web Audio stand-in that records every automation event, so the schedule can be checked for clicks.
function fakeCtx() {
  const ctx = { currentTime: 0, params: [] };
  const param = (value = 0) => {
    const pr = { value, ev: [], cancelled: 0 };
    for (const m of ["setValueAtTime", "linearRampToValueAtTime", "exponentialRampToValueAtTime", "setTargetAtTime"]) pr[m] = (v, t) => { pr.ev.push({ m, v, t }); };
    pr.cancelScheduledValues = () => { pr.cancelled++; };
    ctx.params.push(pr);
    return pr;
  };
  const node = extra => { const n = { disconnect() {}, start() {}, stop() {}, ...extra }; n.connect = to => ((n.to = to), to); return n; };
  ctx.oscs = [];
  ctx.createGain = () => node({ gain: param(1) });
  ctx.createBiquadFilter = () => node({ frequency: param(350), Q: param(0.7), type: "" });
  ctx.createOscillator = () => { const o = node({ frequency: param(440) }); ctx.oscs.push(o); return o; };
  return ctx;
}
// the value of a linearly ramped param at time t
function valueAt(ev, t) {
  let prev = null;
  for (const e of ev) {
    if (e.t > t + 1e-9) {
      if (!prev || e.m !== "linearRampToValueAtTime") return prev ? prev.v : 0;
      return prev.v + ((e.v - prev.v) * (t - prev.t)) / (e.t - prev.t);
    }
    prev = e;
  }
  return prev ? prev.v : 0;
}

test("walking up the divine row, bouncing, falling and leaving: no cancelling, and every octave jump is silent", () => {
  const ctx = fakeCtx(), sh = makeShepard(ctx, { connect() {} });
  const run = secs => { for (let i = 0; i < secs * 10; i++) { ctx.currentTime += 0.1; sh.set(lead, false); } };
  let lead = 101;
  sh.set(lead, false); run(3);
  for (lead = 102; lead <= 110; lead++) run(1.5);          // up the row and past the exit
  lead = 107; run(2);                                       // a bounce off 110 lands lower
  sh.fall(2.6); lead = 1; run(4);                           // the Brahma snake, and back to birth
  lead = 103; run(3);                                       // someone else is still up there
  sh.stop();

  assert.ok(ctx.params.every(p => p.cancelled === 0), "nothing cancels scheduled values");
  // each oscillator with the gain it plays through
  const pairs = ctx.oscs.map(o => [o.frequency, o.to.gain]);
  assert.ok(pairs.length >= 7);
  let jumps = 0;
  pairs.forEach(([f, g], i) => {
    f.ev.forEach((e, j) => {
      if (j === 0 || e.m !== "setValueAtTime") return;
      jumps++;
      assert.ok(Math.abs(valueAt(g.ev, e.t)) < 1e-12, `partial ${i} jumps at ${e.t.toFixed(2)}s while sounding (${valueAt(g.ev, e.t)})`);
    });
    for (let j = 1; j < f.ev.length; j++) assert.ok(f.ev[j].t >= f.ev[j - 1].t - 1e-9, "events run forward in time");
  });
  assert.ok(jumps > 0, "partials did wrap");
});

test("the fall truly falls: the partials end lower than they began, and the tone ends silent", () => {
  const ctx = fakeCtx(), sh = makeShepard(ctx, { connect() {} });
  for (let i = 0; i < 80; i++) { ctx.currentTime += 0.1; sh.set(108, false); }
  const before = ctx.oscs.slice(0, -1).map(o => o.frequency.ev.at(-1).v);
  sh.fall(2.6);
  for (let i = 0; i < 26; i++) { ctx.currentTime += 0.1; sh.set(1, false); }
  assert.ok(sh.state.level < 0.01);
  const lowest = ctx.oscs.slice(0, -1).map(o => Math.min(...o.frequency.ev.filter(e => e.t > ctx.currentTime - 1).map(e => e.v)));
  assert.ok(Math.min(...lowest) < Math.min(...before));
  sh.stop();
});
