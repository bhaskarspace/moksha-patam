# Moksha Patam

A bilingual (English/Hindi) snakes-and-ladders game played as one life. It deploys as a
single static `index.html` at https://codebpr.com/moksha-patam/

## Layout
- `src/` is the source. `content/*.json` holds the content (squares, readings, codex, strings,
  names). `assets/sprites.svg` is the art, inlined by the build; without it squares show emoji.
- `index.html` and `sw.js` at the root are **built artifacts. Never hand-edit them.**
  Rebuild with `npm run build` (`tools/build.mjs`): it inlines `src/` into `index.html`
  and stamps the cache version into `sw.js` from `src/sw.js`. Commit both after building.

## Plans
- `REDESIGN.md`: the phase list and what has shipped. Read it first.
- `docs/CONTENT.md`: the Phase 2 brief (shipped). Its §7 art spec still governs the sprites.
- `docs/NARRATIVE.md`: the Phase 3 brief (shipped): moments, gender agreement, ages, the life account.
- `docs/REFERENCE.md`: philosophy-to-mechanics mapping and the history of the board.
- `docs/LANDSCAPE.md`: comparable games.

**State:** Phases 0 to 3 have shipped. Phase 4, Board craft, is done on the `phase-4-board-craft`
branch and not yet merged to `main`. Phase 5, The painted board, is next (REDESIGN.md §4).

## Commands
- `npm run build`: fails on any `Math.random` outside `src/rng.js` or on any content lint error.
- `npm test`: `node --test tests/*.test.mjs`
- `npm run lint`: content lint (`tools/lint-content.mjs`): Hindi, dangling ids, two voices per
  square, a name in every mirror (`content/names.json`), and the sprite palette. Phase 3 adds the
  moments: `{name}` in both languages, Hindi agreement through `{m|f}` choices, an age on every
  earthly square, and a `moments: n/109` burn-down line.
- `npm run format`: rewrites `content/*.json` one entry per line. Run it after editing content.
- `npm run sim [games] [players] [firstSeed] [--rules=brahmaloka] [--snake=HEAD:TAIL|none]`: headless
  games, reporting median, p5, p95 and the share over 100 turns. Balance against the p95.
- `npm run smoke`: Playwright checks of the built page in a real browser (needs Chrome installed).
- `npm run golden [seeds]`: the built page and `sim.mjs` must produce the same move log.
- `node tools/icons.mjs`: regenerates `icons/`. Only needed when the emblem changes.

## Guardrails (REDESIGN.md §5)
- Never break the single-file deploy.
- No `Math.random()` outside `src/rng.js`. All randomness goes through the seeded RNG.
- Every new string must be bilingual `{en, hi}`, or the content lint fails.
- Keep the `?debug` helpers working (`mp.jump`, `mp.roll`, `mp.seed`, `mp.setLang`, …
  in `src/main.js`) and extend them; don't remove any.
- Preserve `prefers-reduced-motion`, the aria-live card, the card's dialog role
  (a native `<dialog id="folio">` in `src/index.html`) and the Space-to-roll key.
- One phase per PR. `main` is live and must never be unplayable.
- Degrade gracefully and never show a blank card. A missing situation falls back to the
  story card, missing Hindi shows English and warns (`src/i18n.js`), and a missing sprite
  shows the emoji.
