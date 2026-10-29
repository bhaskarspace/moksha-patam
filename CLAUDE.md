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

**State:** Phases 0 to 16 have shipped. Phase 8 was Life State (REDESIGN.md §4): years lived are a clock of their own
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
has shipped, and Bhaskar's three-player test is done: only a situation's card is modal and holds the game, a roll takes any
other card away, an ordinary landing is a line under the board (`src/render/landed.js`, `prefs.everyCard` for the old way),
a viewer's first life (`mp-lives`) shows the moment with the story behind one tap, and every mirror tells, on first
contact, that it is a story and who is in it (`content/bridges.json`, `whoOf` in `src/content.js`). The naming asks who is playing and names each person in turn. `?first` plays as
someone new. Phase 12, Karma, has shipped (below). Phase 13, The painted cloth, has shipped: the board's look is data
(`content/boards.json`: palette, grounds, snake pigments, ladder, border, superstructure; the build writes the palette into
`styles.css` as `--b-*` tokens), the snakes are painted nāgas, and 43 squares carry vignettes (the 34 snakes, ladders and divine
row, and the nine fables) drawn by `node tools/vignettes.mjs` from `art/vignettes.mjs` (docs/CONTENT.md §7). The first impression
is the veil; `?look=first|asrama` only under `?debug`. A reckoning takes the throw a 6 would have given. Dark is `prefs.theme`,
not the system's. Phase 14, The door and the curse, has shipped: a sannyāsin the door refused may sit at 105 a year at a time and is
examined (`examineOf` in `src/engine/karma.js`, `content/door.json`): one question per debt, by its vice; the life passes if it
climbed the healing ladder after the debt was planted, or pays in penance by the debt's weight, and the door opens when
nothing is owed (`plan.exam`, `p.sittings`). The door is public: anyone's arrival, refusal, sitting or death there is the line
under the board (`landDoor` in `src/render/landed.js`), the one place a computer's turn writes it; a person's sitting is a
modal card (`openExam`). The closed door and the wheel of time are drawn on 105 (`src/render/door.js`). Landing exactly on 110
is Śiva's snake (`plan.fellBy`, `sivaPath` in `src/render/ground.js`), the second form of the fall. One curse per life
(`content/curses.json`, `src/engine/curse.js`) is said early, on the person's line, and closed in the account. Phase 15, The witness, has
shipped: on the five ego tests (`ego` in `content/situations.json`: 49, 54, 55, 56, 59) choosing anything but the lower
option throws the ego's die (`egoThrow`, a sequence of its own); the ego owns faces by the gunas (`egoFaces`), shown on
the card before the choice, and on one of them the life takes the lower option, all of it. `p.witness` records what was
chosen and taken; the account says a rebellion as its join, and a cast member who saw a situation (`witness`) returns
knowing what the life did. Phase 16, Death and rebirth: the ledger's top tier kills (`p.death`: ledger, years or door;
the form by age, never by the vice), penance is two years a weight and a weight-three debt no penance pays; the end of a
life is read three ways, the book, the path and the mirror (`src/render/life.js`, `src/engine/mirror.js`); a named
person's ended life is kept (`mp-samskara`, `src/engine/samskara.js`) and Be born again begins the next from it, which
dreams of the last; a death by ledger is first born an animal (`rules.law = "animal"`, `src/engine/animal.js`). Play
again starts clean. The death's form is by years: accident to 50, calamity 51–68, illness from 69. Its follow-up
gives every stage past the child a female and a neutral figure by `p.gender` (`src/render/art.js`, pure), Hindi stage
names that agree (`hiF`), and the interlude its animal's own sprite; under ?first the saṃskāra is kept in memory only. Next is 17, The laws (REDESIGN.md Phases 17–20).
Phase 7 was The Exit (REDESIGN.md §4): Moksha is square 105 (`GOAL`), partway
along the divine row, while the board still ends at 110 (`TOP`). Since Phase 12 nothing above the exit turns back: past 105 the
heavens (106–110) are walked, and the throw that would pass `TOP` is the fall, which ends the life (`plan.fell`, `p.fell`;
`gone(p)` in `src/engine/turn.js` is dead or fallen). It is never a respawn: the account closes on `lifeEndFell`, and it counts in
`mp-lives` like a death. The Brahma snake (108 → 1), `p.hasFallen` and the Brahmaloka rule are retired; the fall's card is `FALL`
in `content/squares.json`, shown on 110. A Shepard tone plays under the divine row and keeps rising through 106–110; the fall is
its only resolution (`src/audio/shepard.js`). Phase 12's second step is the ledger (`src/engine/karma.js`, pure): a situation's
least-worth options carry a `seed` (`content/situations.json`: `fuse` in years, `weight` 1–3, `holds` a snake head, `debt` and
`reckoning` text) that is planted in `p.karma.agami`, ripens into `prarabdha` when the years reach `at + fuse`, and is fired by the
omen: a 6 among the dice (never a 1), on 1–100 or at 105, at a chance rising toward the exit, drawn off a sequence of its own so
the dice never change. What it costs is a fixed function of the ledger (`reckonOf`): nothing, years, a holding (`p.held`), then
back down the board; the death tier is only reported (`wouldDie`) until Phase 16. The reckoning's card is modal. The door at 105
refuses a life carrying any unmet debt, or artha/kāma at `ATTACHED` (`refusalOf`, `plan.refused`, `p.door`), in words; the
player stays on 105 and the next throw goes into the heavens. Each refused arrival is kept in `p.refusals` and told in the
account, and a fall closes on the debts still carried, in the door's words (`carryIn`). Unmet debts go to `sancita` when a life ends, recorded only. The
buckets are never numbers: "debt" is the only player-facing word, and the scholar depth alone shows the ledger
(`src/render/ledger.js`). The computer ranks its dice by where they land before the omen, so it never sees a reckoning coming. Phase 6 was The Card in Hand: the card opens collapsed (`src/render/card.js`), with an
illuminated frame (`frame.js`) and a bottom sheet below 768px (`sheet.js`).
- `GOAL` means the win and `TOP` means the board's extent. Use the right one; content moves by identity, never by index.
- A player's age is `p.years`, never `squareOf(p.pos).age`; the square's age is only the age its moment belongs to.
  The game is over when `state.over`, not when `state.winner` is set: a life can end without anyone winning.

## Commands
- `npm run build`: fails on any `Math.random` outside `src/rng.js` or on any content lint error.
- `npm test`: `node --test tests/*.test.mjs`
- `npm run lint`: content lint (`tools/lint-content.mjs`): Hindi, dangling ids, two voices per
  square, a name in every mirror (`content/names.json`), the sprite palette, and (since Phase 15) no U+FFFD replacement
  character anywhere in `content/*.json`. Phase 3 adds the
  moments: `{name}` in both languages, Hindi agreement through `{m|f}` choices, an age on every
  earthly square, and a `moments: n/109` burn-down line.
- `npm run format`: rewrites `content/*.json` one entry per line. Run it after editing content.
- `npm run sim [games] [players] [firstSeed] [--span=N] [--spans=a,b,…]
  [--practice=off] [--endgame=N] [--pick=plain|phase9|bigger|first] [--roll=off] [--situations=off]
  [--policy=mixed|honest|dishonest]`:
  headless games, reporting median, p5, p95 and the share over 100 turns, and since Phase 8 the share of lives that run
  out of years, years lived, and the bhumika distribution. `--spans` sweeps the span of a life. Since Phase 9 also the
  99 → 61 loop, years sat out, and the share through the exit by 90; `--pick` plays the endgame's dice carelessly, to
  show what choosing is worth. Since Phase 10 also the same moment told four times or more; `--roll=off` takes the
  roll-dependent squares' other moments away, and must leave every other number as it was. `--policy` is how every
  computer chooses on a situation, and the report adds the square reached at fifty and seventy and the ledger (gunas,
  dharma, highest bhumika). Since Phase 12 also how lives end (liberated, years ran out, fell), lives per liberation, turns
  spent in 106–110 and a square at or above 94 landed on four times or more; `--pick=phase9` plays the endgame by Phase 9's
  choice. Since Phase 12's ledger also debts planted and left unmet, the omen (6s with a ripe debt, reckonings, the firing
  share by band of square), the severity tiers with would-be deaths by age, and the door's arrivals and refusals. Since
  Phase 14 also the fall split (past 110, Śiva's snake), refusals per life and the share who could sit, the examination
  (lives that sat, years at the door, debts answered vs paid in penance, through the door, deaths at the door) and the
  curse closed by landing vs not; `--curse=off` draws no curse. Since Phase 15 also the ego's throws and rebellions a
  life, the lives that rebelled, and both by guna band; `--ego=off` throws no die, and gives back the numbers before it.
  Since Phase 16 also deaths by cause (ledger, years on earth, years at the door) and the ledger's by age and form;
  `--death=off` reports the death tier only, `--penance=N` is the years a unit of weight costs at the door (2), and
  `--unpaid=N` the weight from which only the book answers a debt (3). `--lives=N` plays each seed as one soul's lives
  instead (born of the last through `soulOf`/`bornOf`, a death by ledger's animal interlude between), and reports
  liberation by life, lives per liberation, the rebirth rate and the interludes per hundred lives.
  Balance against the p95, the share over 100, liberation per life and lives per liberation.
- `npm run smoke [-- --only=text]`: Playwright checks of the built page in a real browser (needs Chrome installed).
  `--only` runs just the checks whose names contain the text, e.g. `--only="Phase 6"`.
- `npm run golden [seeds]`: the built page and `sim.mjs` must produce the same move log.
- `node tools/accounts.mjs [seeds] [--root=<checkout>] [--cast=off] [--curse=off] [--full]`: a sha256 per life account (both
  languages, both genders, and two unnamed computers per seed). Compare a run against a worktree of `main` with
  `--root` to prove a change leaves the prose alone; `--cast=off` takes the cast's names away. `--tag` marks each game that
  went above the exit (`above`) or that the ledger touched (`karma`: a reckoning, a refusal, or a debt carried within a throw
  of the door), or whose account tells the door (`door`: a refusal, or a fall carrying a debt), or that carries a curse (`curse`), or in which the ego threw or a cast return told what it witnessed (`witness`), or in which the death tier came or someone sat at the door (`death`), or whose mirror asks first about a rebellion (`mirror`, which never changes the account);
  every untagged account must match. With `--curse=off` the curse is never drawn. `--lives=2` also hashes each named life's
  next one (`rebirth`), and before it the animal interlude a death by ledger is owed (`animal`): a first life never reads
  saṃskāra, so every line without `rebirth` must match.
- `npm run perf [--rate=4] [--query=quality=low]`: frame times on a throttled phone-sized page. Reports only;
  compare against a run on `main`.
- `node tools/icons.mjs`: regenerates `icons/`. Only needed when the emblem changes.
- `node tools/vignettes.mjs [squares…]`: draws the scenes in `art/vignettes.mjs` into `assets/sprites.svg` (`sq-N`, `class="vg"`).
  Run it after editing a scene or a part, then build.

## Guardrails (REDESIGN.md §5)
- Never break the single-file deploy.
- No `Math.random()` outside `src/rng.js`. All randomness goes through the seeded RNG.
- Every new string must be bilingual `{en, hi}`, or the content lint fails.
- Keep the `?debug` helpers working (`mp.jump`, `mp.roll`, `mp.seed`, `mp.setLang`, `mp.years`, `mp.cast`, …
  in `src/main.js`) and extend them; don't remove any. Phase 12 adds `mp.fire()` (the next turn's omen fires on the
  current player's oldest debt, whatever is rolled), `mp.dumpKarma(i)` and `mp.plant(n, id)`. Phase 13 adds `mp.look(x)`. Phase 14 adds `mp.door()` (the current player at 105,
  refused, a sannyāsin), `mp.examine(i)`, `mp.curse(id)` and `mp.siva()` (the next throw lands on 110). Phase 15 adds `mp.ego(faces)` (the faces the ego owns on its next
  throw: `mp.ego()` all six, so the life rebels; `mp.ego([])` none). Phase 16 adds `mp.die(form)` (the next turn's omen is the
  death tier for the current player, in that form: accident, calamity or illness), `mp.samskara(obj?)` (the saṃskāra store:
  read, replace, or `null` to empty), `mp.dream(l)` (the account of a life two born of the current life, played by a computer)
  and `mp.animal(kind)` (an animal interlude for the current person, at once: tortoise, jackal, mongoose, cat or lion).
  Its follow-up adds `mp.sprites()` (every figure, by gender, and the animals, side by side on every band's ground) and
  extends `mp.sprite(stage, color, frame, gender, animal)`.
- No physics on any card. "Debt" is the only word a player sees for a seed, and the ledger's buckets, weights, fuses
  and chances are never shown as numbers. The 1 is the threshold face and the 6 is the world's (`tests/faces.test.mjs`).
- Never use `unshift` on anything but the log: `tools/golden.mjs` records every `unshift` of an entry as logged.
- The ageing paints only the art: labels, cards and clicks never dim (`tests/contrast.test.mjs` holds every
  label's contrast). Phase 5 colours are `--b-*` tokens only (lint), and since Phase 13 their values live only in
  `content/boards.json`. No gradient but the gold (lint). Never touch `G.state.rng` from sound or drawing.
- Moksha keeps ॐ on the board; its vignette is the card's alone. Every vignette stroke is 1.25 in a 48 viewBox (lint).
- The card's × stays in every layout; closing is never gesture-only. Below 768px the card is a sheet whose gesture
  rule is in `sheet.js`: the sheet moves only when a touch can't be a scroll, decided when the touch starts.
- Preserve `prefers-reduced-motion`, the aria-live card, the card's dialog role
  (a native `<dialog id="folio">` in `src/index.html`) and the Space-to-roll key.
- One phase per PR. `main` is live and must never be unplayable.
- Degrade gracefully and never show a blank card. A missing situation falls back to the
  story card, missing Hindi shows English and warns (`src/i18n.js`), and a missing sprite
  shows the emoji.
