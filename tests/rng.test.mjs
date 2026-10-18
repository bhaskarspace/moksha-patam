import test from "node:test";
import assert from "node:assert/strict";
import { makeRng, next, die } from "../src/rng.js";

test("the same seed gives the same sequence", () => {
  const a = makeRng(42), b = makeRng(42);
  const xs = Array.from({ length: 50 }, () => next(a));
  assert.deepEqual(xs, Array.from({ length: 50 }, () => next(b)));
  assert.ok(xs.every(x => x >= 0 && x < 1));
});

test("matches reference mulberry32 output", () => {
  // mulberry32(1), first three values
  const r = makeRng(1);
  assert.deepEqual([next(r), next(r), next(r)], [0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
});

test("rng state survives a JSON round trip", () => {
  const r = makeRng(7);
  next(r); next(r);
  const copy = JSON.parse(JSON.stringify(r));
  assert.equal(next(copy), next(r));
});

test("die faces are 1 to 6 and all appear", () => {
  const r = makeRng(3), seen = new Set();
  for (let i = 0; i < 600; i++) seen.add(die(r));
  assert.deepEqual([...seen].sort(), [1, 2, 3, 4, 5, 6]);
});
