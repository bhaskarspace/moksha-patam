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

**State:** Phases 0 to 11 have shipped. Phase 8 was Life State (REDESIGN.md §4): years lived are a clock of their own
(`src/engine/self.js`) that a snake never turns back, moments say their age through `{age}`, a life ends when its years
pass `SPAN` (110), and the life account (`src/engine/account.js`, pure) chooses each join by how a moment relates to the
last. Gunas, aims and the bhumika are in state and never shown as numbers. Phase 9 was Dice as currency: from 94
(`ENDGAME`) a player rolls two dice and moves by either, a sannyasin on 94–100 may sit the year out, and the spare die
is practice, which alone reaches turya. The full allocation loop was measured not worth building yet (REDESIGN.md
Phase 9). Phase 10 was Situations. A: ten story squares below 94 carry
`roll: { valence, faces, moment }` and tell their other moment by the face of the die moved by (`toldOn` in
`src/engine/turn.js`), recorded in `p.told` beside `p.life`; nothing is drawn and nothing moves. B: ten squares offer a
choice (`content/situations.json`, `src/engine/qbn.js`). `planTurn` stops at one and `resolveChoice` finishes it; an
option's move and years are shown, its `guna` and `aims` never, and it applies them through `grow()`. The years a choice
costs are the square again in the life, told "stay". The lint fails an option worth less that goes further or costs
more. Phase 10C was the cast (`src/engine/cast.js`): a moment says who it is about in `cast` and names them with
`{friend=the friend}` / `{friend:लेता|लेती}` (`castFill` in `src/i18n.js`, run before `fill`); names come from
`content/names.json` `cast`, drawn per life off a sequence of their own, and the account meets them, joins their
returns by name and closes on their fates. With `cast` taken away every account is Phase 10's exactly. Phase 11, The first five minutes,
has shipped (Bhaskar's three-player test is still to run): only a situation's card is modal and holds the game, a roll takes any
other card away, an ordinary landing is a line under the board (`src/render/landed.js`, `prefs.everyCard` for the old way),
a viewer's first life (`mp-lives`) shows the moment with the story behind one tap, and every mirror tells, on first
contact, that it is a story and who is in it (`content/bridges.json`, `whoOf` in `src/content.js`). The naming asks who is playing and names each person in turn. `?first` plays as
someone new. Then 12 Karma, 13 The door and the curse.
Phase 7 was The Exit (REDESIGN.md §4): Moksha is square 105 (`GOAL`), partway
along the divine row, while the board still ends at 110 (`TOP`); a roll bounces off `TOP` and can come back down onto the
exit. The rebirth snake falls from Brahma (108) to 1, only for a player climbing onto it and once per life, and a Shepard tone plays under the divine row
(`src/audio/shepard.js`). Phase 6 was The Card in Hand: the card opens collapsed (`src/render/card.js`), with an
illuminated frame (`frame.js`) and a bottom sheet below 768px (`sheet.js`).
- `GOAL` means the win and `TOP` means the board's extent. Use the right one; content moves by identity, never by index.
- A player's age is `p.years`, never `squareOf(p.pos).age`; the square's age is only the age its moment belongs to.
  The game is over when `state.over`, not when `state.winner` is set: a life can end without anyone winning.

## Commands
- `npm run build`: fails on any `Math.random` outside `src/rng.js` or on any content lint error.
- `npm test`: `node --test tests/*.test.mjs`
- `npm run lint`: content lint (`tools/lint-content.mjs`): Hindi, dangling ids, two voices per
  square, a name in every mirror (`content/names.json`), and the sprite palette. Phase 3 adds the
  moments: `{name}` in both languages, Hindi agreement through `{m|f}` choices, an age on every
  earthly square, and a `moments: n/109` burn-down line.
- `npm run format`: rewrites `content/*.json` one entry per line. Run it after editing content.
- `npm run sim [games] [players] [firstSeed] [--rules=brahmaloka] [--snake=HEAD:TAIL|none] [--span=N] [--spans=a,b,…]
  [--practice=off] [--endgame=N] [--pick=plain|bigger|first] [--roll=off] [--situations=off]
  [--policy=mixed|honest|dishonest]`:
  headless games, reporting median, p5, p95 and the share over 100 turns, and since Phase 8 the share of lives that run
  out of years, years lived, and the bhumika distribution. `--spans` sweeps the span of a life. Since Phase 9 also the
  99 → 61 loop, years sat out, and the share through the exit by 90; `--pick` plays the endgame's dice carelessly, to
  show what choosing is worth. Since Phase 10 also the same moment told four times or more; `--roll=off` takes the
  roll-dependent squares' other moments away, and must leave every other number as it was. `--policy` is how every
  computer chooses on a situation, and the report adds the square reached at fifty and seventy and the ledger (gunas,
  dharma, highest bhumika). Balance against the p95, the share over 100 and the liberation rate.
- `npm run smoke [-- --only=text]`: Playwright checks of the built page in a real browser (needs Chrome installed).
  `--only` runs just the checks whose names contain the text, e.g. `--only="Phase 6"`.
- `npm run golden [seeds]`: the built page and `sim.mjs` must produce the same move log.
- `node tools/accounts.mjs [seeds] [--root=<checkout>] [--cast=off] [--full]`: a sha256 per life account (both
  languages, both genders, and two unnamed computers per seed). Compare a run against a worktree of `main` with
  `--root` to prove a change leaves the prose alone; `--cast=off` takes the cast's names away.
- `npm run perf [--rate=4] [--query=quality=low]`: frame times on a throttled phone-sized page. Reports only;
  compare against a run on `main`.
- `node tools/icons.mjs`: regenerates `icons/`. Only needed when the emblem changes.

## Guardrails (REDESIGN.md §5)
- Never break the single-file deploy.
- No `Math.random()` outside `src/rng.js`. All randomness goes through the seeded RNG.
- Every new string must be bilingual `{en, hi}`, or the content lint fails.
- Keep the `?debug` helpers working (`mp.jump`, `mp.roll`, `mp.seed`, `mp.setLang`, `mp.years`, `mp.cast`, …
  in `src/main.js`) and extend them; don't remove any.
- The ageing paints only the art: labels, cards and clicks never dim (`tests/contrast.test.mjs` holds every
  label's contrast). Phase 5 colours are `--b-*` tokens only (lint). Never touch `G.state.rng` from sound or drawing.
- The card's × stays in every layout; closing is never gesture-only. Below 768px the card is a sheet whose gesture
  rule is in `sheet.js`: the sheet moves only when a touch can't be a scroll, decided when the touch starts.
- Preserve `prefers-reduced-motion`, the aria-live card, the card's dialog role
  (a native `<dialog id="folio">` in `src/index.html`) and the Space-to-roll key.
- One phase per PR. `main` is live and must never be unplayable.
- Degrade gracefully and never show a blank card. A missing situation falls back to the
  story card, missing Hindi shows English and warns (`src/i18n.js`), and a missing sprite
  shows the emoji.
