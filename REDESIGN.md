# Moksha Patam — redesign plan

**For Claude Code.** Implement in phases, in order. Each phase ships to a live site.
Companions: `docs/CONTENT.md` (card content and art spec, Phase 2),
`docs/NARRATIVE.md` (narrative voice and the life account, Phase 3),
`docs/REFERENCE.md` (philosophy-to-mechanics mapping, historical board research, game
precedents), `docs/LANDSCAPE.md` (what else exists). Read this file first and
pull the reference when a phase points at it.

Baseline: single-file `index.html`, ~1300 lines, 110 squares, 11 ladders, 13 snakes,
English/Hindi, deployed at https://codebpr.com/moksha-patam/

---

## Contents

1. [What we are building and why](#1-what-we-are-building-and-why)
2. [Core mechanics](#2-core-mechanics)
3. [Architecture](#3-architecture)
4. [Phases 0 through 13](#4-phases)
5. [Guardrails](#5-guardrails)
6. [Known fixes to fold in](#6-known-fixes)

---

## 1. What we are building and why

### The problem with the current game

Snakes and ladders has no agency in it, and that was deliberate. The historical
*gyan chaupar* taught that your station is dealt to you by past karma. Snakes
outnumbered ladders about two to one to show that the good path is harder. The board
is a sermon about powerlessness, and a faithful port of it cannot also be a life
simulation.

The way through is that the darśanas disagree with each other about exactly this.
Mīmāṃsā holds that action produces result by a mechanical law (*apūrva*) needing no
god. Sāṃkhya holds that puruṣa never acts and the sense of agency is a
misattribution to prakṛti. Nyāya holds that saṃskāras cannot be perceived, only
inferred. Cārvāka denies karma and rebirth outright. Make the causal engine itself
pluggable and the disagreement becomes playable.

### The one-paragraph pitch

A life is a run. You are born with a disposition inherited from your last life and a
finite *āyus*. Each cycle you roll dice and **choose what to spend them on**: moving
up the board is only one option, and study, service, giving and practice are others.
Situations gate on who you have become, not on where you are. Actions leave
*saṃskāras* that bend your guṇa mixture, and karma accumulates in three doctrinally
distinct buckets that behave differently. Liberation is not a prize for a high score;
it is a gate that opens only when *bandha* approaches zero, so a player who maxes
every meter cannot finish. When the āyus runs out you face Yama, your ledger is read,
and you are reborn carrying what you built.

### Three things the research changed

**The die stays random; allocation becomes the choice.** Borrowed from *Citizen
Sleeper*: you see the dice before you commit them. Keeping the roll visible before
the decision is what turns randomness into planning. Movement becomes one way to
spend a die rather than the only thing a turn does. This is the single most important
mechanical change in the plan.

**Karma is three buckets, not one queue.** *Sañcita* (the accumulated store),
*prārabdha* (the portion allotted to ripen in this life), *āgāmi* (what you are making
now, which flows into sañcita for the next life). That is the classical three-fold
division and it maps onto a roguelike without distortion: save file, run seed, run
earnings. See `docs/REFERENCE.md §2`.

**Each school gets a different win condition, from doctrine.** Nyāya holds mokṣa to be
the absence of suffering, not bliss, and possible only after death, so under Nyāya you
cannot win while alive and you play for a clean death. Mīmāṃsā denied mokṣa for
centuries and treated svarga as sufficient, so under Mīmāṃsā square 110 is locked and
the goal is heaven. Śaṅkara treats the desire for mokṣa as itself a state of mokṣa, so
Advaita admits a win by recognition rather than arrival. These are not flavour text.
They are different games. See `docs/REFERENCE.md §3`.

### What we are not doing

Not moving off HTML. Nothing on the immersion list requires canvas-first rendering or
an engine, and the DOM gives us Devanagari text layout, selection, aria-live and a
file an agent can edit. The one thing genuinely out of reach is physically simulated
3D dice, and a CSS 3D-transform die gets most of the way there. Reassess at Phase 4,
not before.

---

## 2. Core mechanics

### 2.1 The cycle

A **cycle** is roughly a year of the life. Replaces the current turn.

```
ROLL      n dice, visible, where n falls with poor condition and old age
ALLOCATE  spend each die on one action slot:
            MOVE      advance the token by the die value
            STUDY     sattva up, opens śabda/testimony options later
            SERVE     dharma up, plants āgāmi
            GIVE      artha down, dharma up, clears bandha
            PRACTICE  guna shift toward sattva, builds the Yoga resource
            (slots are ashrama-dependent; see 2.4)
ENCOUNTER if you moved, the square resolves: Story (read) or Situation (choose)
RESOLVE   fire any prārabdha whose fuse expired this cycle
AGE       āyus decreases; crossing an ashrama boundary triggers a rite
DEATH     āyus exhausted or a fatal consequence → Yama → rebirth
```

Rolling and seeing before allocating is non-negotiable. If the die resolves at the
moment of choice, the planning disappears and we are back to the current game.

### 2.2 State tracks

**Guṇas** — `{sattva, rajas, tamas}`, three floats summing to 1. Character, not score.
Gates which options a situation shows you. Sāṃkhya and Yoga both hold that
impressions act on the guṇas, so the chain action → saṃskāra → vāsanā → guṇa shift →
what you can do next is doctrinally exact, not a borrowed RPG stat.

**Puruṣārthas** — `dharma`, `artha`, `kāma` as 0–100. Mokṣa is deliberately not a
meter. Both ends hurt: a gṛhastha at zero artha cannot support dependents, and a life
at zero kāma is a denial rather than a discipline. *Reigns* established that losing by
maxing a meter is what forces balance, and hoarding has to be punished or players
hoard.

**Karma** — three buckets, see `docs/REFERENCE.md §2`:

```
sancita   [seed]    carried across lives, persisted
prarabdha [seed]    allotted to this life at birth, fires on fuses
agami     [seed]    made this life, flows into sancita at death

seed = { id, source: squareId|actionId, fuse: {type:'cycles'|'stage'|'next-life', value},
         effect: {...}, visible: bool }
```

Visibility is set by the active law, not globally. Mīmāṃsā shows the whole queue with
exact numbers. Nyāya shows evidence and makes you infer (which is doctrinally right:
saṃskāras are inferred, never perceived). Cārvāka has no queue at all.

### 2.3 Bandha and the gate at 110

```
bandha = w1·attachment(artha) + w2·attachment(kama)
       + w3·identification_with_body + w4·unfired_agami_count
```

Reaching 110 is necessary and not sufficient. Arrive with bandha above threshold and
the gate does not open, the end screen says exactly why, and you are reborn. This
converts the game from accumulation to subtraction. It is the clearest statement the
game can make about what the word meant, and *Reigns* is evidence the shape works.

### 2.4 Ashramas as rule phases

Not costumes. Each stage changes the legal action slots.

| Stage | Squares | Rule change |
|---|---|---|
| Childhood | 1–20 | Few slots. Mostly MOVE. Choices are small and cheap. |
| Brahmacarya | 21–40 | STUDY unlocked, artha accumulation refused. |
| Gṛhastha | 41–60 | All slots. A per-cycle drain supporting dependents. The only stage that can GIVE at full value. |
| Vānaprastha | 61–80 | Meters can be given away, not gained. |
| Sannyāsa | 81–100 | Meters frozen. Nothing to spend, only to recognise. |
| Divine | 101–110 | No ladders reach here. You walk. |

### 2.5 Situations as storylets (QBN)

Architecture is quality-based narrative. A situation is available when its gate
passes; the player picks among what is available. Follow Emily Short's warnings:
surface *why* an option is absent ("tamas too high to sit still for this"), or players
lose the thread.

```
situation = {
  id, square|null, gate: {guna?, purushartha?, ashrama?, karma?, lives?},
  prompt: {en, hi}, source,
  options: [ { label:{en,hi}, require?, deltas, seeds[], move: 'ladder'|'snake'|'stay'|n,
               cost: cycles, outcome:{en,hi} } ]
}
```

**Snakes and ladders become outcomes of choices, not properties of squares.** Square
59 is Anger: you come home, the mongoose's mouth is bloody, the child is out of sight.
Strike (snake to 50, plus a remorse seed fusing in two cycles), look first (short
ladder), or freeze (costs years). Every existing snake and ladder already has a story
implying a decision, so this is mostly authoring.

### 2.6 The Darśana Codex

A separate, optional, growing reference that fills in as you meet things, modelled on
*Never Alone*'s cultural-insight track. Readable outside a game, linkable, shareable.
This is where the depth lives, which keeps the game loop from turning into a
textbook. Content spec in `docs/REFERENCE.md §5`.

Rule for tone: schools arrive as "someone standing on this square would have argued
about this," never as a syllabus entry. If a card starts reading like an encyclopedia,
cut it to the story and put the school in the chip.

### 2.7 The laws

Pluggable rule modules. Ship Mīmāṃsā first, then Cārvāka for contrast.

| Law | Win condition | What changes |
|---|---|---|
| Mīmāṃsā | **Svarga at 101, 110 locked** | Every consequence published before you choose. No hidden state, no grace. Deterministic and legible. |
| Cārvāka | Die well, no rebirth | No karma buckets, no next life, permadeath. One short life. Sharpest contrast, easiest second build. |
| Nyāya-Vaiśeṣika | **Cannot win while alive**; a clean death | Karma real but only inferable. You see smoke and infer fire. Partial information. |
| Yoga | 110 by nirodha | A depletable resource lets you cancel a die and act deliberately. Agency as trained capacity. |
| Sāṃkhya | 110, but you do not choose | The game allocates for you and narrates it back as prakṛti acting. Unsettling and correct. |
| Advaita | **Win by recognition, not arrival** | Late game the token, snakes and goal are revealed as one. Movement becomes identification. |
| Dvaita | 110 by grace | A prasāda counter sometimes overrides outcomes. Not earned, not predictable. |

Interface in §3.2. If it is right, a new school is about a hundred lines.

---

## 3. Architecture

### 3.1 Files

Keep the single-file deliverable, drop the single-file working format. Content is
about to grow five to ten times and the real cost is an agent making mistakes editing
a 400KB HTML file.

```
moksha-patam/
  index.html              built artifact, committed, still one file
  REDESIGN.md
  docs/REFERENCE.md
  src/
    main.js
    rng.js                seeded PRNG; the ONLY source of randomness
    state.js
    engine/
      cycle.js            the loop in §2.1
      karma.js            three buckets, fuses, firing
      gunas.js            samskara -> vasana -> guna math
      bandha.js           the gate
      qbn.js              storylet selection and gate evaluation
      laws/ index.js mimamsa.js carvaka.js nyaya.js yoga.js samkhya.js advaita.js dvaita.js
    render/
      board.js card.js meters.js log.js codex.js endscreen.js sprites.js camera.js
    audio/ engine.js drone.js
    i18n.js
  content/
    squares.json          current SQ / LADDERS / SNAKES / HEAVEN, lifted verbatim
    situations.json
    schools.json
    codex.json
  assets/ sprites.svg  textures/  audio/
  tools/
    build.mjs             inline everything -> index.html
    sim.mjs               headless N-life Monte Carlo
    lint-content.mjs      bilingual completeness, dangling gates, unreachable storylets
  tests/
```

### 3.2 The law interface

Get this right in Phase 0. The engine must never branch on `law.id`; if a law needs
behaviour the interface cannot express, extend the interface.

```
Law = {
  id, name: {en, hi},
  diceCount(state)          -> how many dice this cycle
  allocatable(state)        -> which action slots are offered, or null if the law allocates
  autoAllocate(rng, state)  -> used when allocatable() returns null (Samkhya)
  visibility(state, seed)   -> 'full' | 'evidence' | 'hidden'
  onAction(state, action)   -> {deltas, seeds[], move}
  fireKarma(state, seed)    -> effect
  winCheck(state)           -> {won: bool, kind: 'moksha'|'svarga'|'recognition'|'clean-death', reason}
  onDeath(state)            -> nextLifeSeed | null
  describe()                -> the card that explains this law before the player picks it
}
```

### 3.3 Determinism

Nothing calls `Math.random()` outside `rng.js`. The seed is part of game state and
shown in the UI so a life can be replayed and a bug reported with a seed.
`build.mjs` fails on a stray `Math.random`.

---

## 4. Phases

Every phase ships. The site is live; nothing lands on `main` broken. One phase per PR.

---

### Phase 0 — Foundation  ✅ SHIPPED
*No behaviour change at all.*

- Split `index.html` into the `src/` modules above.
- `tools/build.mjs` inlines back to one `index.html`.
- `rng.js` with a seeded PRNG (mulberry32 or sfc32), threaded everywhere.
- Lift `SQ`, `LADDERS`, `SNAKES`, `HEAVEN`, `STR` into `content/*.json`.
- Port `?debug` helpers; add `mp.seed`.
- `tools/sim.mjs` runs N headless games.

**Done when:** a fixed seed produces an identical move log before and after the split,
the built `index.html` plays identically, and `sim.mjs` reproduces the ~42-turn
average recorded in the README.

---

### Phase 1 — The reading game  ✅ SHIPPED
*Ships as a complete, much better version of the current game. The whole point of this
phase is that the content stops being a toast and becomes something you read.*

- **Clickable board.** Click any square to open its card. `labEls[n]` already exists.
- **Persistent cards.** Human turns: card stays until dismissed. CPU turns:
  auto-advance. Delete the fixed 1.1–3.4s timers.
- **Log to card.** Every log entry reopens its card. `state.log` already holds enough.
- **Card redesign as a pothi folio.** Landscape, string-hole, aged edge, real
  typographic hierarchy. The card is now the main reading surface and should look like
  a manuscript page rather than a notification.
- **One language at a time** with a per-card toggle, replacing the stacked `.tc`/`.tc2`.
  Keep both-at-once as an option for Hindi learners; it is a real use case but a bad
  default, because it costs half the card.
- **Typography.** A real Devanagari face (Tiro Devanagari Hindi for body) and a text
  face for English. Google Fonts, preloaded, with sensible fallbacks.
- **View Transitions API** for card open and close, so the card reads as an object
  rather than an overlay. Fall back cleanly where unsupported.
- **Sound, minimal.** Web Audio. Die rattle, card open, card close, a distinct timbre
  for snake and for ladder. Respect `prefers-reduced-motion` and add a mute that
  persists.
- **Depth setting.** Replace the Every/Special/Off card frequency with *Story* /
  *Story + school* / *Scholar*. Same squares, three reading depths.
- **Codex v1.** A panel beside Moves listing schools and sources, filling in as you
  encounter them. Content from `content/codex.json`, initially thin.
- **Source links.** Make the `src` line a destination, plus a one-line gloss the first
  time a source appears.
- **PWA.** Manifest, service worker, icons. Installable, offline, no browser chrome.

**Done when:** any square's card opens from the board and from the log, nothing
auto-dismisses while a human is reading, the game installs to a phone home screen and
runs offline, and a player who never rolls a die can still read the whole board.

---

### Phase 2 — The told board  ✅ SHIPPED
*Content and art. The full brief is `docs/CONTENT.md`; this is the summary.*

Phase 1 made the old content readable and no more. Measured against the shipped
`content/`, 43 of 110 squares still show a single old sentence at the default depth,
and about 26 lead lines are proverbs or rite descriptions with nobody in them.

- Rewrite the 26 flat lead lines as scenes with a named person and a turn.
- Write school voices for the 12 squares that have none and the 31 that have only a
  hidden `scholar` note.
- Fix the depth gating so no square can show a bare lead at default depth.
- Add Gārgī (square 79), the Nāsadīya Sūkta (107) and Ushasti Cākrāyaṇa (48).
- Make square 110 show six definitions of mokṣa side by side.
- Build the Basohli SVG sprite sheet, with the old emoji as fallback.
- Extend `lint-content.mjs`: fail on a square with no voice, a lead that names nobody,
  or any string missing its Hindi.

**Done when:** every one of the 110 squares names someone and carries a disagreement at
default depth, the lint passes clean, and deleting the sprite sheet falls back to emoji
without a blank square.

---

### Phase 3 — The lived board  ✅ SHIPPED
*Narrative voice. The full brief is `docs/NARRATIVE.md`; this is the summary.*

Phase 2 fixed what the cards say and left the grammar wrong. Every card's subject is
still the tradition ("In the Kauṣītaki the dying father sits facing his son"), so the
player reads *about* a text while a token moves nearby. The move log is already in the
player's life; the cards are not.

- A naming screen before the board, framed as the *nāmakaraṇa*: the player's name and
  gender. Gender is required because Hindi verbs agree with it.
- A `g()` helper in i18n, and Hindi authored to handle agreement.
- Schema: the Phase 2 lead becomes `mirror`; a new `moment` sits above it, saying what
  is happening to the named player right now. Additive, so no Phase 2 writing is lost
  and a square with no moment renders exactly as today.
- 110 moments, bilingual. Snakes and ladders first: those squares have the drama and
  are currently the most abstract things on the board.
- An authored `age` per square, so a life is legible.
- The voice deliberately breaks at 101–109 (nobody left to have a moment) and at 110.
- **The life account:** at the end of a game, the moments the player actually landed on,
  stitched into continuous prose. A short biography of someone who lived forty turns,
  built from data already in `state.log`. The most shareable thing the project can make.

**Done when:** every square outside the divine row opens with something happening to the
named player, no card's first sentence has a text or a school as its subject, a
female-named player's Hindi is correct throughout, and finishing a game produces a
readable life in both languages.

---

### Phase 4 — The painted board
*Purely presentational. No rules change. The sprite sheet itself ships in Phase 2;
this phase is everything around it.*

- **Texture.** Gyan chaupar boards were painted on cloth. Paper or pata grain, aged
  edges, slight warp. CSS plus one SVG turbulence filter.
- **Camera.** Gentle zoom and pan following the token, pulling back at ashrama
  transitions. Transform on a wrapper.
- **The ageing board.** Squares behind you desaturate toward sepia; squares ahead stay
  dim until reached. A filter per row. You cannot see the whole board from inside a
  life, which is both better-looking and the right idea.
- **Adaptive drone.** Tanpura under the game, keyed to ashrama: open in childhood,
  dense through gṛhastha, thinning through vānaprastha to a single sustained note in
  sannyāsa, silent at 110.
- Motion polish on the existing climb and swallow animations.

**Done when:** the drone changes audibly at each ashrama boundary, the board ages
visibly behind the token, and reduced-motion and mute both still work.

---

### Phase 5 — Life state

- `āyus`, guṇas, puruṣārthas in state; a meters panel.
- Ashrama rule phases from §2.4 (action slots gated by stage).
- The existing pixel-art stage change tracks āyus rather than board position.
- Still dice-and-move; no allocation and no choices yet.

**Done when:** a life can end by running out of years, and `sim.mjs` reports a lifespan
distribution.

---

### Phase 6 — Dice as currency
*The core mechanical change. Read §2.1 carefully.*

- Roll n dice, visible, before any decision.
- Action slots: MOVE, STUDY, SERVE, GIVE, PRACTICE, gated by ashrama.
- Dice count falls with age and poor condition.
- Moving up the board is now one option among several and has an opportunity cost.

**Done when:** a player can spend a whole cycle without moving, the board no longer
advances on its own, and `sim.mjs` shows a visible spread in how far players get by a
given age.

---

### Phase 7 — Situations

- `content/situations.json` and `engine/qbn.js`.
- Gate evaluation, with the gate surfaced in the UI when an option is withheld.
- Convert ten squares first, including at least three snakes and three ladders.
- **Any square without a situation falls back to its story card.** The game stays
  playable at every point during the content build.

**Done when:** ten squares offer choices, the fallback is invisible, no unreachable
situation exists (`lint-content.mjs`), and no option is obviously correct.

---

### Phase 8 — Karma

- Three buckets, fuses, deferred firing.
- `bandha` and the gate at 110.
- A karma panel whose visibility is set by the active law.

**Done when:** a seed planted at square 20 fires at square 60 with a card naming where
it came from, and a player can reach 110 and be refused with a legible reason.

---

### Phase 9 — Death and rebirth

- Yama's reckoning screen reading the ledger.
- āgāmi flows into sañcita; a slice is drawn as next life's prārabdha.
- `saṃskāra` persisted in localStorage: lives, traits, teachers met, carried debts,
  last guṇa mix.
- The three worlds: add regions below square 1 so a fall has somewhere real to go.

**Done when:** life two starts measurably different from life one and the difference is
legible to the player on the birth screen.

---

### Phase 10 — The laws

- Mīmāṃsā first (default), then Cārvāka, then the rest.
- A law-select screen that explains each in the player's own terms before they commit.
- Different win conditions per §2.7. These are the payoff of the whole design.

**Done when:** `sim.mjs` sweeps all implemented laws and reports liberation rate,
median lifespan and death-stage distribution per law, and the numbers differ in shape
rather than only in mean.

---

### Phase 11 — Historical boards

Board geometry becomes data. The variants are documented, not invented; see
`docs/REFERENCE.md §4`.

- 110-square modern board (current, default).
- 72-square Hindu board.
- 84-square Jain board.
- 101-square Sufi board ending at the throne.
- Historical rules worth restoring: squares that need an exact roll and cannot be
  passed; a snake on the final square that returns overreachers to the start; squares
  that must be passed in order; snakes outnumbering ladders roughly two to one.

**Done when:** board choice is a setting, the renderer handles non-10-wide grids, and
each board's rules load with it.

---

### Phase 12 — Parallel lives

- Multiplayer becomes four lives lived side by side rather than a race.
- End screen: guṇa trajectories plotted over time, choices made at shared squares,
  where each life ended.
- Keep the old race as a mode for a shorter game.

**Done when:** a four-player game produces one comparison screen worth screenshotting.

---

### Phase 13 — Content to full

- All 110 squares with situations where they earn one.
- Codex complete across schools, sources and figures.
- Target roughly 35 situations at two or three options each.

Note from *80 Days*: most playthroughs there reveal under ten percent of the text. A
single life should not see most of this content. That dissolves the volume problem,
because you are authoring breadth for replay rather than a script.

---

## 5. Guardrails

- Never break the single-file deploy. `index.html` stays the built artifact.
- No `Math.random()` outside `rng.js`. Build fails otherwise.
- Every new string bilingual, or `lint-content.mjs` fails.
- Keep and extend `?debug`: `mp.jump`, `mp.roll`, `mp.setLang`, plus `mp.seed`,
  `mp.law`, `mp.fire`, `mp.dumpKarma`, `mp.board`.
- Preserve `prefers-reduced-motion`, the aria-live card, `role="dialog"`, keyboard roll.
- Do not restyle the board geometry or the snake rendering in Phases 0–1. That art is
  finished work; Phase 2 is where it changes, deliberately.
- One phase per PR. No phase leaves `main` unplayable.
- Graceful degradation everywhere: missing situation falls back to story card, missing
  Hindi shows English and warns, missing sprite shows the old emoji. Never a blank card.

---

## 6. Known fixes

- README says `Jhooth · Fibbing` at square 19; code has `skt: "Asatya"`. Reconcile.
- Square 36, `tat tvam asi`, is where Vedānta splits three ways: Śaṅkara reads
  identity, Rāmānuja a mode of Brahman, Madhva re-splits the sandhi to *atat tvam asi*.
  One card carrying that disagreement does more than ten new narrative squares.
- The heavenly row 101–109 is the thinnest content on the board and sits at the climax.
  Either overlay the darśanas or give each devatā card a second line. It cannot stay a
  roll-call.
- Square 110 should show each school's own definition of mokṣa side by side. Ending on
  "these five all said you had arrived, and they meant five different things" is a
  better last beat than a trophy.
