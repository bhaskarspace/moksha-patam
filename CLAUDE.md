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
- `docs/CONTENT.md`: the brief for the current phase (Phase 2).
- `docs/REFERENCE.md`: philosophy-to-mechanics mapping and the history of the board.
- `docs/LANDSCAPE.md`: comparable games.

**State:** Phases 0 and 1 have shipped. Phase 2, The Told Board, is next.

## Commands
- `npm run build`: fails on any `Math.random` outside `src/rng.js` or on any content lint error.
- `npm test`: `node --test tests/*.test.mjs`
- `npm run lint`: content lint (`tools/lint-content.mjs`): Hindi, dangling ids, two voices per
  square, a name in every lead (`content/names.json`), and the sprite palette.
- `npm run format`: rewrites `content/*.json` one entry per line. Run it after editing content.
- `npm run sim [games] [players] [firstSeed]`: headless games (one player averages about 42 turns).
- `npm run smoke`: Playwright checks of the built page in a real browser (needs Chrome installed).
- `npm run golden [seeds]`: Phase 0 move-log equivalence against commit `fb0bc2a`.
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
