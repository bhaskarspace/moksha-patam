// Śiva's snake (REDESIGN.md Phase 14): drawn from the trident on 110 to a tail in square 1, along the board's edge so it
// keeps off the squares' scenes, in a pigment none of the board's other snakes has.
import test from "node:test";
import assert from "node:assert/strict";
import { ROWS, BOARD, SNAKES, paletteTokens } from "../src/content.js";
import { colRow, sivaPath, SIVA_TOP } from "../src/render/ground.js";

const cellOf = ({ x, y }) => { const col = Math.floor(x), row = ROWS - 1 - Math.floor(y); return row % 2 === 0 ? row * 10 + col + 1 : row * 10 + (9 - col) + 1; };

test("Śiva's snake runs from 110 to square 1, on the board", () => {
  const pts = sivaPath();
  assert.equal(cellOf(pts[0]), SIVA_TOP);
  assert.equal(cellOf(pts.at(-1)), 1);
  for (const p of pts) assert.ok(p.x > 0 && p.x < 10 && p.y > 0 && p.y < ROWS, `${p.x},${p.y} is off the board`);
  assert.ok(pts[0].w > pts.at(-1).w, "it tapers to the tail");
});

test("between the coil and the tail it keeps to the board's edge", () => {
  const pts = sivaPath(), { col, row } = colRow(1);
  const top = { x: 9.5, y: 0.5 }, one = { x: col + 0.5, y: ROWS - 1 - row + 0.5 };
  for (const p of pts) {
    if (Math.hypot(p.x - top.x, p.y - top.y) < 0.75 || Math.hypot(p.x - one.x, p.y - one.y) < 0.5) continue;
    assert.ok(10 - p.x < 0.2 || ROWS - p.y < 0.2, `${p.x.toFixed(2)},${p.y.toFixed(2)} is inside the board`);
  }
});

test("its nīla is a palette token and no other snake's body", () => {
  assert.ok(paletteTokens()["--b-nila"], "nila is in the board's palette");
  assert.ok(!BOARD.snakes.some(([body]) => body === "nila"));
  assert.ok(!Object.keys(SNAKES).includes(String(SIVA_TOP)), "110 is not one of SNAKES");
});
