// ---- A board's geometry, as data (REDESIGN.md Phase 18) ----
// A board declares where its squares are (content/boards.json `geometry`): its extent in cells, and its track as runs.
// A run is a boustrophedon ({ from, to, width, origin: [col, row], path: "boustrophedon" }, the first row read left to
// right unless it says dir: -1), a single row ({ from, to, row, col, dir }: from at col, then one cell a square toward
// dir), or one square placed anywhere ({ n, at: [col, row] }), for the squares outside the main grid. Rows count up from
// the bottom of the extent, columns from its left. Pure, so the tests and the tools read a board as the page does.

export function layoutOf(geometry) {
  const at = {};
  for (const r of geometry.track) {
    if (r.n != null) { at[r.n] = { col: r.at[0], row: r.at[1] }; continue; }
    if (r.path === "boustrophedon") {
      const [c0, r0] = r.origin ?? [0, 0], first = r.dir ?? 1;
      for (let n = r.from; n <= r.to; n++) {
        const i = n - r.from, row = Math.floor(i / r.width), k = i % r.width, dir = row % 2 === 0 ? first : -first;
        at[n] = { col: c0 + (dir > 0 ? k : r.width - 1 - k), row: r0 + row };
      }
      continue;
    }
    for (let n = r.from; n <= r.to; n++) at[n] = { col: r.col + (n - r.from) * (r.dir ?? 1), row: r.row };
  }
  // every cell a square stands in, keyed "col,row", for the arrow keys
  const cell = {};
  for (const [n, p] of Object.entries(at)) cell[`${p.col},${p.row}`] = +n;
  return { cols: geometry.cols, rows: geometry.rows, at, cell, squares: Object.keys(at).map(Number).sort((a, b) => a - b) };
}
