// REDESIGN.md Phase 18: a board's geometry is data (content/boards.json, src/geometry.js).
import test from "node:test";
import assert from "node:assert/strict";
import { BOARDS, BOARD_ID, LAYOUT, COLS, ROWS, TOP, GOAL, SNAKES, LADDERS, useBoard } from "../src/content.js";
import { layoutOf } from "../src/geometry.js";
import { colRow } from "../src/render/ground.js";

test("the 110 is laid out by its geometry exactly as the old 10-wide formula placed it", () => {
  assert.equal(BOARD_ID, "110");
  assert.equal(COLS, 10);
  assert.equal(ROWS, 11);
  for (let n = 1; n <= TOP; n++) {
    const i = n - 1, row = Math.floor(i / 10), col = row % 2 === 0 ? i % 10 : 9 - (i % 10);
    assert.deepEqual(colRow(n), { col, row }, `square ${n}`);
  }
  assert.equal(LAYOUT.squares.length, TOP);
});

test("every board's squares fit its extent, one square to a cell, and every snake and ladder joins two of them", () => {
  for (const id of Object.keys(BOARDS)) {
    const L = layoutOf(BOARDS[id].geometry), seen = new Set();
    for (const n of L.squares) {
      const { col, row } = L.at[n], k = `${col},${row}`;
      assert.ok(col >= 0 && col < L.cols && row >= 0 && row < L.rows, `${id}: square ${n} at ${k} is off the board`);
      assert.ok(!seen.has(k), `${id}: two squares at ${k}`);
      seen.add(k);
    }
    useBoard(id);
    for (const [from, e] of [...Object.entries(SNAKES), ...Object.entries(LADDERS)]) {
      assert.ok(LAYOUT.at[from] && LAYOUT.at[e.to], `${id}: ${from} → ${e.to}`);
    }
    assert.ok(LAYOUT.at[GOAL], `${id}: the goal ${GOAL} is a square`);
  }
  useBoard("110");
  assert.equal(GOAL, 105);
});
