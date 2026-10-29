> - *Balance.* `npm run sim 20000 1`, `main` → this phase, by how the computers choose on a situation (`--policy`):
>
>   | | honest | mixed (default) | dishonest |
>   |---|---|---|---|
>   | median turns / p95 | 26 → 26 / 44 → 44 | 29 → 28 / 48 → 48 | 30 → 30 / 50 → 50 |
>   | liberation per life | 46.6% → 46.9% | 27.6% → 39.8% | 13.6% → 29.0% |
>   | lives per liberation | 2.14 → 2.13 | 3.63 → 2.52 | 7.36 → 3.45 |
>   | the fall (past 110 / Śiva's snake) | 49.5% → 49.2% (45.8 / 3.4) | 64.4% → 51.2% (47.9 / 3.3) | 67.6% → 49.1% (45.8 / 3.2) |
>   | years ran out | 3.9% → 3.9% | 8.1% → 9.1% | 18.8% → 21.9% |
>   | refusals a life (could sit) | 0.003 (100%) | 0.141 (98.2%) | 0.216 (96.0%) |
>   | lives that sat at the door | 0.3% | 13.4% | 19.6% |
>   | through the door / died there | 0.3% / 0.0% | 12.1% / 0.6% | 15.4% / 1.2% |
>
>   Over 100 turns stays 0% throughout. Under mixed, the years at the door: median 2, p95 5, max 15; the book answered 583
>   debts and 2,213 were paid in penance. Curses closed by landing 77.9%, the other way 22.1%. A square at or above 94
>   landed on four times or more rose from 0% to 3.6%, because the years sat at 105 count. Liberation stays ordered honest >
>   mixed > dishonest, and `tests/balance.test.mjs` holds it so. The dishonest life gains most: penance pays every debt
>   within three years, so the door lets it through. What penance costs is Phase 16's (recorded there).
# Moksha Patam — redesign plan

**For Claude Code.** Implement in phases, in order. Each phase ships to a live site.
Companions: `docs/CONTENT.md` (card content and art spec, Phase 2),
`docs/NARRATIVE.md` (narrative voice and the life account, Phase 3),
`docs/BOARDCRAFT.md` (board design review and the evidence behind Phase 4),
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
4. [Phases 0 through 20](#4-phases)
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

### 2.3 Bandha and the gate at the exit

```
bandha = w1·attachment(artha) + w2·attachment(kama)
       + w3·identification_with_body + w4·unfired_agami_count
```

Reaching the exit is necessary and not sufficient. Arrive with bandha above threshold
and the gate does not open, the end screen says exactly why, and you are reborn. From
Phase 7 the exit is square **105**, not the top of the board. This
converts the game from accumulation to subtraction. It is the clearest statement the
game can make about what the word meant, and *Reigns* is evidence the shape works.

Phases 4 and 7 lay the groundwork: once the exit sits at 105 a player can pass straight
over liberation without taking it. From Phase 12 (decided 20 Oct) nothing above 105 turns
back — the heavens are walked and the throw past 110 ends the life — so passing the exit is
already the wheel before the gate exists; the gate only has to supply the reason.

### 2.4 Ashramas as rule phases

Not costumes. Each stage changes the legal action slots.

| Stage | Squares | Rule change |
|---|---|---|
| Childhood | 1–20 | Few slots. Mostly MOVE. Choices are small and cheap. |
| Brahmacarya | 21–40 | STUDY unlocked, artha accumulation refused. |
| Gṛhastha | 41–60 | All slots. A per-cycle drain supporting dependents. The only stage that can GIVE at full value. |
| Vānaprastha | 61–80 | Meters can be given away, not gained. |
| Sannyāsa | 81–100 | Meters frozen. Nothing to spend, only to recognise. |
| Divine | 101–110 | No ladders reach here. You walk. Past 105 nothing turns back; the throw past 110 ends the life (Phase 12). |

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

### Phase 4 — Board craft  ✅ SHIPPED
*Rules and reading, not art. Comes from `docs/BOARDCRAFT.md`, which analysed the board
against the one quantitative study of historical gyan chaupar boards
(arXiv:2304.14486, 100,000 simulated games per board, every element measured by
ablation). Small, independent, and it should land before the art work.*

**1. Make passed squares visible.** The real design flaw, and it is not about snakes.
A ~40-turn game at ~3.5 squares a turn lands on roughly 30 of 110 squares, so about
70% of the writing is never seen in a given playthrough — and Phases 2 and 3 just added
a moment, a mirror and two school voices to every one of them. Have the move log name
what the token passed through ("passed: The chariot · Salt in water · Banyan seed"),
each name opening its card. A player then meets a hundred squares per game instead of
thirty. Cheapest change available and it compounds with every word already written.

**2. Replace the exact-roll stall with bounce-back, and put the cycle in the divine
row.** The win square does **not** move. An earlier draft of this plan proposed moving
it to 104 with an overshoot zone above; that was written without checking what occupies
those squares and it collides with content. Squares 101–109 are nine gods, each with
Phase 2 and 3 writing, a sprite and readings, and 110 is the Mokṣa card carrying the six
definitions. Nothing coherent sits *above* liberation, so there is no overshoot zone to
build up there.

Two changes instead, which get the same result with no content moved:

*Bounce-back.* A roll that would pass 110 carries the token to 110 and then back down by
the remainder. One rule, it removes the exact-roll stall completely, and nothing else on
the board changes. A player at 107 who rolls 5 lands on 108, not nowhere.

*One snake at 109 → 81.* **A snake falling out of a god-realm is directly attested**,
and in a stronger form than this:

- Some boards carried a rule that **reaching Brahmaloka early was not enough: the player
  then had to descend a snake to *pṛthvī*, earth, at least once** before finishing.
- A **snake's head on the final square returned the player to the start**, described as
  the punishment for overreaching, and tied to where Vaikuṇṭha sat.
- On the 72-square Johnson board (Gerald Robert Dampier, *North Indian Notes and Queries* vol. 5, 1895, pp. 25–27, ed. William Crooke), the win is Vaikuṇṭha, reached by the
  Bhakti ladder at 54. **Square 72 carries a long snake back to earth, triggered when a
  throw goes beyond the winning square 68**, landing the player on 51, "Darkness".
  *Correction:* square 72 is labelled **Love of Violence**, a vice, not a heaven — Dampier
  himself remarks that it is unclear why it should lead to Darkness. So this board
  supports the *mechanic* (overshoot the win, land above it, take a long fall) but not the
  theming. The warrant for falling out of a god-realm is the Brahmaloka rule above, which
  is independent of it.

Worth noting what that last one implies about the architecture. On the historical boards
the winning square sits a few steps *before* the end, and the squares above it are a trap.
This board uses the modern arrangement, goal on the last square, with Indian content on
it. That is a fine choice and not one to unpick now, but it means the divine row is
currently a processional corridor where the sources made it a hazard.

The doctrine is the same either way: svarga is a reward and rewards are finite.
*Kṣīṇe puṇye martya-lokaṃ viśanti*, "when their merit is exhausted they enter the world of
mortals again" (Gītā 9.21). The Indra card at 101 already says heaven is the fruit of good
deeds and not the final goal; this makes the board say it too. Falling from 109, one
square below liberation, through Śiva who dissolves what binds, back to the start of
Sannyāsa, is a better destination than the historical board's "Darkness" and about as
exact as a snake can be.

*Optional, and worth measuring before adopting:* the Brahmaloka rule can be implemented
literally. Set a `hasFallen` flag when a player takes the 109 snake, and let 110 open only
once it is true, so the first arrival at liberation always bounces and falls. This
guarantees the snake fires rather than leaving it to chance, and it is the attested rule
rather than an invention. It also forces at least one more circuit, so it is a real cost
to game length. Ship the plain version first, measure, then try this behind a flag.

It also fixes the dead end-game. Squares 94–110 currently hold one snake between them, so
the climax is a victory lap. With 109 live the divine row becomes the most dangerous
stretch on the board, which is correct: the last thing to let go of is the reward for
having let go.

**Tuning belongs to the sim, not to this document.** 109 → 81 is a long fall from a square
bounce-back makes easy to hit. If median game length jumps badly, try 107 → 81, or keep
109 and shorten the fall to 95. Report before and after numbers and decide on the
evidence.

> **Shipped, then fixed. Settled at 109 → 101.** Phase 4 first shipped 109 → 95 and the
> tail was bad: median 49, p95 128, 11.1% of games over 100 turns, max 427, against 3.3%
> on the Milton Bradley board. A sweep with `npm run sim --snake=HEAD:TAIL` found a cliff
> between 101 and 95, not a bad constant:
>
> | snake | median | p95 | over 100 | max |
> |---|---|---|---|---|
> | none | 38 | 78 | 1.3% | 204 |
> | 109 → 105 | 38 | 78 | 1.2% | 202 |
> | **109 → 101** | **41** | **82** | **1.7%** | **204** |
> | 109 → 95 | 49 | 128 | 11.1% | 427 |
> | 107 → 95 | 46 | 112 | 7.4% | 404 |
> | 109 → 81 | 58 | 177 | 21.9% | 532 |
>
> Landing at 101 keeps the player inside the divine row, nine squares to re-climb.
> Landing at 95 drops them below the threshold at 100, and the re-climb is fifteen squares
> through a stretch with no ladders where they can be caught again: a loop at the climax.
> 109 → 101 costs three turns of median and removes the tail, and it reads better — the
> fall goes from Śiva's realm to Indra's, highest heaven to lowest, landing on the card
> that already says svarga is the fruit of good deeds and not the final goal.
>
> **An earlier draft of this note recommended capping the fall at once per life instead.
> That was wrong and is superseded.** Shortening the fall solved it; the cap was never
> needed and remains untested.
>
> **The `brahmaloka` rule stays optional and off.** It is the mandatory-descent rule (110
> shut until the player has fallen once), and with the 101 snake it is cheap — median 44,
> p95 86, 2.1% over 100. But it is not needed: measured over 20,000 games, **the snake
> already fires in 66.5% of games, a mean of 1.97 falls per game.** The historical
> Vaiṣṇava board's equivalent fired in about 83%, so the texture is already right.
> Forcing it would buy the remaining third of games a toll booth, and the fall reads
> better as something that happened to you than as a gate everyone must pass.

**3. Say when the remedy is one step away.** The five snake-to-ladder pairings need the
player to land on the snake head and *then* roll exactly 1, so the board's signature
idea fires about one time in six. Moving the tail onto the ladder foot does not fix it,
because ladders trigger on landing and the player would bounce straight back up. Instead
let the card say it: at square 22, the ladder of Guru-bhakti is one step above you.
Costs nothing and turns a mechanic that rarely fires into a moment that always lands.

**4. Report median, not mean.** The README quotes "about 42 turns". These distributions
are heavily right-skewed — the Milton Bradley board is mean 40.1, median 33, max 318,
with 3.3% of games over 100 turns — and the tail is what players experience as a
problem. `tools/sim.mjs` should report median, 5th and 95th percentile, and the share of
games over 100 turns. Balance against the 95th percentile from here on.

**5. Fix the README's snake/ladder claim.** "Snakes outnumbered ladders about two to
one" is folklore. The documented boards give the Jaina 84 board 15 ladders to 9 snakes,
the Vaiṣṇava 72 board 10 to 10, and the Mughal board 17 to 13. Every pre-modern board on
record is balanced or ladder-heavy; this board at 11:13 is more punishing than any of
them, including the modern commercial one. **Keep the counts** — 13:11 is a defensible
thesis — but state it as a choice rather than a restoration.

**Deliberately not in this phase:** the ablation harness, and the cowrie-shell
randomizer. The randomizer is in Phase 18 and the harness in Phase 20; the reasoning is in `docs/BOARDCRAFT.md §4, §6`.

**Done when:** a player can open any square the token passed over, no game can stall on
an exact roll, the divine row can be fallen out of, the five paired snake tails announce
their ladder, `sim.mjs` reports median and 95th percentile before and after, and the
README no longer claims the snake-heavy board is the historical one.

---

### Phase 5 — The painted board  ✅ SHIPPED
*Purely presentational. No rules change. The sprite sheet itself ships in Phase 2;
this phase is everything around it.*

> **Shipped, with these decisions.**
> - *What ages:* only the paint. One canvas sits between the art and the labels and washes each square in palette colours. Numbers, names, clicks, keyboard focus, cards and the log are never dimmed. The row filter proposed below was not used: CONTENT.md §7 forbids filters on the sprites, and the ages are per square anyway. Each wash pushes a square away from its ink colour, so a label's contrast can only rise or hold (`tests/contrast.test.mjs`).
> - *Whose age:* all the lives at once. Sepia is what every player has left behind, keyed to the youngest player. Dim is what no player has reached, keyed to the oldest. The squares between stay in full colour. The drone follows whoever is furthest on. `lens(state, i)` in `render/age.js` already takes one player's index, for Phase 19.
> - *Ages vs position:* every earthly square's age never decreases along the board, so which squares count as "behind" is the same either way. Age decides only how fast a square fades, measured in years.
> - *Performance:* the turbulence filter is drawn into a bitmap once. When it was a background inside the zoomed layer, it ran again on every zoom and cost frames of up to 430 ms at 4× throttle. With the bitmap, the branch's longest frames match `main` (`npm run perf`). On a weak device the camera goes first, then the motion extras, then the grain. The ageing is never dropped.
> - *Sound:* the drone is synthesised, about 6 KB unminified. Audio starts only from a gesture and never while muted. Muting suspends the context. Hiding the tab suspends it, and showing the tab resumes it.

- **Texture.** Gyan chaupar boards were painted on cloth. Paper or pata grain, aged
  edges, slight warp. CSS plus one SVG turbulence filter.
- **Camera.** Gentle zoom and pan following the token, pulling back at ashrama
  transitions. Transform on a wrapper.
- **The ageing board.** Squares behind you desaturate toward sepia; squares ahead stay
  dim until reached. A filter per row. You cannot see the whole board from inside a
  life, which is both better-looking and the right idea. Phase 3 shipped an authored
  `age` on every square, so this keys off real ages rather than board position: the
  sepia should track how old the player is, not how far they have walked.
- **Adaptive drone.** Tanpura under the game, keyed to ashrama: open in childhood,
  dense through gṛhastha, thinning through vānaprastha to a single sustained note in
  sannyāsa, silent at 110.
- Motion polish on the existing climb and swallow animations.

**Done when:** the drone changes audibly at each ashrama boundary, the board ages
visibly behind the token, and reduced-motion and mute both still work.

---

### Phase 6 — The card in hand  ✅ SHIPPED
*The card is the thing players actually read, and on a phone it is currently broken.
Measured at 375×812: the card fills the whole screen and clips its own content — the
scholar paragraph on square 34 is cut off mid-sentence by the footer bar. Fix the reading
experience before the game gets more complicated.*

> **Shipped, with these decisions.**
> - *The bug:* the text did scroll, but a phone draws no scrollbar and nothing else showed there was more, so the footer seemed to cut the scholar note mid-line. Now the text fades at its lower edge whenever there is more below. A smoke sweep of all 110 squares, at three screen sizes, both languages, both-languages mode, every depth, collapsed and opened, checks that the last line clears the footer. On `main` it fails.
> - *Depth:* every card opens collapsed. Depth now decides what opening it further shows. At *Story* there is no toggle. At *School* it shows the voices, and the source's gloss on first meeting. At *Scholar* it adds the note, the people and the gloss every time. Opening is a property of the open card, not of one square: it holds through paging, the Codex and every roll from the card, and resets when the card closes, so a scholar taps once per sitting. 110's six views are part of its story at every depth. A bare citation stays under the mirror. Codex entries behind the toggle count as met only once it is opened.
> - *Frame:* one frame for every square, drawn in the sprite's own units, so its lamp-black lines have the sprites' 1.25 weight at any size. The frame is a vermilion band strung with shell pearls, corners, a cusped arch and one beetle-green jewel. The arch's field and corners follow the kind of square, and the colours are the `--b-*` tokens only (lint and `tests/frame.test.mjs`). The icon is 5× on a wide screen and 4× on a phone, where it stands at the head of the text like an illuminated initial.
> - *Sheet:* below 768px the card has two heights. Half is measured so the whole board shows above it, with the page scrolled to put the board at the top. Full is the height of the screen. The grip is a button as well as a handle. The sheet moves only when a touch can't be a scroll, decided when the touch starts: from the top strip or the footer it always drags; from the text, down drags only if the text was at its top, and a scroll never turns into a drag partway through. The × moves to the footer on a phone. Under reduced motion the sheet appears and goes without moving.
> - *Roll from the card:* the card's Roll is for the next person to roll, counting on from the turn under way. Pressing it means the card stops holding the game up: a computer's turn plays on the board and is only noted on the card, and the reader's own landings turn the leaf in place. On a snake or a ladder the card stays on that square, and the token moves after a short reading beat. The tail's card is not opened, as before.

**1. Progressive disclosure.** The card opens at story depth: frame, moment, mirror, and
nothing else. The school voices and the scholar note collapse behind one tap.

The scholarly register is not spread through the card — it is entirely those two blocks.
The moment ("{name} is nineteen and waits three days outside an office for an answer")
and the mirror ("Naciketa waited three days at Death's door") are already story. So this
one change fixes both complaints at once: too much text, and too scholarly. `prefs.depth`
stays as the global setting for what the *expanded* state shows; this makes the collapsed
state the opening position regardless of it.

**2. The illuminated frame.** "More image" cannot mean scaling the sprite. It is a 24×24
icon with no detail to give and it will look crude at 200px. Instead set the icon in a
roundel or arch at four or five times its current size, on a flat colour ground with the
Basohli red border (`docs/CONTENT.md` §7 palette). The icon stays simple and the frame
carries the weight. Pahari figures sit inside architectural arches on flat fields, so this
is the idiom rather than a workaround for a limitation.

**3. Bottom sheet on mobile.** Below 768px the card anchors to the bottom instead of
filling the screen, with the board still visible behind it. Content scrolls inside the
sheet, which is what fixes the clipping. A visible drag handle at the top makes the
gesture discoverable.

**4. Three ways out.** Swipe down, tap the backdrop, and keep the ×. Gesture-only
dismissal is an accessibility failure, so the visible control is not optional and the
swipe is an addition to it. On mobile, move the × out of the top-right corner, which is
the hardest point on the screen for a right thumb.

**5. Roll from the card.** Put a roll control in the card footer beside the prev/next
nav. On a phone the loop is currently dismiss, find the button, roll, read, dismiss. This
halves it.

**Done when:** no card clips its content at 375×812; a card opens showing a framed image,
a moment and a mirror and nothing more; one tap reveals the voices; the sheet dismisses by
swipe, by backdrop and by button; and a player can roll without leaving the card.

**Not in this phase:** rewriting the mirrors. The story-to-source matching is mostly good
— square 34's three days outside an office against Naciketa's three days at Death's door
is an exact echo. Weak pairings get fixed as they are identified in play, not in a sweep.

---

### Phase 7 — The exit  ✅ SHIPPED
*The divine row stops being a corridor and becomes the thing it is in the sources: still
saṃsāra, with a way out partway along it. This phase also carries the sound work, because
the sound is this geometry made audible.*

> **Shipped, with these decisions.**
> - *The move:* by identity, not index. A one-off script re-keyed every god's square record, readings and sprite through the god's name and checked each arrived whole; `tests/content.test.mjs` now holds each god to its own moment, mirror, readings and sprite (pinned by hash), so a scrambled pairing fails by name. The rebirth snake moved by its own identity, from Śiva's square to Brahmā's. `GOAL` (105, the exit) and `TOP` (110, where a roll turns back) are now separate constants; everything that meant the board's extent uses `TOP`.
> - *Winning from above* is a contract, not an accident: path tests from 110 and 109, an exhaustive reflection test over 95–110 × every roll, its own log line (`lWinAbove`), a note on the cards of 106–110, a sim metric and a smoke check. 34% of lives are won this way.
> - *The exact-roll setting* was already gone (Phase 4). With the exit mid-row, exactness is the geometry: only landing on 105 wins, and an overshoot carries you into the higher heavens rather than stalling. The setting that needed rethinking was Brahmaloka: its walk now goes toward the snake's head, so a shut exit walks the player on to Brahmā and the fall.
> - *The fall: 108 → 48, by decision, against the numbers.* Head and tail share column 7, so it is drawn by the existing `snakePath` as one sinuous drop down the board; this reconciles "straight vertical drop" with "not a straight ruled line". The sweep (`npm run sim --snake=108:T`, 20,000 lives each):
>
> | snake | median | p95 | over 100 | max |
> |---|---|---|---|---|
> | shipped Phase 6: exit 110, 109 → 101 | 41 | 82 | 1.7% | 204 |
> | exit 105, none | 42 | 89 | 2.5% | 240 |
> | 108 → 100 | 39 | 80 | 1.5% | 209 |
> | 108 → 98 | 43 | 105 | 5.8% | 306 |
> | 108 → 60 | 57 | 184 | 22.5% | 606 |
> | 108 → 56 | 59 | 187 | 24.1% | 563 |
> | 108 → 52 | 60 | 195 | 25.3% | 574 |
> | **108 → 48** | **61** | **194** | **25.4%** | **557** |
> | 108 → 44 | 62 | 208 | 27.1% | 803 |
> | 108 → 40 | 62 | 204 | 26.9% | 651 |
> | 108 → 32 | 64 | 217 | 29.2% | 605 |
> | 108 → 24 | 66 | 225 | 30.1% | 703 |
> | 108 → 20 | 66 | 231 | 30.8% | 934 |
>
> No tail from 20 to 60 meets the Phase 4 bar; the cliff is between 100 and 98, as it was between 101 and 95 before. **Item 5's premise measured false:** the fall does not fire on "a minority of approaches" but in 59% of lives, 1.45 times each, because from above the exit can only be reached from 109 (a 6) or 110 (a 5), so the higher heavens hold a player while 108 keeps being hit. 108 → 48 ships anyway, with a quarter of lives over 100 turns, and is accepted until the fall ends a life instead of lengthening one (Phase 12, decided 20 Oct). A once-per-life fall measured 55 / 116 / 9.7% and was not taken.
> - *Changed after shipping (2026-10-19, fix pass before Phase 8):* the fall now goes to **1**, birth, so that it really is a rebirth. 108 → 1 on every landing measured unplayable, so the fall was made rarer instead of shorter: it takes only a player climbing onto 108 (a bounce down onto it is just Brahmā's square) and at most once in a life (`p.hasFallen`). Brahmā's card says so (`fallWhen`).
>
> | rule | median | p95 | over 100 | fall fires |
> |---|---|---|---|---|
> | 108 → 48, every landing (shipped) | 61 | 194 | 25.4% | 59% |
> | 108 → 1, every landing (rejected) | 71 | 253 | 34.4% | 59% |
> | **108 → 1, climbing only, once** | **54** | **123** | **12.5%** | **42%** |
>
> 59.5% of lives are now won from above; with two players the median is 38, p95 86, 1.8% over 100.
> - *Superseded 20 Oct, decided by Bhaskar after the research, built in Phase 12:* the turn-back at `TOP` and the once-per-life Brahmā fall go. Past 105 the heavens are walked and the throw that would pass 110 ends the life. The research found that the bounce was Harikṛṣṇa's 84-square rule and the one the thesis faults; the fall back to the world is the rule of the 72, the Jain 84, the 500 and Dampier. See Phase 12, *The geometry*.
> - *Sound:* the Shepard tone (`src/audio/shepard.js`) layers over the drone, whose held Sa in the divine row is its pedal; at the exit the climb stops and fades rather than resolving, so the fall is the only resolution. Six sine partials and a sub-bass sine an octave under Sa (four and one on a weak device), built on entering the divine row and dropped once silent. Position never sets an audio parameter: it chooses targets that glide, the phase only moves forward, ramps are written ahead and each begins where the last ended, and no partial is ever cancelled. Each partial jumps its octave exactly where its gain is 0, which `tests/shepard.test.mjs` checks on a recorded schedule, through a bounce and a fall. The fall slides the whole window down two octaves, timed to the swallow, and lands on Sa.
> - *Not done:* continuous drift with age contradicts Phase 5's stepped drone and its tests, and moves to a later phase. The sub-bass is for headphones; phone speakers will not reproduce it, and it is not made louder to compensate. The Shepard tone's cost has not been measured on a real phone (`npm run perf` never starts audio); `mp.audio().shepard` reports what it is doing.

**1. Mokṣa moves to 105, and no content is lost.** The row currently runs Indra, Agni,
Sūrya, Gaṇeśa, Lakṣmī, Sarasvatī, Brahmā, Viṣṇu, Śiva, Mokṣa. It becomes Indra, Agni,
Sūrya, Gaṇeśa, **Mokṣa**, Lakṣmī, Sarasvatī, Brahmā, Viṣṇu, Śiva. All nine gods keep
their Phase 2 and 3 cards, their sprites and their readings; five of them simply sit
above the exit instead of below it.

**Keep the nine gods. The alternatives were checked and they are worse.**

The row is not the roll-call it was before Phase 2. Its moments are a single descending
arc — a progressive erasure of what is left of the player: merit running out, offerings
still travelling, everything seen and mostly forgotten, a name on a door until the door is
repainted, property divided and the argument forgotten, one sentence still repeated by
someone who does not know where it came from, somebody below with your nose, a habit kept
in one house by people who think it was always done that way, and finally the name itself
coming loose.

The pairings are deliberate and each one earns its god: Indra for merit, Agni for the
offerings he carries, Sūrya for what was seen, Gaṇeśa for the name at a doorway, Lakṣmī
for property, Sarasvatī for a remembered sentence, Brahmā for descendants, Viṣṇu for what
is preserved, Śiva for dissolution.

Two alternatives were researched and rejected:

- **The seven upper lokas** (Bhū, Bhuvar, Svar, Mahar, Jana, Tapa, Satya) are an ordered
  ascent, but three of the seven have no distinct content even in the reference sources.
  Four of nine squares would be filler, which is the problem this row already solved.
- **The seven jñāna-bhūmikās** (Varāha Upaniṣad: śubhecchā, vicāraṇā, tanumānasī,
  sattvāpatti, asaṃsakti, padārthābhāvanā, turyā) are psychologically the strongest
  ladder in the tradition, and they are wrongly placed here: they are stages a jīvanmukta
  reaches **while living**. They are now in **Phase 8**, as the sannyāsin's state rather
  than as squares.

The clinching argument is direction. Both alternatives *ascend*. This row *descends* —
what remains of you shrinking step by step — and descent is right, because the player is
dead, because it sets up the Brahmā fall, and because it is the one stretch where the
Shepard tone's endless rise plays against a text quietly going the other way. That tension
is worth more than a tidier taxonomy.

**⚠ Implementation trap.** When mokṣa takes 105 the gods shift up one square. The moments,
mirrors, readings and sprites must travel **with their god, not with the square number**.
Move them by identity, not by index, or Lakṣmī inherits "one sentence still repeated" and
Sarasvatī inherits "property divided", the pairings scramble and the arc breaks. Add a
test that asserts each god still carries its own moment after the shift.

**Why.** The divine realms are not above liberation in a hierarchy — they are still the
wheel. Svarga is a reward, rewards are finite, and mokṣa is an exit partway along the
path rather than its summit. That is also the historical arrangement: Vaikuṇṭha sat a few
steps before the end of the board, and the 72-square Johnson board wins at 68 with the
top squares as a hazard (`docs/BOARDCRAFT.md §3`). Square 100 and the Indra card already
say this; the geometry has never backed them up.

**2. Landing exactly on 105 is liberation. Passing it carries you into the higher
heavens**, which are still saṃsāra and now carry a real risk.

**3. The exit can be reached from above, and this is the best thing in the design.**
Bounce-back already sends a roll past 110 back down by the remainder. So from 110 a roll
of 5 returns the player to 105. Having overshot the gate, you reach it again by coming
back down, not by climbing higher. Keep this deliberately and say so on the card.

**4. The vertical fall replaces the horizontal snake.** The 109 → 101 snake runs along a
single row, so it reads as a shuffle sideways rather than a fall. Replace it with a snake
whose head is **Brahmā (now 108)** dropping straight down the board into the mortal world.

Brahmā is the right head, not an arbitrary one: some boards required that a player who
reached Brahmaloka then **descend a snake to pṛthvī at least once** before finishing
(`docs/BOARDCRAFT.md`, the Brahmaloka rule). The most attested fall in the sources is
from exactly this square.

What matters is that it reads as a **fall from the top of the board to the bottom of it**,
drawn as a snake in whatever way looks best — a long sinuous descent, not a straight ruled
line and not a shuffle along one row. The renderer already draws curved snake bodies
(`drawSnake` / `snakePath`), so this is the same code over a much longer span.

Pick the tail by measurement rather than by geometry. Start at **108 → 48**, which lands
in the householder years, and sweep `--snake=108:TAIL` across a range (roughly 20 to 60)
reporting median, p95 and over-100 for each. Choose the longest fall the tail numbers will
bear, because the drama is in the distance.

**5. Don't over-tune the fall in this phase.** Right now it is a long snake inside one
game, and a long snake is expensive — 109 → 81 measured 21.9% over 100 turns. But it only
fires on an overshoot past 105, which is a minority of approaches, and in Phase 12 it
becomes a true rebirth that *ends a life* rather than lengthening one (decided 20 Oct). At that point the
arithmetic changes completely. Tune it to something playable now, and expect to retune it
when rebirth exists.

**6. Sound: the Shepard–Risset glissando under the divine row.** Octave-spaced partials
crossfading so the pitch climbs forever and never arrives. Nolan used it in *Dunkirk*;
Mario 64 used it on the endless staircase.

Here it is not decoration, it is the mechanic made audible. The player walks 101 toward
the exit and the tone rises. If they overshoot into the higher heavens it keeps rising and
never resolves — the illusion becomes literally true of their position. When the Brahmā
snake takes them, the tone finally falls, and that drop is the only resolution in the
piece. A player will feel this long before they can explain it.

Three smaller sound changes with it:
- **Sub-bass weight.** Awe is physical before it is musical. The tanpura sits mid-range;
  give it something underneath.
- **Continuous drift rather than steps.** The drone currently changes at ashrama
  boundaries. Make it drift with age so a player never catches it changing.
- **Later, a karma-responsive partial.** Once Phase 12 exists, accumulated karma adds a
  low beating partial that strengthens. Sound that knows something the player does not is
  most of what mystery is.

**Done when:** mokṣa sits at 105 with all nine gods keeping their cards; landing exactly
on 105 wins; a player who overshoots can return to it by bouncing off 110; the Brahmā
snake is drawn as a straight vertical drop; the Shepard tone rises through the divine row
and resolves only on the fall; and `sim.mjs` reports median, p95 and over-100 for every
candidate tail in column 7.

---

### Phase 8 — Life state  ✅ SHIPPED

> **Shipped, with these decisions.**
> - *Years lived, not the square's age, before anything else.* Every snake lowers the authored age (99 → 61 is
>   89 → 51), and the account joined the tail with "Afterwards, ", so an 89-year-old was afterwards 51. A square's
>   `age` stays the age its moment belongs to; years lived are a separate clock that never runs backwards. A vice
>   spends years rather than rewinding them. The clock (`src/engine/self.js`): ahead of your own years, the square's
>   age is the clock; on ground already lived, a turn is a year (§2.1); a snake takes no time and refunds none; the
>   fall from Brahmā is a new birth at nought. With no snakes the years equal the authored ages exactly. Adding the
>   table's deltas again on every re-walk was measured and rejected: snakes undo a median of 62 years a life, so the
>   median life would have ended near 150.
> - *The spoken age is a token.* 95 moments said their age in words, so a counter alone still printed "eighty-nine…
>   fifty-one". They now say `{age}`, filled with the years lived ("still eighty-nine" where a snake has just put
>   someone); a one-time rewrite proved every moment reads exactly as before at its authored age. Square 98's
>   अठासी became अट्ठासी, the table's spelling, as with अट्ठाईस and अट्ठावन.
> - *Āyus.* `SPAN = 110`. The sweep (`npm run sim -- 20000 1 1 --spans=100,105,110,115,120`):
>
>   | span | lives that end in death | median | p95 | over 100 |
>   |---|---|---|---|---|
>   | none (before) | 0% | 54 | 123 | 12.5% |
>   | 100 | 30.0% | 43 | 93 | 2.9% |
>   | 105 | 22.7% | 46 | 98 | 4.2% |
>   | **110** | **16.8%** | **49** | **102** | **5.6%** |
>   | 115 | 12.7% | 51 | 106 | 6.9% |
>   | 120 | 9.6% | 53 | 109 | 8.0% |
>
>   **Over-100 is the guardrail (BOARDCRAFT §5) and it is not met.** 5.6% is less than half of 12.5%, but it is still
>   above Milton Bradley's 3.3% and the Phase 4 baseline of 1.7%. Recorded as an open regression with its reason, not
>   called fixed: only span 100 gets under 3.3%, at the price of a third of lives. With two players: median 38, p95 88,
>   over 100 2.1%, against 38 / 86 / 1.8% before. That rise has its own reason: when one life ends, the other finishes
>   the race alone. YS 2.13 (jāti, āyus, bhoga) is the hook for Phases 12 and 16, where prārabdha sets the span.
> - *When the years run out, the life ends.* The reason, on the record: a life's length is almost entirely its snakes.
>   Across 20,000 single lives, snakes taken by game-length quartile run 2.1 / 5.1 / 8.0 / 14.6, and 22.1 in the
>   slowest 5%; the lives that die took 16.5 snakes on average against 6.1. Death is where a life the snakes already
>   wrecked comes to an end. That is the teaching, and it needs no new content. Only re-walking outruns the table,
>   which tops out at 90, so only snakes bring it about. *Rejected:* rebirth at square 1, which before Phase 12
>   gives karma anything to carry is a respawn: it would teach that rebirth costs nothing and reopen the tail the
>   fix pass closed. *Rejected:* the divine row, which works as a ladder for anyone who dies early and is wrong in
>   the theology: the divine row is earned by merit and spent by merit, which is what the 108 snake is for.
>   - A person whose years run out reads their life at once instead of watching the others finish. A game of one
>     person ends on that account ("The life of Asha"), never on a race nobody won. A race result ("No one reached
>     Moksha.") is kept for games of several people. Once no person is alive the game is over; the computers do
>     not play on for nobody. A dead token stays where it fell, greyed in the paint only.
>   - The account's last line names what the life was still holding: the vice taken most, the latest on a tie, in
>     its snake's `holding` ("…on ground already walked once, still asking whether the son has eaten."). It is kept
>     as `p.holding` for Phase 16 to carry over.
> - *The account's joins* (`src/engine/account.js`, now pure and tested in node; NARRATIVE §9 has the rule). First
>   match wins: snake (the years undone), echo, ladder, again, a gap of eight years or more, same year, then a plain
>   join drawn from the seed. **Echo goes before ladder, against the order first proposed**: five of the ten new
>   callbacks are ladder tops, and 44 → 63 is how 63 is usually reached, so ladder-first would have silenced them.
>   Squares lived twice in one life (94% of lives, about 19 a life) are folded into one line. The fall begins a
>   section of its own. Twelve callbacks now, each with a bilingual `echo` (NARRATIVE §6). The account opens on a
>   line that knows the shape of the life and gives no verdict.
> - *Gunas and aims* are in state and move only on the 24 vices and virtues, tagged with the Gītā's guna (`guna`)
>   and what they do to dharma, artha and kāma (`aims`). Stage rules gate the aims, by stage of *years*:
>   brahmacarya refuses artha, vānaprastha only gives away, sannyāsa is still. The action slots of §2.4 are data
>   (`slotsFor`) that nothing offers until Phase 9; there are no actions to gate yet. Nothing is shown as a number:
>   the players panel says a sentence ("restless, and always counting").
> - *The bhūmikā: six, not seven.* State-based, from the sattva share, shown on the sannyāsin's own card ("STORY ·
>   SATTVĀPATTI · AGE 92"); a browsed square keeps its ashrama. A per-turn counter was tried first: it advanced
>   every turn and reached turyā in 27% of lives, the noise this section warned about. By state, dice alone never
>   reach turyā (peak sattva p95 0.74), so it and Brahmavidvariṣṭha are withheld until Phase 9's PRACTICE.
>   Thresholds are calibrated so the highest stage reached runs 10.0 / 20.2 / 26.6 / 23.9 / 15.2 / 4.1%; a
>   sannyāsin is shown 1 stage in 37%, 2 in 33%, 3 in 20%. The title (Mumukṣu, Brahmavit, Brahmavidvara,
>   Brahmavidvarīyān) is the account's subtitle.
> - The ageing board, the drone and the pixel art follow the years: after a snake the sprite stays old and the board
>   stays as old as the player. The toast that said a snake made you young again is gone.

- `āyus`, guṇas, puruṣārthas in state.
- **Derive āyus from the authored `age` table shipped in Phase 3** rather than inventing
  a second clock. Every square already states how old the player is there; āyus is that
  number running out. Two clocks that disagree would be a bug waiting to happen.
- Ashrama rule phases from §2.4 (action slots gated by stage).
- The existing pixel-art stage change tracks āyus rather than board position.
- **No numbers on screen.** Guṇas and puruṣārthas are tracked internally and surfaced as
  description, never as meters. Ultima IV is the precedent in both directions: it kept
  virtue hidden and reported it through a seer who tells you in words that you have
  strayed, and the parts that *were* legible as numbers got farmed, which is why the
  game needed an anti-grind patch on repeat donations. A visible meter turns a moral
  state into a score, and players optimise a score instead of weighing a choice.
  Whatever panel this phase builds should read like a sentence about who the player is
  becoming, not a dashboard.
- Still dice-and-move; no allocation and no choices yet.

**The seven jñāna-bhūmikās as the sannyāsin's state.** The Varāha Upaniṣad's ladder —
śubhecchā (good desire), vicāraṇā (inquiry), tanumānasī (the thinned mind), sattvāpatti
(resting in sat), asaṃsakti (non-attachment), padārthābhāvanā (no longer perceiving an
inner or outer world), turyā (the fourth) — is the strongest psychological progression in
the tradition and the board currently has nothing marking the last band.

**It is not content and it must not displace any.** Squares 81–100 are already dense, and
all four mahāvākyas live there. The bhūmikā is a **state the player is in**, shown in the
card's eyebrow where the ashrama name currently sits: "STORY · SATTVĀPATTI · AGE 72"
instead of "STORY · SANNYASA · AGE 72". Not one card moves.

**Key decision: the stage is set by state, not by square.** A player who reaches sannyāsa
still clutching artha is at śubhecchā however far up the board they are. Tie it to bandha
(§2.3) once Phase 12 exists; before that, approximate from the guṇa mix. This is the
version worth building, because position-based stages would just be a second name for the
square number.

**Measure before committing to all seven.** At a median of 41 turns across 110 squares,
the twenty squares of the sannyāsa band take roughly seven turns, so seven stages would
advance about once per turn and read as noise. State-based progression solves this, since
most players will only pass through three or four. Check the distribution in `sim.mjs`
before deciding how many stages a typical life actually shows.

**The title the player earns.** The Varāha text classes the person by stage: Mumukṣu
through the first three, then Brahmavit, Brahmavidvara, Brahmavidvarīya, Brahmavidvariṣṭha.
That is a name you are given for what you have become, which is the thing Émerson was
reaching for with "character qualities the player can wear", and it is native to the
tradition rather than borrowed from an RPG.

**Done when:** a life can end by running out of years, `sim.mjs` reports a lifespan
distribution, and a sannyāsin's card names the bhūmikā they are actually in rather than
the one their square implies.

---

### Phase 9 — Dice as currency  ✅ SHIPPED
*The core mechanical change. Read §2.1 carefully.*

> **Shipped, with these decisions.**
> - *"Move up to the roll" was prototyped first, as this section asked, and rejected.* 20,000 single lives each:
>
>   | rule | median | p95 | over 100 | max | die | rebirth fires | 99→61 twice+ |
>   |---|---|---|---|---|---|---|---|
>   | Phase 8 | 49 | 102 | 5.6% | 239 | 16.8% | 37.3% | 9.2% |
>   | up to the roll, everywhere | 23 | 37 | 0.0% | 74 | 0.7% | 0.0% | 0.8% |
>   | up to the roll, 94–110 | 29 | 55 | 0.0% | 94 | 4.5% | 0.0% | 0.4% |
>   | up to the roll, 94–100 only | 48 | 101 | 5.1% | 239 | 6.5% | 41.0% | 0.8% |
>   | **two dice from 94, move by either (shipped)** | **34** | **71** | **0.7%** | **172** | **2.5%** | **8.2%** | **0.0%** |
>
>   **Every life over 100 turns was a rebirth**: in Phase 8, 100% of them took the 108 fall to 1. The 99↔61 loop
>   drove the deaths and the repeated text, not the tail, so nothing confined to earth could clear the guardrail.
>   Reaching into the divine row, up to the roll over-corrects: a player can always stop on 105, so the fall never
>   fires and the endgame stops mattering. The best chooser and a naive one measured the same, so it was a
>   correction, not a decision. Two dice keep the fall, now rare as Phase 7 meant it.
> - *The over-100 regression Phase 8 recorded is closed*: 0.7% against the 3.3% guardrail. Two players: median 28,
>   p95 49, 0.1% over 100. The median falls below Phase 4's 41 (Milton Bradley is 33) because the divine row's waiting
>   room is gone (Phase 8: 4 turns at the median, 30 at p95), not because content is skipped; ages come from squares.
> - *Choosing is worth something.* `npm run sim -- --pick=first` (the first die, as before) gives back 49 / 102 /
>   5.5%; `--pick=bigger`, ignoring what the die lands on, 44 / 94 / 3.3%. Through the exit by 90: 84.9% for the
>   game's chooser, 58.1% for the first die.
> - *The allocation loop is not built.* It cannot touch the tail: the tail is the divine row, whose only slot is
>   MOVE. A plain chooser (the exit, then not a snake) matched a careful one, so the decision that matters is seeing
>   the snake and the exit. STUDY, SERVE and GIVE would spend dice on meters Phase 8 never shows and nothing yet
>   uses: buttons with no visible effect, or a farmed number. And the Phase 8 clock makes standing still free, so a
>   board-wide loop needs "a cycle is a year" everywhere, the two-clock problem Phase 8 closed. Revisit in Phase 10,
>   when situations give choices consequences that can be seen. Widening two dice to all of sannyasa was measured
>   too (31 / 63 / 0.2%) and rejected: no life died, which deletes Phase 8's ending.
> - *What ships of the loop is where it bites* (`src/engine/turn.js`): from 94 (`ENDGAME`) two dice, seen before
>   choosing (`rollDice`, `movesFor`, `moveFor`, shared by the page and the sim, so `npm run golden` holds). A six goes
>   again only when it is the die moved by. A sannyasin on 94–100 may **sit** the year out: no walk, a year passes
>   (it counts toward the span), and in the life it is the same square twice, which nothing else on earth can be.
>   A person chooses on the panel, on the card (a phone's sheet covers the panel) or by key: 1, 2, S. A choice
>   with only one move in it is not asked.
> - *PRACTICE and turyā* (`src/engine/self.js`): a sannyasin's spare die is practice, mixing sattva in by its face
>   (`PRACTICE_W` 0.02 a pip). Turyā is the seventh bhūmikā and asks that the life has practised, so dice alone never
>   reach it by construction: turyā in 1.5% of sannyasins, 0.0% with `--practice=off`. Brahmavidvariṣṭha is its title.
> - *The life account* (NARRATIVE §9): a snake or ladder taken a second time is one line, from the third a tally
>   that ends the paragraph; a square already told, reached again by a snake or ladder, says only where it was first
>   lived. Seed 23 as Phase 8 played it is a pinned test: the mirror and "starts again" once each, not three times.
>   Its Sannyasa paragraph is still about a thousand words, but they are first-time moments now, not repeats. The
>   fold line printed the square's authored age as if it were now ("walked through fifty-three" at ninety); it now
>   names the age the ground was first walked at, and says so. `after()` lowers "A habit…". A win names what the
>   life put down, the vice a death would have named as still held (`letgo` on each vice snake).

- Roll n dice, visible, before any decision.
- Action slots: MOVE, STUDY, SERVE, GIVE, PRACTICE, gated by ashrama.
- Dice count falls with age and poor condition.
- Moving up the board is now one option among several and has an opportunity cost.
- **Cheaper precursor worth trying first:** "move up to the roll" — let the player move
  any amount up to the number rolled. It is the standard fix for the exact-roll fault in
  roll-and-move design, it is one line, and it quietly introduces the game's first real
  decision long before the full allocation loop exists. Prototype it in Phase 4 or 5 and
  see whether the allocation loop is still worth its complexity.

**Test it on the endgame first.** Squares 94–110 are the stretch with no ladders and,
since Phase 4, a snake at 109 and bounce-back off the gate. That is where the board has
least agency and most variance, and the sim said it was what drove the p95 to 128 before the fall was shortened to 101. If
the allocation loop is worth its complexity anywhere, it is there: a player who can
choose to spend a die on something other than moving has a way out of the loop that
pure dice does not give them.

**Done when:** a player can spend a whole cycle without moving, the board no longer
advances on its own, `sim.mjs` shows a visible spread in how far players get by a given
age, and p95 has not risen.

---

### Phase 10 — Situations  ✅ SHIPPED

> **B, situations proper, shipped, with these decisions.**
> - *Ten squares, none shared with A's:* snakes 55 Greed, 59 Anger, 19 Fibbing, 47 Craving; ladders 12 Wit, 28 Truth,
>   51 Compassion; story squares 49 Five offerings, 54 Raikva, 56 The guest (`content/situations.json`,
>   `src/engine/qbn.js`). Each option shows what it visibly does, where it takes you and the years it costs, and never
>   its guna and aims. Any other square is its story card; a computer chooses the way the sim does, from a sequence of
>   its own, so the dice and `npm run golden` are untouched.
> - *The hidden value is the guna and aims already in state.* An option carries the same `guna` and `aims` tags as
>   the vices and virtues, applied by the same `grow()`. No ledger of its own: the choice is history in `p.told`, and
>   Phase 12 can read āgāmi from it. Ranked for the sim and the lint by dharma, then guna.
> - *Cheaper, never further, is a build failure.* The option worth least may not go further, or cost more years,
>   than the one worth most. On a ladder both climb and the honest one costs a year; on a story square both stay and
>   the honest one costs a year; on a snake the vice is the fall and restraint costs the years a fall costs. Measured
>   (mean years until a life stands at the head again): 19 → 4.3, 47 → 10.3, 55 → 8.5, 59 → 6.5. Priced at 4, 8, 7, 5,
>   and 4 for walking out at 59. Priced at the median first, restraint was the cheaper way and honest led everywhere.
> - *The years a choice costs pass on its square* (the square again in the life, told "stay"): the clock, the death
>   at the span and the account all read them; they are not practice and are not told as sitting.
> - *Gates*: 47's waiting (rajas ≤ 0.6), 49's feeding the others (artha ≥ 15), 56's giving up the plate (tamas ≤ 0.55),
>   59's looking first (rajas ≤ 0.5). A withheld option stays on the card, greyed, with why; one option is always open.
> - *Policies* (20,000 single lives; `npm run sim -- --policy=…`):
>
>   | | dishonest | mixed (the game's) | honest |
>   |---|---|---|---|
>   | median / p95 / over 100 | 34 / 71 / 0.7% | 32 / 65 / 0.3% | 31 / 62 / 0.1% |
>   | liberated | 97.5% | 96.5% | 95.8% |
>   | square at 40 / 50 / 70 / 85 (mean) | 50.1 / 51.8 / 73.4 / 88.5 | | 49.9 / 54.3 / 72.4 / 87.9 |
>   | sattva / tamas at the end | 0.429 / 0.110 | 0.556 / 0.138 | 0.687 / 0.131 |
>   | dharma at the end | 20.7 | 33.4 | 44.6 |
>   | highest bhumika (mean) | 1.13 | 2.53 | 4.32 |
>
>   **Worse in the ledger on every line, and ahead on the board only partly.** The dishonest life is ahead at 40 and
>   from 70 on, and is liberated more, but is behind at 50: on a snake the vice is the fall, so the crooked life is
>   back on the board until the re-walk catches it up. Always-dishonest plays the Phase 9 board exactly, pinned by a
>   test, since every least-worth option is the old snake, the old ladder or the old square at no cost.
> - *Guardrails, the game's own computer:* median 34 → 32, p95 71 → 65, over 100 0.7% → 0.3%, two players 28/49/0.1% →
>   27/47/0.1%. **Liberation 97.5% → 96.5%**, down, not worse; Phase 17 still owns it. A square landed on four times or
>   more 31.0% → 26.6%, the same moment told four times or more 27.4% → 23.4%: restraint keeps lives off the snake
>   tails. Turyā 1.5% → 3.3% of sannyasins, from the sattva the honest options mix in; it still needs practice.

> **A, the roll-dependent squares, shipped, with these decisions.**
> - *Which squares, from the sim, not taste.* The 31% is mostly not below 94: in 16.1 of its 31 points the only
>   squares landed on four times or more are the divine row (107, 108, 109, 106), bounced around under Phase 9's two
>   dice, and 19.2% of lives repeat a square at or above 94 at all, a floor nothing below 94 can get under. Below 94
>   the repeats are the snake tails, reached about half the time by the snake. The ten upgraded are the ten story
>   squares a life lands on four times or more most often: 43 (2.9% of lives), 52 (2.8), 50 (2.5), 58 (2.4), 8 (1.7),
>   31 (1.6), 46 (1.5), 11 (1.2), 64 (1.1), 71 (0.9). 53 is next.
> - *What moved, and what could not.* A square that tells two moments does not change where anyone lands, so the
>   31% is **31.0% after, exactly as before**: it counts landings. What A fixes is the moment told again, and the sim
>   now counts that too: **the same moment told four times or more, 31.0% → 27.4%**. Median 34, p95 71, over 100
>   0.7%, liberation 97.5% are unchanged, by construction: nothing is drawn and nothing moves, so `npm run golden`
>   and every sim number but the new one are identical, and `--roll=off` gives back main exactly.
> - *Snakes and ladders fire on every face.* Making them roll-dependent was measured (20,000 lives, in memory) and
>   rejected: the snakes that make the repeats are the snakes that make the deaths. The gṛhastha snakes spared on a 1
>   take the 31% to 27.6% and liberation to 98.7%; all snakes below 94 spared on 1–2, 23.0% and 99.7%; ladders missed
>   on a 6 go the other way (96.7%, but 33.2% and p95 75). No mix tried lowered the one and held the other. The lint
>   keeps `roll` to story squares below 94; a snake's choice belongs to B, where it can be priced in years.
> - *The field* (`content/squares.json`): `roll: { valence, faces, moment }`. The square's own moment is the event;
>   `valence` says which faces bring it, a good event the low ones (`face <= faces`), a misfortune the high ones
>   (`face > 6 - faces`). All ten are aftermath squares, a misfortune on 4–6; on 1–3 the player came slowly and
>   noticed. Each other moment has a mirror of its own, since the square's fable tells the misfortune.
> - *The die face, below 94, on one die* (`toldOn` in `src/engine/turn.js`): the face moved by, never the distance;
>   a snake's tail reads the same turn's face. The lint refuses the field at or above 94 and the engine reads it only
>   on one die, so it holds under `--endgame=N` too.
> - *The record and the account.* `p.told` sits beside `p.life`, one for one; a save without it tells every square's
>   own moment. In the account what repeats is a moment, not a square: the other moment on a square already told is
>   told in full, the same one still folds. Where a square was first lived stays the square's. A callback needs the
>   moment it names (63's "the mango that went soft" is not said after 43's other moment), and the other moment
>   borrows no echo. With the field stripped, every account for seeds 1–2000, both languages and both genders, is
>   byte-identical to Phase 9.

- `content/situations.json` and `engine/qbn.js`.
- Gate evaluation, with the gate surfaced in the UI when an option is withheld.
- Convert ten squares first, including at least three snakes and three ladders.
- **Any square without a situation falls back to its story card.** The game stays
  playable at every point during the content build.

**Émerson Moreira's design, which this phase implements.** A situation offers two or
three options, and the dishonest one is genuinely tempting: it carries the player further
for less. Each option also carries a karma value that the player is never shown.

One rule keeps it from collapsing. **The dishonest option advances you more cheaply, not
further.** If lying simply moved you ahead, lying would be the correct move every time and
the choice would die; the design literature calls this out as the standard failure of
morality systems, where players make one decision early and keep it. So honesty costs
something now — a turn, the longer way round — and dishonesty costs nothing now and
accrues. The settlement is Phase 12's.

**Authoring rule:** no option is obviously correct, and the game never tells a player they
chose wrongly. It only shows them, later, what they became.

**Roll-dependent squares — the cheap tier below a situation.** Émerson Moreira, 19 Oct.
A square with two outcomes is a one-bit storylet: one field and a comparison rather than a
situation file, so it is the lightweight end of this phase and the place to start.

- **The check reads the die face, never the distance moved**, and applies **below square
  94 only**. From 94 Phase 9 gives the player two dice to choose between and the option to
  sit out the year, so above that line the player would be choosing their own arrival
  speed and every event would be free. Below 94 a turn is still one die and the face is
  genuinely unsteerable. The boundary is not a patch: it means the player gets no say
  early and a say only in late sannyāsa, which is the right shape.
- **The roll is how fast the player arrived.** Come slowly and you noticed what was there;
  come at speed and you went straight past it, or it caught you. Haste as a failing is
  native to the source material, so the number stops being a number and becomes something
  the card can say.
- **The threshold direction follows the event's valence.** Good outcomes fire on low
  rolls, bad ones on high. Low-always-fires only trades when the event is desirable: a 2
  means little ground but you get the thing, a 6 means ground but you miss it. When the
  event is a misfortune, a low roll gives less ground *and* the misfortune, which
  compounds instead of trading.
- **It is also the repetition fix.** Phase 9 killed the 99→61 loop (taken twice or more:
  9.2% → 0.0%), but **a square is still landed on four or more times in 31% of lives**,
  and a repeat landing prints a short form rather than a different event. A square that
  can resolve two ways stops repeating itself.

**What already exists.** All 76 written squares already fire their moment on landing, with
no roll involved. Émerson's "fixed houses with the right events" is that, already built, so
his proposal is two additions to one existing channel rather than three new systems. The
open question is only which squares get upgraded, and that is content work, not
architecture.

**Done when:** ten squares offer choices, the fallback is invisible, no unreachable
situation exists (`lint-content.mjs`), no option is obviously correct, and a player who
takes every dishonest option is measurably ahead on the board and measurably worse off in
the ledger.

---

### Phase 10C — The cast  ✅ SHIPPED

> **Shipped, with these decisions.**
> - *The roles, re-derived from the shipped moments:* 24 squares, 28 moments, not ~40. Mother 18; father 3, 53; teacher
>   20, 23, 26, 37, 38; friend 6, 15, 16, 48; spouse 41, 65, 78; daughter 50, 59; son 60, 62, 64, 93; rival 52, 67, 69
>   (and 59's prompt, and the holding and letgo of 62, 69, 93). The numbers below ("the rival at 38, 55, 57") were
>   partly ages: 38, 55 and 57 are the ages of squares 52, 67 and 69.
> - *The field is on each moment, not the square* (`cast`, `recall`; `introduces: false` on 60, whose "His name is"
>   would name the grandson; `dies` on 53; `gone` on 100), since 59's two outcomes differ. One member per moment.
> - *Tokens* (`src/i18n.js` `castFill`, before `fill`): `{friend=the friend}` is the name once met and the words until
>   then; `{friend:लेता|लेती}` agrees with the friend's own gender. With no names every reference is its words and every
>   choice its first form, which is the shipped text: every cast verb was masculine. Seven Hindi moments needed the
>   choice (6, 15, 23, 37, 38, 65, 78); no English one did. Joins and fates are written to need none.
> - *The son and the daughter are two people*, each `{child}` in the text; a life that meets both names both. Children
>   always outlive the player (104–108 keep heirs below). *Parents are cast but not named*: "Meera's mother".
> - *Meeting, not introduction*: the name is said once, at the end of the moment where the life meets them ("Her name
>   is Tārā."; the teacher "उनका नाम आनंद है।" and then आनंदजी). The card says it on the landing too.
> - *The draw* (`src/engine/cast.js`): per player and per life, off a sequence of its own seeded by the game; nothing in
>   state, so old saves have a cast. No name anyone at the table has (compared by Devanagari, or Latin without marks:
>   "Meera" excludes Mīrā). Offsets: friend 0, teacher +20–35, rival ±2, spouse ±4, parents +20–38.
> - *Returns* rank snake → echo → **returns** → ladder → …: a member met earlier, not told in the moment just before,
>   joined by the recall of the moment where they were met, in words of their own (`strings.json` `CAST.returns`): the
>   teacher "was waiting", the rival "was back", the friend "was there again" ("Tārā, who once broke a biscuit badly
>   with Meera, was there again: "), the spouse "was still there" (present, not met again). The son and the
>   daughter take the friend's words until Phase 16. An echo
>   outranks it; a fold, a "back where" line or a tally names nobody and is not a return.
> - *Fates*: after the end line, one per member the last life met, in order, four at most: the fourth takes the short
>   form ("Rādhā died when Meera was seventy-two." or "Arjun outlived Meera."; "outlived" only for someone alive when
>   the player died) and the rest go unsaid. Drawn in the player's years between the
>   board's last word on them (landed or not) and every landing on their squares, and before 100 if the life told it;
>   the father's is 53's age. `lintFates` holds it for 500 seeds a gender in the build, 2000 in the tests.
> - *Measured* (4000 lives): 99.7% name someone, 58.5% join a return by name, 99.6% close on a fate, 3.5 fate lines
>   a life (66% reach the cap of four). **Nothing moved**: `npm run sim` for one and two players is byte-identical to Phase 10, and with
>   `names.json` `cast` stripped all 16,000 accounts of `node tools/accounts.mjs 2000` (seeds 1–2000, both languages,
>   both genders, and two unnamed computers) are byte-identical to Phase 10 with one deliberate change: the Hindi gap
>   join is now "{gap} ख़ामोश बरसों बाद, " (it was "चुपचाप बरस बाद"), which changes 3,520 of the 8,000 Hindi accounts
>   and no English one; the comparison is against `main` with that one string changed.
> - *For Bhaskar*: the list is the §13.3 starter with Bhaskar's changes: Līlā became Rekhā (रेखा) and Ānand became
>   Vinod (विनोद), since both were words in the mirrors (7; 70, 89), and Jaya moved from "either" to the women's names.
>   Arjun, Rādhā, Tārā, Kabīr and Mīrā carry mythic or devotional echoes. The Hindi of every recall, intro and fate
>   line wants a native ear. A girl's friend who is a girl is a सहेली (square 6); every other friend is a दोस्त.

*`docs/NARRATIVE.md` §13.1–13.4 and §13.10. Its own PR from a clean `main`. The highest-leverage
piece of work on the table, and the cheapest.*

The generated accounts proved the gap: the prose already has a recurring cast — the rival at
38, 55, 57, 69, 79; the son at 53, 62, 93; the friend at 6, 9, 16, 33 — and the data does not
know it, so a return is the same words and not the same person. **This phase reverses
NARRATIVE §6's "do not name them."** The reason is in §13.2: keep §6's concern (two registers,
domestic and mythic) and change the instrument (ordinary names in the foreground, mythic names
stay in the mirror).

- **Roles re-derived from the shipped moments**, not §6's table: a `cast` field on the ~40
  squares that already name one. Tokens `{mother}` `{father}` `{teacher}` `{friend}` `{spouse}`
  `{child}` `{rival}`, resolved through `g()` with the cast member's own gender.
- **`content/names.json`:** first names only (surnames are caste markers; this is how the
  no-hierarchy guardrail holds inside the cast), bilingual, gendered, ordinary and unmarked,
  none mythic. Drawn at birth off `state.rng`, one per role, never the player's own name,
  never repeated in a life. Bhaskar passes the list.
- **Introduction:** the first square a role appears on carries a per-role introducing clause
  — "Her name is Mīrā." — and every later square uses the name alone.
- **The cast ages on the Phase 8 clock** with a per-role offset.
- **Account:** the *same person returns* join, outranking gap and same-year and beside the
  echo; and **fates the life did not see** in the closing — one line per cast member met,
  seeded across every square that mentions them, consistent with every square this life
  touched. Lint: no cast member dies before the player's age at their last appearance.
- **No new screen.** Data on squares and rules in the account.

**Done when:** a generated life names a friend on their first square and uses the name on
every later one; the account joins a return by name; the closing names at least one fate the
life did not see; stripping `names.json` leaves every account for seeds 1–2000 byte-identical
to Phase 10; and a native reader passes the Hindi.

---

### Phase 11 — The first five minutes  ✅ SHIPPED

> **Shipped (PR #19 and two follow-ups on `main`), with these decisions.** Sim, golden and every life account are byte-identical to the main it started from. Bhaskar's test with three new players, ten turns each, which measures the default table and the full-card weighting, is done (closed 22 Oct 2026).
> - **The rule:** the card is for a choice and for the result of a choice; the line is for everything else.
> - *The card does not block the roll.* Every card is a non-modal `<dialog>` except a situation waiting on its choice, which stays modal until the choice is made. Then the card turns to the outcome, without the options, and stops being modal, with the die live on it like any other card; a roll takes it away. The outcome is the line under the board as well, so it is there after the card is gone. The outcomes stay as written: thirteen run long because they carry the choice's long tail ("for years after", "it takes years before looking first is quicker than the hand"), which is the point, and Phase 12's work done in prose. A rewrite to fit the line was weighed and cancelled. A person's roll, from the panel, the card or Space, takes the card away. From 94 the card stays until the dice are chosen between, since on a phone the choice is on it. A card opened by a landing does not take the focus, so Space rolls again. A situation's card focuses its title, not its ×, so someone pressing Space to roll cannot close the choice with the same key. Escape, a click outside the card that is not on a control, and the × all close it. On a wide screen the card sits over the board, clear of the panel. On a phone the board stays live under the sheet: a square tapped turns the card to it. *(Superseded 29 Oct, Phase 17 step 0: the board under an ordinary sheet is dimmed, and a tap on it closes the card.)* A computer's turn never opens a card.
> - *Weighted by what happened.* A person's ladder, snake, situation, first meeting with a named member of the cast, first visit to a realm, and the exit open the full card. Every other landing of theirs is a line under the board (`src/render/landed.js`). It shows the square's name and the whole moment, which is 20 words at the median and 32 at most, never clamped or cut. The line is the person's own: it stays until their next roll, opens the card, and keeps three lines' height when empty (four on a phone), so the panel and Roll below it do not move. Measured over every moment and outcome in both languages: on a wide screen everything fits; at 375px only square 53 in Hindi (five lines) and three outcomes (55 return, 59 look, five or six lines) grow the strip, the outcomes while their card is open over it. A computer's turn goes to the moves log only, never to the line and never into an open card's header (the Phase 6 note "{name} moved to {n}" is gone: it went stale while the card stayed open). Fixed on `main` after a first-time playthrough at 375×812, where the computer's turn overwrote the person's moment while they watched their token walk. The setting `everyCard` replaces `landAll`, since nearly every saved copy of `landAll` was `true`. **Measured** over 5,000 games, one person against one computer:
> - *Who is playing.* The naming asks first: just me, me and a computer (the default, which the player test measures), or two, three or four people, each named in turn in the same dialog, with Back. The "Players & rules" panel still sets up any table, and now has a table of one.
>
>   | | Full card | Line under the board | Situation (blocking) | Ladder | Snake | Met by name |
>   |---|---|---|---|---|---|---|
>   | First ten turns | 37.7% | 62.3% | 12.3% | 8.7% | 6.1% | 10.7% |
>   | Whole game | 42.3% | 53.2% | | | | |
>
>   Only situations hold the game up now, 12% of turns, where every landing did before. Open: 1,976 introductions in those games fall on a ladder's top or a snake's tail, where no card opens, so "Her name is …" is never seen there. The account still names them.
> - *First life, moment only.* Lives are counted per viewer in localStorage (`mp-lives`, `prefs.js`). A life ends when the viewer's own life does (death, Moksha or the Brahmā fall), or when they start a new game after rolling. Someone with a name or a Codex entry already kept counts as having lived once, so returning players keep the full card. In the first life a card shows the moment, and under it one line in the mirror's italic with a ▸. That line is the "there is more" affordance: on first contact it is the bridge, e.g. "▸ An Upanishad story: Satyakāma, a boy who wanted to be taught"; after that it is "▸ The old story". Tapping it opens the story in place, and every later card in that life opens with the story showing (`mp-first`). The voices stay behind "more", as Phase 6 decided, and are not remembered. `?first` treats the viewer as new and asks for a name, without writing anything, so a first-time player can be watched on a used device; `mp.first()` does the same on a running page.
> - *Performance* (`npm run perf`, 4× throttle, phone-sized): the walk, the swallow and the turn-end repaint are as on `main`. The climb's longest frame is 107–126 ms against 59–73 ms on `main`. The cause is the browser's own `dialog.show()` for a card that is not modal, about 90 ms throttled against `showModal()`'s 40, in the one frame where the ladder's card opens. That is roughly 10–15 ms on a real phone. `whoOf` first cost 215 ms there, because it ran about 150 Unicode regexes per mirror. It now looks names up by word, with a cache per mirror, and gives the same figure for all 130 mirrors.
> - *Every mirror says it is a story.* There are 130 distinct mirrors a card can show. 13 name a codex figure and 117 do not: 41 open on a person not in the codex, 28 on a Panchatantra animal, 26 on a text, 14 on a god, 8 on a school, and 1 on the Gītā. The codex glosses are 15–30 words of reference prose, so they would have covered about one mirror in ten. So the bridges are authored, one per figure rather than one per mirror (`content/bridges.json`): 130 mirrors open on 63 figures. The nine Panchatantra animals share one bridge, since it is one story world, which makes 55 bridges. `whoOf` in `src/content.js` finds the figure: the mirror's own `who`, or else whoever it names first, with the longer name winning a tie. The bridge shows above the mirror only the first time this viewer meets that figure (`mp-who`, kept apart from the Codex). The lint fails a mirror whose figure has no bridge, and a bridge over twelve words, without both languages, without the figure's name, or with a placeholder.

*A first-time player's report, 20 Oct, relayed through Bhaskar's labmate: "it doesn't feel like
a game — you roll, a popup appears with a lot written on it, and I can't understand what's
written." Educated, curious, exactly the audience, and lost in the first five minutes.
Everything built so far is retention at turn thirty. This phase is retention at turn three.*

**Why it comes before karma.** The door in Phase 14 is a card-heavy scene — eight questions,
one a turn, on the card. If the card is wrong, the door is built on a wrong card. The card
comes first.

**Measured by people, not by sim.** Nothing moves and nothing is drawn, so `sim.mjs` and the
golden seeds must be byte-identical to `main`. The acceptance test is three players who have
never seen the game, ten turns each, then one question — *what happened to your character?* —
answered without help. Bhaskar runs it. If they cannot answer, the moments are not landing; if
they can but never mention a story, the mirrors are not.

- **The card does not block the roll.** The die is live while a card is up; rolling replaces
  the card. Reading becomes optional per turn. On the phone the sheet rises but does not trap.
  Situations are the exception, since a choice has to be made, and the omen will be another.
- **First life, moment only.** The mirror sits behind a tap, and the depth the player raises
  it to is remembered (localStorage, wrapped — it may come back empty). From the second life
  the present default returns. The "there is more" affordance has to read so a player knows
  more exists without being made to read it.
- **Every mirror says it is a story and who is in it, on first contact.** Square 28's mirror
  opens "Satyakāma had a harder question" — a cold reader does not know that is a tale or who
  he is. Two ways, and the count decides: an authored bridge clause per mirror (about eight
  words, lint-checked), or a gloss derived from `codex.json` for the first figure a mirror
  names. Report how many mirrors name a codex figure, how many do not, and whether the
  existing glosses are in a register a first-time reader can take.
- **Not every square deserves a stop.** Weight the card by what happened: a one-line toast for
  an ordinary story square, the full card for a snake, a ladder, a situation, a cast
  introduction. This is what makes the loop feel like play and the big moments feel big.
  Measure it: with weighting on, what share of turns show a full card.

Curiosity is lit by a small thing not yet understood, with a way to pull on it. A wall that
cannot be parsed puts it out. The mirror is the wall today; it should be the crack of light.

**Done when:** three first-time players get through ten turns and say what happened to their
character; sim and golden byte-identical to `main`; a full card appears on a minority of
ordinary turns; and every mirror a first-life player can reach tells them it is a story.

---

### Phase 12 — Karma  ✅ SHIPPED

> **Shipped, in two steps, with these numbers** (`npm run sim 20000 1`, single lives, mixed policy).
> - *Step 1, the geometry* (`822a9b7`): nothing above 105 turns back, and the throw past 110 is the fall. Against Phase 11: median 32 → 28, p95 65 → 49, over 100 0.3% → 0.0%; liberation per life 96.5% → 47.6%; the fall 7.7% → 49.2%; years ran out 3.5% → 3.2%; lives per liberation 1.04 → 2.10; turns in 106–110 mean 4.79 → 1.01 (p95 20 → 3); a square at or above 94 landed on four times or more 18.8% → 0.0%, which closes Phase 10's divine-row repeat. Golden re-pinned for the new rule; every account whose game never went above 105 byte-identical.
> - *Step 2, the ledger* (`41cb8da`): median 29, p95 48, over 100 0.0%. Debts planted 1.45 a life; 41.1% of lives end with one never met. **The omen**: a 6 with a ripe debt 1.17 times a life, a reckoning 0.61 a life, in 45.6% of lives; the share of those 6s that fire rises toward the exit, 23% on 21–40, 31% on 41–60, 46% on 61–80, 70% on 81–100 and 88% at 105. **Severity**, of 12,136 reckonings: the floor alone 28.5%, years 35.7%, a holding 18.0%, sent back 11.4%, death 6.4% (reported only, until Phase 16); death would have fired in 3.3% of lives, nearly all past sixty (40–59: 27, 60–79: 208, 80+: 420). **The door**: 0.41 arrivals a life, a third of them refused, all for debt; 13.7% of lives refused at least once. **Liberation per life after the ledger: 27.6%** (from 47.6%), the fall 64.4%, years ran out 8.1%, lives per liberation 3.63.
> - *After Bhaskar's live check* (23 Oct): a life the door refused that then fell closed "with nothing in particular in hand". The fall now closes on what is still carried, in the door's own words (`carryIn`, `debtsIn` in `karma.js`), and the refusal is told in the account where it came, one line joined as a snake is (`p.refusals`, `JOINS.door`). The refused 105 card is headed "The door that did not open". `mp.roll` no longer leaves a forced roll behind when no throw can be taken. `accounts.mjs --tag` adds `door`: all 9,284 accounts without it are byte-identical to the build before; 590 of 4,000 single lives were refused for debt, none for an aim alone, and 902 more fell carrying a debt.

*The ledger. Everything after this phase reads from it — the door, the curse, death, rebirth,
the laws. Its own PR. The door and the curse are Phase 14, not here.*

- **The geometry: nothing turns back above mokṣa** (below). First item, measured first.
- Three buckets, fuses, deferred firing.
- `bandha` and the gate at **105** (the exit, after Phase 7).
- A karma panel whose visibility is set by the active law.

**The geometry — decided by Bhaskar, 20 Oct, after the research.** *If you did not get
liberation you go back to the mortal world, are reborn, and seek it again; the cycle
repeats until you attain mokṣa.* That is the doctrine (Gītā 9.20–21: they enjoy heaven,
the merit runs out, they re-enter the mortal world) and it is the majority rule in the
surviving rules texts. Harikṛṣṇa's 500-square karmavipākapaṭṭa sends a pawn that misses the
divine realms round the whole board again; Jeṭhābhāī's Jain 84 (1877) walks the pawn that
misses its 1 on 80 to the end of the row, turns it, and drops it down the snake at 76 into
52, the human-birth row, "and one should climb up again"; the 72-board's last snake drops
the overreacher to 51, *pṛthvī*, the earth; Dampier (1895) has a throw beyond 72 start again
from 1; and Rasik Rāy's verse says it in so many words — *if one goes to rajas one arrives in
rasātal; thus one should play again, just as one wanders from house to house, birth to
birth.* Only Harikṛṣṇa's 84-square Vaiṣṇava rule bounces the pawn between 80 and 84 until
the admitting throw, and that is the rule the thesis names as the one that disrupts the
cycle. It is also, almost square for square, what Phase 7 built. So:

- **The turn-back at `TOP` goes.** Nothing above 105 sends a roll back down.
- **Pass 105 and you are in the heavens.** 106–110 stay as they are, five gods, five
  cards. The player walks them on their rolls. They are the fruit of merit, which is what
  the Indra card at 101 already says, and they are short: from 109 only a 1 stays in
  heaven, from 110 every throw leaves it. One to three turns, pleasant, and then
- **the throw that would carry the player past 110 is the fall.** Merit exhausted. The
  Shepard tone keeps rising through 106–110 and the fall is the only resolution, which is
  what `shepard.js` was built to do.
- **The fall ends the life.** It does not put a sixty-year-old on square 1 — Phase 8
  rejected that as a respawn, and the two clocks forbid it. The account closes with a line
  of its own (the heaven reached, the merit spent, what was still held) and the next life
  begins, counted in `mp-lives` like a death. This is the minimal version; Phase 16 turns
  that ending into the rebirth proper — the dream of the first life, the interlude, the
  cast crossing over.
  > *Superseded 29 Oct, decided by Bhaskar, built in Phase 17 step 1:* no throw passes 110. A die that would is not
  > offered; with none offered the life stays where it is in the heavens, its years standing still (`lHeavenStay`). Only
  > the exact throw reaches 110, and Śiva's snake there is rebirth in the seat, at once: the life is closed and kept in
  > `p.past`, and the same soul is born at square 1, of that life (`soulOf`/`bornOf`), with a new name and gender drawn
  > off a sequence of its own. The game ends only on a liberation, or when nobody (in a game with people, no person) is
  > left. `fellBy: "past"` and `lFell` are gone.
- **Retired:** the once-per-life Brahmā snake (108 → 1), `p.hasFallen`, Brahmā's
  `fallWhen` text, and `TOP` as a turning point. `TOP` remains the board's extent.
- **Not reopened:** "move up to the roll" (Phase 9) stays declined; two dice from 94 stay,
  and the choice sharpens — the die that lands, the die that stops short, the die that
  passes.
- **Measure first.** Run `npm run sim` with the new rule before building anything else in
  this phase and report, beside median, p95 and over-100: liberation per life, the fall
  rate, turns spent in the heavens, and lives per liberation. Per-life liberation will drop
  hard — from 104 the player needs a 1 on either die, about 31%, or both dice carry them
  past — and that is the thesis's first lesson ("no matter how close you are, you can still
  miss it") made mechanical. Phase 17 restates the target to match: rare within a life,
  certain across lives.
- **The door (Phase 14) reads from this.** At 105 with debt the player may sit and settle,
  or move on, and moving on is choosing heaven. Under Mīmāṃsā, where svarga at 101 is the
  goal and 110 is locked, the ritualist walks into heaven gladly and falls: Gītā 9.20–21,
  word for word.
- `CLAUDE.md`'s Phase 7 paragraph and `docs/REFERENCE.md §4` say the old rule; update both
  in the same PR.

**The reckoning — Émerson Moreira's mechanic, worked out with him over several
conversations.**

*The omen.* **A roll of 6 is the sign.** Whether it becomes a reckoning depends on where
the player is and what they are carrying. Early with a clean ledger a 6 is only a 6; late
and loaded it is almost certainly the floor opening. One visible marker, no second die, no
counter to explain, and players learn to dread the face they most want.

*Why the 6 and not the 1 (changed 20 Oct, after the research).* Every surviving rule gives
the 1 the opposite valence. In the Jain rules a 1 leaves square 1, climbs a ladder a pawn
is waiting at the foot of, moves up a footprint, and enters each vimāna; in Harikṛṣṇa's 84
a 1 takes the pawn from Vaikuṇṭha to mokṣa; Rasik Rāy's four-sided die names its faces
*dharma* (1), *artha* (2), *kāma* (3), *mokṣa* (4), and "by dharma and mokṣa one climbs
house by house; because of artha and kāma one wanders." The 6 is the world's face: Johari's
descent from Vaikuṇṭha into birth is on a 6, and the Sufi board's entry throw is the
maximum. Phase 10 had already made the 1 the lucky face of the slow arrival. So one rule
the player can learn, true on every square: **the 1 is the threshold face; the 6 is the
world's face.** The omen is the biggest throw turning out to be the worst, which is also
what greed feels like.

This replaces his first proposal of double ones on two dice. Two 1s in a row on one die is
the same 1 in 36, and moving to 2d6 would double the mean roll, halve the game, and break
the Phase 4 remedy cards that say a ladder is one square above you — on two dice a 1 is
unrollable.

*The rising chance.* **The probability climbs as the player nears the exit**, which is his
idea and a good one. It puts tension where the board was flattest, and it fixes a real
flaw in a flat rate: a debt from square 30 settled at square 35 costs nothing, whereas a
rising curve lands it where it hurts. So lying early feels safe and lying late feels
reckless. After Phase 7 this curve keys to **105**, not the top of the board, which is the
same shape as the bandha gate at finer resolution.

*The severity.* **Deterministic in karma, growing faster than linearly. No second die.**
He originally multiplied karma by a fresh roll; that stacks randomness on the one quantity
the mechanic exists to make legible, so the cost of a player's lying would be mostly a
coin flip wearing their choices as a coefficient. The dice decide *when*. The player's
choices decide *how much*. **The top of the severity scale is death** — see Phase 16 —
so the mapping from ledger to consequence must reach that far and be reported as a
distribution before it is committed.

*Timing.* The fuse and the omen combine rather than compete, and the combination is the
doctrine. A seed becomes **ripe** when its fuse expires, then waits for a 6 to land. That
is prārabdha exactly: released from the store, not yet fruited. The Jain charts have squares
for this very sequence — *sattā* (karma held), *udīraṇā* (stored karma stirred up to ripen
early), *uday* (karma in fruit) — and the scholar layer may name them beside sañcita,
prārabdha and āgāmi: two vocabularies, one ledger.

*A low ledger is not a weak event.* He worried that a small purge would fizzle. It should.
A player carrying almost nothing walks away from the reckoning nearly untouched, and that
is what they earned. Fix the presentation, not the number: the omen always produces the
card and the floor always seems to open. What follows scales.

**Which channel does an event belong to? Ask whether the player can steer away from it.**
This is what keeps two channels from drifting into five. A Phase 10 square event is
steerable — below 94 by declining to land there, above 94 outright, which is why Phase 10
restricts them to below 94. The omen on a 6 is never steerable. Steerable is āgāmi, what
the player is making by how they move; unsteerable is prārabdha, already released. Assign
every new event by that test.

**One ledger, not two.** Phase 10B applies an option's hidden value to the Phase 8 guṇas
and aims through `grow()`. A karma seed is a *second* thing an option plants — a timed
consequence — alongside that continuous drift, and the two must be reconciled explicitly
rather than left to disagree. The guṇas are what the player *is becoming*; the seeds are
what is *coming for them*. Say which an option changes, and lint that every option that
plants a seed also shifts a guṇa in the same direction.

**Rate check on the omen.** Phase 9 cut the median life from 49 turns to 34 (32 after 10B),
so a flat 1-in-6 fires about five times a life — nearer weather than fate. The rising
curve toward 105 is meant to shape this; measure the realised distribution in `sim.mjs`
rather than assuming the curve does the work.

**Superseded — the debt that advances you.** Émerson proposed (19 Oct) that a vice advance
the player some distance now and collect the same distance later: "you lie or you steal you
could advance 25 houses meanwhile you carry 25 houses back on debt." Not adopted. Phase 10
already settles it: the dishonest option advances you *more cheaply, not further*. That is
a structural guarantee that lying cannot dominate, whereas advance-now-pay-later
reintroduces the problem and hands it to tuning, which is the exact failure Phase 10 cites.
Phase 8's year clock does price it — position comes back, years do not — but a balance
argument should not be swapped in for a structural one.

Keep the word, though. **"Debt" is what to call a carried seed in front of the player.** It
is far more legible than "seed" or "fuse", which are our words and not theirs.

**The shared face is no longer shared.** Phase 10 made a 1 below 94 the lucky face of the
slow arrival; the omen was going to teach the player to dread the same face. Moving the omen
to the 6 (above) dissolves it: the 1 is the threshold face on every square — how you arrived
below 94, the question at the door in Phase 14 — and the 6 is the world's. Lint it: no
mechanic may use the two faces the other way round.

**Closed, from Phase 10: the divine row repeats.** 19.2% of lives landed on a square at or
above 94 four times or more, mostly 106–109 bounced around under Phase 9's two dice. The
geometry above removes the bounce, so there is nothing left to repeat on. Report the number
before and after as proof, not as a target.

**The ledger in the scholar layer — and nowhere else.** The karma model this phase builds
is a deterministic dynamical system: a seed planted early, a fuse, a firing keyed to a
later event, severity set by state, outcomes sensitive to everything in between. That is
not an analogy; it is what the engine is, and the scholar depth may say so accurately, in
the voice of someone qualified to say it. **No physics on the cards.** No quantum, no
relativity, no strings, no "the observer creates the world." Those are similarities of
vocabulary, not of content, and they would cost the game the one audience they are meant
to attract. The exception is the maker's note after Phase 20, which is beside the game and
in Bhaskar's own voice.

**Done when:** no roll turns back at 110; a player who passes 105 walks 106–110 and the
throw that would pass 110 ends the life with a closing line of its own, counted in
`mp-lives`; the Brahmā snake and `p.hasFallen` are gone and `npm run golden` is re-pinned
with a stated reason; a seed planted at square 20 ripens and then waits for a 6, firing
with a card that names where it came from; the chance visibly rises toward 105; severity
depends only on the ledger, and its mapping to consequence — up to and including death —
is reported as a distribution over 20,000 lives; the omen's realised rate per life is
reported; a player can reach 105 and be refused with a legible reason (Phase 14 turns that
refusal into the examination); the divine-row repeat share is reported before and after;
and liberation per life, the fall rate, turns in the heavens and lives per liberation are
reported alongside median, p95 and over-100, before and after.

---

### Phase 13 — The painted cloth  ✅ SHIPPED

> **Shipped** (23 Oct). No rules change: `git diff main -- src/engine` is empty, `npm run golden` is identical on all 20 seeds, and `node tools/accounts.mjs 2000` gives the same 16,000 hashes as `main`.
> - *The look as data.* `content/boards.json` holds the 110 board's palette, grounds by band, divine row, snake pigments, ladder, border (`scroll`) and superstructure (`vimana`); the build writes the palette into `styles.css` as `--b-*` tokens, and the lint, the contrast and frame tests and the vignette generator read it from there. Gold is the only gradient (lint).
> - *The hierarchy inverted.* Pale grounds per band (cream, pale ochre, pale green), dark ink on every label, gold on 101–110, flat indigo at 105. The snakes are nāgas: a seven-lobed hood with the spectacle mark, the one almond eye, a forked tongue and scales, each in one of five pigment pairs, with no two snakes that come within 1.6 squares sharing one (`snakeHues`). The ladders are yellow, outlined in vermilion. A floral scroll border, the vimāna arches over the divine row. The page is the cloth; dark is a setting (`prefs.theme`), no longer the system's choice. The panel is a ruled margin with rubric headings, and the introduction is a colophon.
> - *Vignettes for the 34.* The 13 snake heads, the 11 ladder feet and 101–110, each a scene of the square's moment drawn from a parts library (`tools/vignette-parts.mjs`, `art/vignettes.mjs`, `node tools/vignettes.mjs`) into `assets/sprites.svg` under the square's own id, so a missing sheet still shows the emoji (checked: with the sheet removed every square shows its emoji). Each is composed in the part of its square the snake or ladder leaves open. 105 keeps ॐ on the board; its vignette, the open door with a lotus, is its card's alone. Spec in `docs/CONTENT.md §7`.
> - *The first impression.* `?look=first` (the default until Bhaskar chooses), `veil` or `asrama` (`mp.look(x)` under `?debug`): `first` shows the whole cloth at full pigment through the naming and until the first throw, then ages as before. **The choice between the three is still open**, to be made with cold players as the brief says.
> - *Cost.* The page is 842,935 bytes (`main` 781,829). `npm run perf` on the throttled phone matches `main`: walk, climb and swallow at p50 16.7 ms on both, and the climb's longest frame 104–106 ms against `main`'s 105 (both noisy, 101–150 across runs); `quality=low` the same. The scales are drawn only at high quality.
> - *Still to do* (Phase 20): the other 67 squares keep their Phase 5 sprites. The parts already cover most of them: a single figure in profile with one object (rites, scenes, the aged figures of 60–100), the arch for the settings, sea, sun, moon, flame and lotus for the argument squares, and since 26 Oct the animals.
> - *After Bhaskar's review* (26 Oct). Presentation only, except the last item.
>   - *Ladders.* They read orange and covered the vignettes: the vermilion band was twice the width of the yellow. Now thinner, Indian yellow inside a thin vermilion line as §7 says (rails 0.14 of a square from the centre, was 0.18; the outline 0.07 wide, was 0.135). Vignette area they cover, by `drawLadder`'s own geometry over the 42 cells that carry one: **11.7% → 5.9%**; the worst, 34 Resolve and 65 Detachment, 49.6% and 49.9% → 25.8% and 26.7%.
>   - *The fables get vignettes.* 13, 16, 22, 35, 43, 45, 64, 71 and 94, the animal in profile at the moment of the turn: the monkey on the crocodile's back pointing at the tree, the crow letting the necklace fall into the cobra's hole, the lion springing at the brother who made it, the horse, the wheel and the driver, the jackal at the bowstring, Satyakāma's cows, the deer looking back, the cat at prayer with the hare and the partridge, the two birds on one branch. The parts are new in `tools/vignette-parts.mjs`. 42 vignettes on the board.
>   - *The first impression is the veil*, by Bhaskar's choice. `first` and `asrama` stay only under `?debug` (`?look=`, `mp.look`). **No cold-player test is planned.**
>   - *A reckoning takes the throw a 6 would have given.* The card says Roll (or Roll for {name}), never Roll again, and the turn passes. A single life plays identically (`npm run sim 20000 1` unchanged: median 29, p95 48, a reckoning 0.61 a life, liberation 27.6%), since its next throw is its own either way; in a game of two the turn order shifts (`sim 20000 2`: median 31 → 31, p95 50 → 50, the omen 1.01 → 1.01 a life, reckonings 0.52 → 0.53, liberation per life 23.2% → 23.6%, lives per liberation 4.30 → 4.23). Golden re-pinned for the rule, identical on all 20 seeds.


*Presentational only; no rules change. Asked for by Bhaskar on 21 Oct after the research
plates, and placed here on purpose: the door, the reckoning, the interlude and the
parallel-lives view all add cards and screens, and they should be born into this idiom
rather than restyled after it. It touches no engine code, so it is safe for `main`, and it
compounds with Phase 11, which is where cold players are lost. Its own PR. The sprites are
still governed by `docs/CONTENT.md §7`; this phase revises that section rather than
overriding it silently.*

**What the surviving boards actually look like.** Opaque gouache on cloth or paper: flat,
saturated pigment inside a single outline — vermilion, Indian yellow, indigo, green,
white — with gold leaf, dense ornamental borders, and *figures*: the trimūrti in the top
panel, nāgas with hoods, scorpions along the bottom row of the 1780 Lucknow board, the
Mysore boards' vice-animals in roundels, the Nepalese reclining dreamer for *antarikṣa*,
the Ashmolean snakes half-swallowing a woman, the Jain charts' rose-apple-tree scene and
the lokapuruṣa framing the whole grid. Not gradients. What reads as richness is saturation,
pattern, gold and figuration. Basohli, the idiom Phase 5 chose, is one of the hottest
palettes in Indian painting; what shipped is the idiom at a quarter of its pigment.

**What the live board does today** (21 Oct, played cold at `?first`). Every square's field
is coloured — ochre, teal, oxblood, sage, slate — while the figures are small dark-grey
pictograms and all thirteen snakes are the same grey. The page is dark navy, which no
painted cloth ever was. And because Phase 5 dims every square ahead of the oldest player,
the first screen of a life — the one a new player judges — shows about 95% of the board in
its dimmed state. The colour hierarchy is the inverse of the originals, which keep the grid
pale and put the pigment into the snakes, the figures, the border and the top row.

**Six items, in the order a painter would do them.**

1. **Invert the hierarchy.** Pale grounds — cream, pale ochre, a pale green — by band, as
   the originals vary the row grounds; the pigment moves into the figures, snakes, ladders,
   border and divine row. Keep the `--b-*` tokens and the contrast tests; retune the values.
2. **Snakes as nāgas, painted.** Hooded heads, scaled bodies, a tongue, an eye, and a colour
   per snake instead of one grey, so each is the creature its vice is (the article's point:
   snakes named for flawed characters). The 1780 board's snakes are the best-drawn thing on
   it. Ladders red-outlined as on the 72 boards. The Nepalese red benign snakes are the
   precedent if Phase 18 ever draws a ladder as a snake.
3. **Figures, not pictograms.** The square's sprite becomes a small painted vignette in the
   Basohli manner — a person in profile with the one eye, a flat field, a single outline —
   of the square's *moment*, not its abstract name. Figurative illustration per square is
   attested (Mysore, Nepal, the Jain a2 charts). Stage it as Phase 3 staged the moments:
   the 24 snake and ladder squares first, then the divine row (10), then the rest by band.
   The emoji fallback stays. Sprites remain SVG, inlined by the build.
4. **Gold and ornament.** Gold on the divine row and the border — a subtle gradient is the
   one honest gradient, since that is what metal does — a floral scroll in the border, the
   vimāna arches over 101–110 as on the 1780 board and the Jain superstructures. The cloth
   grain Phase 5 already draws into a bitmap sits under everything.
5. **The page is the cloth.** The board fills the page on a warm ground; the panel beside it
   becomes the margin and colophon, in the manuscript idiom the card already uses. Dark
   mode becomes a setting, not the default.
6. **The first impression, without losing the ageing.** The rule stays — a life never sees
   the whole board clearly — but the first screen must look like the painted object. Three
   options, to be measured with a cold player rather than chosen in the abstract: squares
   ahead at full pigment under a thin cream veil that lifts (a haze, not a desaturation);
   the ageing beginning only beyond the next āśrama; or the whole cloth shown in full colour
   through nāmakaraṇa and the first roll, after which it begins.

**Per-board look as data**, for Phase 18: a board declares its palette, its border and its
superstructure. The 72 is a cream ground with gold arches; the Jain 84 is framed by the
lokapuruṣa; the Sufi 101 has a Persian border. Build the 110 board's look through that
interface so the others are content, not code.

**Constraints that do not move.** Single file: SVG sprites inlined, one small tiled
texture, the page under a couple of megabytes. `npm run perf` on the throttled phone
matches `main`; on a weak device the ornament goes before the pigment and the ageing is
never dropped. The ageing paints only the art; labels, cards and clicks never dim
(`tests/contrast.test.mjs`). No WebGL, no 3D, no photographic textures, no glossy dark
chrome, no different idiom per band, no gradients anywhere but the gold.

**Done when:** a first-time player's first screen is the painted cloth at full pigment;
every snake is a distinct painted creature; the 34 priority squares carry vignettes and
the rest degrade to the present sprites; the contrast tests pass; `npm run perf` matches
`main`; a board can declare its palette, border and superstructure as data; and three
cold players asked "what is this?" say a painting or a cloth, not an app.

---

### Phase 14 — The door and the curse  ✅ SHIPPED

> **Shipped** (26 Oct). Rules change at the door and at 110; golden re-pinned for that (Śiva's snake, the computer
> sitting at the door, the door opening). With the curse off (`--curse=off`) every account `node tools/accounts.mjs`
> does not tag `above`/`karma`/`door` is byte-identical to `main` (2,732 of 16,000 untagged, 0 differ); with it on, 0 of
> 4,800 accounts differ beyond the curse's own sentences.
> - *The examination.* `content/door.json` keys a question to each vice (19, 29, 47, 55, 59, 77) with its answer, the
>   ladder that heals it (19 → 28, 29 → 34, 47 → 65, 55 → 44, 59 → 51, 77 → 23) and what climbing it was ("told the truth
>   about the homework"). `examineOf(p)` (`src/engine/karma.js`, pure) asks about the oldest debt still owed: the book
>   answers it if the life climbed that ladder after the debt was planted (seeds now keep `i`, where in the life), and the
>   line names the ladder and the age; otherwise each year is penance and the debt is paid after its weight. The door opens
>   when nothing is owed (`lDoorOpen`, then `lWin`); the years running out there close the account on what was still owed
>   (`lifeEndDoor`). The computer sits whenever it may. All six questions are checked against Ganguli's translation (Vana
>   Parva, Section CCCXI). §13.7's "What is poison? Desire" was wrong (the text's poison is "a request"), so 47 asks "What,
>   if renounced, makes one wealthy? Desire", and the lie's question is the text's "highest refuge" of heaven, not its guard.
> - *The door is public.* Anyone's arrival at 105 (refused or let through), each year sat there and a death there is the
>   line under the board, a computer's too (`landDoor` in `src/render/landed.js`), the one exception to Phase 11's rule.
>   A person's year at the door is a modal card like the reckoning's (`openExam`), and Space-to-roll and the aria-live
>   card are as they were. A sannyāsin's refusal says they may sit (`doorSit`).
> - *The door and the wheel of time* (`src/render/door.js`). An SVG over 105, under its label and the token: a lac door in
>   a gold frame behind the token while it waits, and round the square a rim with a spoke per debt it was refused for.
>   Each year the spokes still owed turn a quarter of a spoke's angle; a met or paid debt's spoke stops, gold. The door
>   opens on liberation and closes over the token, black, if the years run out. Reduced motion shows the same states
>   without turning. The scholar note on 105 says the board is the saṃsāra-cakra and the wheel is the kāla-cakra, time
>   turning while the token stands still.
> - *Śiva's snake.* A throw landing exactly on 110 is the fall too (`plan.fellBy`: `past` or `snake`, `lSiva`). One nāga
>   in a new palette token, `nila` (#1E2740), coiled round the trident on 110, down the board's right edge and along its
>   foot to a tail curled into square 1 (`sivaPath` in `src/render/ground.js`). It covers 1.64% of the 42 vignette cells:
>   110 35.6% (the coil, on purpose), 71 12.5%, 51 12.0%, 6 8.9%, nothing else.
> - *The curse.* Eight (`content/curses.json`: well, barber, bangles, temper, tuition, ration, aunt, river), one drawn per
>   life off its own sequence (`src/engine/curse.js`), said at the first landing old enough for it, on the person's line,
>   and closed in the account: after the first square of its family it lands on ("The barber had said so."), or at the
>   end, the other way. Drafts for Bhaskar's review.
> - *Balance.* `npm run sim 20000 1`, `main` → this phase: median 29 → 28, p95 48 → 48, over 100 0% → 0%, liberation per
>   life 27.6% → 39.8%, lives per liberation 3.63 → 2.52, the fall 64.4% → 51.2% (past 110 47.9%, Śiva's snake 3.3%),
>   years ran out 8.1% → 9.1%, refusals 0.138 → 0.141 a life, of which a sannyāsin who could sit 98.2%. Lives that sat at
>   the door 13.4%, years there median 2, p95 5, max 15; the book answered 583 debts and 2,213 were paid in penance;
>   through the door 12.1% of lives; deaths at the door 0.6%. Curses closed by landing 77.9%, the other way 22.1%. A square
>   at or above 94 landed on four times or more rose from 0% to 3.6%, because the years sat at 105 count. With
>   `--policy=dishonest` liberation rises most, 13.6% → 29.0% (lives per liberation 7.36 → 3.45, the fall 67.6% → 49.1%,
>   years ran out 18.8% → 21.9%): a life of the least-worth choices now pays its way through the door in penance. Whether
>   penance should cost more than a year per weight is for Phase 16, with death.
> - *Cost.* The page is 842,935 bytes (`main` 806,240). `npm run perf` on the throttled phone matches `main`: walk, climb and
>   swallow at p50 16.7 ms on both, the climb's longest frame 106 ms against `main`'s 108 (107 against 98 with
>   `--query=quality=low`, inside the noise Phase 13 measured), the turn-end repaint p50 2.6 ms against 2.7.

*`docs/NARRATIVE.md` §13.5–13.7, built on Phase 12's ledger and Phase 11's card. Decided by Bhaskar, 26 Oct. Its own
PR. The cast reacting to choices has moved to Phase 15.*

**1. The door is an examination** (the Yakṣa Praśna, Mahābhārata, Āraṇyaka Parvan; §13.7).
- A life refused at 105 is asked one question per unmet debt, chosen by the debt's vice (the seed's `holds` square: 19,
  29, 47, 55, 59, 77 today). §13.7's table where it covers the vice (greed 55, anger 59, desire 47, pride 77). For the
  lie (19) and sloth (29) the question and answer come from the Yakṣa Praśna itself — "what is heaven's highest
  guard? Truth", and "what is idleness? Not doing one's own duty" — and none is invented. Bhaskar reviews the wording.
- **The life answers, not the player:** Citragupta reads the answer from the book. Each year sat at the door is one
  question. The life **passes** if, after the debt was planted, it climbed the ladder that heals that vice, and the debt
  clears with a line that names that ladder and the age it was climbed ("…and at thirty-one Mīrā told the truth about
  the homework"). The healing ladders are Phase 4's pairs where a vice has one (greed 55 → Giving 44, anger 59 →
  Compassion 51) and, for the door alone, lie → Truth 28, sloth → Resolve 34, craving → Detachment 65 (the pair of 93,
  Clinging) and pride → Devotion 23 (the pair of 39, Pride of learning). It **fails** otherwise: the year is spent, and
  the debt clears by penance after as many sittings as its weight (1–3). When no debt is left the door opens: that is
  liberation.
- Only a sannyāsin may sit at the door (`canSit` as now). Anyone else refused moves on into the heavens. Report what
  share of refused arrivals are sannyāsins.
- If the years pass `SPAN` at the door, the life dies there, closing on what was still owed, in the door's words.
- **Never a number on screen.** Each sitting shows its question, the life's answer from the book, and whether the debt
  was cleared.
- The computer sits at the door when it can (the computer's dice ranking changes to match).

**2. The wheel of time at the door** (Émerson's idea, named in the game simply "the wheel of time", never as the
Buddhist Kālacakra tantra). When a life is refused, a wheel appears around 105: one spoke turns per year sat; each
cleared debt stops a spoke; when all are still the door opens; if the years run out, the wheel takes the life. Drawn in
Phase 13's idiom (painted, gold allowed as metal); reduced motion shows the same states without turning. One bilingual
line in the scholar layer: the saṃsāra-cakra is the board, the kāla-cakra is time turning while the token stands still.

**3. The door is a public event.** Anyone's arrival at 105, refused or let through, the computer's included, shows on
the line under the board in the door's words — an exception to Phase 11's rule that a computer's turn goes only to the
log. A refused player's token stands at a closed door drawn on 105 while it waits. This fixes "the computer didn't
want to win" (Émerson, 24 Oct): it had been refused, invisibly.

**4. Śiva's snake, 110 → 1.** Landing exactly on 110 takes Śiva's snake. Like the throw past 110 (unchanged), it is
the fall: it ends the life with the fall's closing line, and its tail on square 1 marks where the next life begins
(Phase 16 builds the rebirth; never a respawn now). Drawn across the board as one distinct blue-black nāga coiled round
the trident at 110 (a pigment none of the thirteen use), tail at janma, clear of the vignettes as far as the geometry
allows. Precedent: the 72-square boards put a snake on their last square to drop the overreacher into the world. 110's
card already carries the fall's moment and mirror.

**5. The curse** (§13.6). Eight curses, one drawn per life, drafted in English and Hindi for Bhaskar to review in the
PR. Spoken early (childhood or brahmacharya) by an ordinary person in the board's register — nothing oracular; if a
line could be printed on a poster it is wrong; it names a thing, never a square; it is tied to a family of late
squares, so most lives can close it by landing. Closed in the account either way: landed ("the woman at the well had
said so") or not ("she was right, in a way {name} never found out"). Machinery: a Phase 12 seed with words. Hindi
agrees with the player through `{m|f}`. `accounts.mjs --tag curse`; every account is otherwise unchanged.

**Constraints:** no number on screen; every string bilingual; single file; `npm run perf` matches `main`; reduced
motion, aria-live and Space-to-roll preserved; `?debug` helpers extended (`mp.door`, `mp.curse`, …) and none removed.

**Done when:** a refused sannyāsin sits at 105 and is examined one question a year, passes or pays each debt in
penance, and either goes through the door or dies at it; the wheel of time shows it; anyone's arrival at the door is
visible to everyone, and a computer is seen to be refused; Śiva's snake takes a landing on 110 to the fall; one curse
per life is spoken early and closed in the account either way, with all eight drafted for review; and before/after
tables report median, p95, over-100, liberation per life, lives per liberation, the fall rate (split: past 110 vs Śiva's
snake), refusals per life, the share of refused who could sit, years spent at the door, deaths at the door, and curses
closed by landing vs not.

---

### Phase 15 — The witness  ✅ SHIPPED

> **Shipped** (27 Oct). Step 0, on `main` first, from Bhaskar's check of Phase 14: the door's card is titled "The door" and
> shows 105's vignette, the liberation dialog goes "to the door, and through it", and every curse's Hindi `not` line says
> "…सही था/थी/थे/थीं, पर किस तरह, यह {name} कभी जान नहीं {पाया|पाई}" by the speaker's number and honorific.
> - *The ego rebellion.* 49, 54, 55, 56 and 59 carry `ego` (`content/situations.json`): the lower option (first, claim,
>   keep, eaten, strike), a line in the moment's voice for the card and one for the account. Choosing anything else throws
>   the ego's die (`egoThrow` in `src/engine/qbn.js`, a sequence of its own: the movement dice never change, and
>   `--ego=off` gives back `main`'s sim to the last digit). Its faces (`egoFaces`): with d = sattva − max(rajas, tamas), a 6
>   if d ≥ 0.10, 4–6 if d ≤ −0.10, 5–6 between, none at bhūmikā 5 and above. They are on the card and in the panel before
>   the choice, as die faces. On an ego face `resolveChoice` finishes with the lower option: move, years, guṇa, aims and
>   seed. The card tumbles the die (from the throw itself; at once under reduced motion), then says "The choice holds", or
>   gives the rebellion's line before the lower outcome under Gītā 3.36–37, with Duryodhana's *jānāmi dharmaṃ* (credited
>   to the later Pāṇḍava Gītā) beside 3.27 in the scholar layer. The account says the rebellion's line as the join
>   ("Meera meant to stop the hand, and the hand was quicker."), even where the snake is only counted. `p.witness` keeps
>   `{ sq, chose, took, i }` for every situation, with `face` and `faces` where the ego threw, for the Mirror.
>   `?debug`: `mp.ego(faces)`. The computer throws by the same rule.
> - *The cast reacts.* `witness` lines on 28 (the teacher), 49 and 56 (the spouse), one per option and, on 49 and 56, one
>   for a rebellion. The returns join uses the latest the member saw after the life met them, once (`account.js`). Lives
>   with such a line: mixed 3.5%, honest 2.5%, dishonest 4.2%; reacting to a rebellion 0.26% / 0.68% / 0. Drafts for review.
> - *Balance.* `npm run sim 20000 1`, `main` → this phase:
>
>   | | mixed | honest | dishonest |
>   |---|---|---|---|
>   | median, p95 | 28, 48 → 29, 48 | 26, 44 → 27, 45 | 30, 50 → same |
>   | liberation per life | 39.8% → 36.5% | 46.9% → 44.2% | 29.0% → same |
>   | lives per liberation | 2.52 → 2.74 | 2.13 → 2.26 | 3.45 → same |
>   | seeds planted per life | 1.45 → 1.92 | 0.01 → 0.46 | 3.51 → same |
>   | door refusals per life | 0.141 → 0.155 | 0.003 → 0.054 | 0.216 → same |
>   | ego throws / rebellions per life | 0.961 / 0.362 | 1.671 / 0.432 | 0 / 0 |
>   | lives that rebelled | 25.0% | 27.1% | 0 |
>
>   By the guṇas (share of throws, then the share rebelled): mixed policy sattva 25.4% / 16.9%, mixed 22.5% / 32.9%,
>   rajas-tamas 52.1% / 49.7%, none 0.0%; honest 62.1% / 16.8%, 19.9% / 32.2%, 17.8% / 50.5%, none 0.2% / 0. Liberation
>   still orders honest > mixed > dishonest (`tests/balance.test.mjs`). An honest life now plants debts: the ego's.
> - *Accounts.* `accounts.mjs 2000 --tag`: 5,982 of 16,000 accounts are untagged `witness`, and 0 differ from `main`; the
>   4,620 whose game threw the die without a rebellion or a witness line also match byte for byte.
> - *Decided by Bhaskar in review (27 Oct).* The four calls the PR raised stand as built: the `witness` tag also marks a
>   life whose account changes only by the teacher's line at 28; *jānāmi dharmaṃ* is credited to the later Pāṇḍava Gītā,
>   not the Mahābhārata; Phase 10 and 11's tests that choose the higher option on 55 pin the ego to no face
>   (`forceEgo = []`, `mp.ego([])`), and the rebellion is tested on its own; and the Hindi drafts are his to keep or change.
>   The two log lines lose "खाना" (it reads as food): `lEgoHeld` "…ने {pos} पर चुनाव किया, और अहंकार के पासे ने उसे टिका
>   रहने दिया", `lEgoRebel` "…ने उलटा ही करवाया". The content lint now fails on U+FFFD, the replacement character, in any
>   `content/*.json`.
> - *Cost.* The page is 859,951 bytes (`main` 843,122). `npm run perf` matches `main`: walk, climb and swallow p50 16.7 ms on
>   both, the climb's longest frame 109 ms against 105, turn-end repaint p50 2.8 ms against 2.5.

*Émerson's observer (22 Oct): the player is not the token but the one watching and
guiding it. Gītā 13.22, the self as upadraṣṭā anumantā, the witness and the one who
consents. The moments already say {name}, never "you". This phase makes choice carry
that. Its own PR.*

1. The ego rebellion. On four or five tagged situations (those whose lower option feeds
pride, greed or anger), the player chooses, then rolls. The ego owns some faces, set by
the life's guṇas: only a 6 if sattva leads, 5–6 if mixed, 4–6 if rajas or tamas lead,
none at the highest bhūmikās. On those faces the life takes the lower option instead. It
pulls only toward the lower option (choosing it, the ego already agrees). The faces are
shown on the card before choosing, as faces, never as a number about the player (Phase
10A's roll.faces field). The life pays the rebelled option's move, years and seed. The
account says it plainly ("{name} meant to give the better blanket back, and kept it").
The book records what the witness chose, for the Mirror in Phase 16. Texts: Gītā 3.36–37
("by what is a person impelled to wrong even unwillingly, as if by force?" desire and
anger, born of rajas), 3.27 (the guṇas act; the ego thinks "I am the doer"), and
Duryodhana's "jānāmi dharmaṃ na ca me pravṛttiḥ". A symmetric version (conscience
overriding a lie) is grace and belongs to the bhakti law in Phase 17, not the default.

2. The cast reacts to choices (moved from Phase 14): a cast member who returns can know
what the player chose at a situation they witnessed; one authored line per situation per
witnessing role; at least three.

Done when: rebellion faces visibly follow the guṇas; the sim reports rebellions per life
and per policy; a cold player who lost a choice can say why; at least three cast returns
react to a choice; and the witness's choices are recorded for the Mirror.

---

### Phase 16 — Death and rebirth  ✅ SHIPPED

> **Shipped** (27 Oct, PR #24), in four steps after a fix on `main` (step 0: the outcome's age, the curse heard only
> young). The ledger's top tier kills, and penance is two years a weight; the end of a life is read as the book, the path
> and the mirror; a named person's ended life is kept and born again, dreaming of the last; a death by ledger is first an
> animal interlude. The interlude rate follows death by ledger, and so follows play: intended, not to be tuned. Bhaskar's
> Hindi review changed the dream to agree with a "child" life before (`{आदमी|औरत|इंसान}`, `{का|की|का}`), the debt from a
> past life to its own age phrase said as a life before (`debtAt` → `debtBefore` in `debtIn`: "किसी पिछले जीवन में उठकर
> गिरा वह हाथ" / "the hand that fell, in a life before", which agrees with any debt; the lint holds every seed's debt to
> the phrase, once), the ledger's and the door's joins to "{age} बरस की उम्र में" as the debts say it, and the animal's
> dream to "कुछ रातों को {name} सपना {देखता|देखती} है…". Every account the review changed is tagged `karma`, `door`,
> `death` or `rebirth`. 10,000 souls a policy, up to ten lives each:
>
> | policy | liberation per life | lives per liberation | died a life: ledger · years · door | reborn | interludes per 100 lives | turns median · p95 |
> |---|---|---|---|---|---|---|
> | honest | 40.3% | 2.48 | 1.2% · 4.7% · 0.3% | 59.0% | 1.8 | 27 · 45 |
> | mixed | 28.0% | 3.57 | 8.1% · 5.8% · 0.8% | 70.1% | 13.2 | 28 · 47 |
> | dishonest | 18.4% | 5.43 | 17.8% · 6.0% · 1.3% | 77.9% | 28.6 | 29 · 47 |
>
> The steps, as they landed, follow.

*This phase grew on 20 Oct. It was Yama's screen and a saved record; it is now four things,
each of which makes the game unlike any other board game, and all four sit on Phase 12's
ledger and Phase 14's door. Its own PR, and probably the largest remaining. If it must be
split, split by the four headings below, each its own number; the fifth, what penance costs (added from Phase 14),
goes with the first.*

> **Step 1, death and penance** (branch `phase-16-death-rebirth`, 27 Oct). The top tier of Phase 12's scale is death
> (`reckonOf`: `dies`, `deathFormOf` in `src/engine/karma.js`). Its form is the age's and the stage's, never the vice's:
> an accident up to fifty (the roof that gives way over the trunk, 75), a calamity in vānaprastha (the bad year, Uṣasti's
> famine, 48), an illness in sannyāsa (the bad chest, 73). *By years* (`stageOfYears`, the squares' ages, not decades):
> accident to 50, calamity 51–68, illness from 69, so a death at 71 is a sannyāsin's, of illness (follow-up, 29 Oct). The debt that came due is not met, and goes with the rest into
> sañcita; the account closes "{name} died at {age}, {form}, {carry}", the debts in the door's words, or else the holding.
> Every death records its cause (`p.death.by`: ledger, years, door). Penance is two years a unit of weight (`PENANCE`),
> and a weight-three debt the book does not answer no penance pays (`UNPAID`): the door stays shut while it is owed, and
> the card tells a person plainly that they may sit on or throw on (`examNeverOn`); a computer, once told, throws on.
> `npm run sim` adds `--death=off`, `--penance=N`, `--unpaid=N`, and deaths by cause, age and form.
>
> **The 20% target for dishonest liberation was dropped (Bhaskar, 27 Oct).** Penance reaches only the lives that sit at
> the door, about 15% of dishonest lives; as many again walk through on arrival owing nothing, and most of the rest fall.
> No multiplier came near: 1× 28.9%, 1.5× 28.1%, 2× 27.8%, 3× 27.0%, 6× 26.0%. Making weight 2 book-only as well reached
> 22.0%, but the weight-2 debts are 49, 54, 55 and 56, the ego tests, so it would mostly punish honest lives for the
> ego's rebellions (mixed through the door 11.2% → 6.5%). Kept: 2× and weight 3 only. 20,000 single lives each:
>
> | policy | liberated | lives per liberation | died: ledger · years · door | fell | median · p95 |
> |---|---|---|---|---|---|
> | honest, before | 44.2% | 2.26 | 0 · 5.8% · 0.2% | 49.9% | 27 · 45 |
> | honest, after | 43.5% | 2.30 | 1.2% · 4.7% · 0.3% | 50.2% | 27 · 45 |
> | mixed, before | 36.5% | 2.74 | 0 · 12.5% · 0.8% | 50.2% | 29 · 48 |
> | mixed, after | 35.4% | 2.82 | 8.1% · 5.8% · 0.8% | 49.9% | 28 · 48 |
> | dishonest, before | 29.0% | 3.45 | 0 · 20.7% · 1.2% | 49.1% | 30 · 50 |
> | dishonest, after | 27.5% | 3.64 | 17.8% · 6.0% · 1.3% | 47.4% | 29 · 49 |
>
> Honest > mixed > dishonest holds. The ledger's deaths are mostly lives that a sent-back reckoning used to run out of
> years: deaths overall move 13.3% → 14.6% (mixed). By age (mixed): 40–59 78, 60–79 473, 80+ 1,065; by form: accident 9,
> calamity 200, illness 1,407. The death tier comes in 8.1% of mixed lives, not Phase 12's 3.3%: Phases 14 and 15 grew
> the ledger. `accounts.mjs --tag` adds `death`; the 11,804 accounts without it are byte-identical to main's. Golden
> identical on all 20 seeds; perf matches main.
>
> **Step 2, the book, the path and the mirror** (27 Oct). The end of a life is read three ways, as an ARIA tablist in
> `#lifeDlg` (`src/render/life.js`; arrow keys, Home and End): **the book**, the account, opened by one line, "Citragupta
> reads from the book." (he is the hand, with no lineage and no other sentence); **the path**, the moves in words
> (`pathOf` in `src/engine/account.js`: the age, the square's name, how it was reached, years sat or stayed on one square
> as one row, and how the life ended); and **the mirror**, three questions put to the player (`content/mirror.json`,
> `mirrorOf` in `src/engine/mirror.js`), chosen by what the life did, drawn off a sequence of their own. A rebellion in
> `p.witness` is always asked first, by the `mirror` phrases on the ego tests' options ("At forty-two you chose to give
> the change back, and the life kept it. Which of you was it?"). Unanswered, unrecorded (the test holds the state and
> localStorage unchanged), and skippable ("Back to the book"). Eight questions are drafted, EN and HI, for Bhaskar's
> review. The Citragupta line and the mirror belong to the dialog, not to `lifeText`, so every account is byte-identical
> to step 1's; `accounts.mjs --tag` adds `mirror` (an account whose mirror asks about a rebellion: 3,674 of 16,000).
>
> **Step 3, rebirth** (27 Oct). A named person's ended life is kept in `mp-samskara` (`src/engine/samskara.js` `soulOf`,
> `storeOf`/`storeWith`; at most six names; a liberation deletes it; `?first` neither reads nor writes). **Be born again**,
> beside Play again and in the book's footer, begins the next life from it (`bornOf`): the guṇas carry half, the heaviest
> unmet debt becomes an āgāmi seed `prior` that ripens at the age it was made ("the hand that fell, in a life before"), the
> cast's names return in other roles (`RETURNS_AS`, the Jātaka rule) and the account says so once ("In a life before,
> Vinod was the rival."). The account opens on the dream (`dream` on every option) and the forgotten holding (`forgot` on
> every snake): "Mirrors make Ravi uneasy, for no reason anyone can name." Play again starts clean. The turyā fade
> (`clearOf`) is on `#art` and `.cell .pic` alone. Every first-life account is byte-identical to step 1's (16,000);
> `accounts.mjs --lives=2` hashes 5,056 second lives, tagged `rebirth`. `sim --lives=4`, 4,000 souls:
>
> | policy | liberated within 4 lives | liberation per life | lives per liberation | reborn | life 1 → 4 liberated | ledger deaths life 1 → 4 |
> |---|---|---|---|---|---|---|
> | honest | 87.5% | 42.7% | 2.34 | 51.2% | 45.5% → 35.6% | 1.0% → 2.8% |
> | mixed | 74.8% | 30.9% | 3.24 | 58.7% | 36.1% → 24.5% | 7.9% → 14.6% |
> | dishonest | 59.9% | 21.5% | 4.64 | 64.0% | 27.6% → 16.2% | 18.0% → 28.9% |
>
> Later lives are harder: partly selection (the lives that reach life four are the ones that kept failing), partly the
> carried debt.
>
> **Step 4, the animal interlude** (27 Oct). A death by ledger, and only that, is owed one (`soul.animal`,
> `src/engine/animal.js`): Be born again begins it before anyone's next human life. The animal is the Panchatantra creature
> of the vice held (14 tortoise, 19 and 55 jackal, 59 mongoose, 88 cat, 39 lion; else the tortoise), born into the house of
> the last life's rival, or else its friend. One law, `rules.law = "animal"` in `src/engine/turn.js`: squares 1 to 40, one
> die, no six again, at most 15 throws; no omen, situation, seed, ego or curse; no card opens, and the line under the board
> names the square and, on 6, 8, 9, 11–16, 19, 22, 24 and 39, tells its Panchatantra mirror as the moment. Reaching 40, or a
> ladder out of the forest, earns the human birth back, nudged a tenth toward sattva and dreaming of the animal ("Some
> nights Ravi dreams of being a jackal."); falling short is an animal once more, and then human regardless. Its account
> names no years. The lint warns on any phrase that ranks a birth (`birthRanking`). `mp.animal(kind)`; `sim --lives`
> plays the interludes in the chain; `accounts --lives=2` hashes them, tagged `animal` (728 of 2,000 seeds' named lives).
> Every first-life account is still byte-identical to step 1's.
>
> **The interlude rate follows death by ledger, and so follows play: this is intended, and not to be tuned (Bhaskar, 27
> Oct).** Interludes are 1.8 per hundred lives (honest), 13.2 (mixed) and 28.6 (dishonest), far from the three per hundred
> the plan guessed, because the death tier is common in a careless life and rare in an honest one. That spread is the
> point: the animal birth is what a life's own choices bring about. An interlude takes 9 throws at the median, 15 at p95;
> 87–90% earn the human birth, about 9–11% go to a second round.
>
> **The report**, 10,000 souls a policy, up to ten lives each (`sim --lives=10`); single-life deaths from step 1's table:
>
> | policy | liberation per life | lives per liberation | died a life: ledger · years · door | reborn | interludes per 100 lives | turns median · p95 |
> |---|---|---|---|---|---|---|
> | honest | 40.3% | 2.48 | 1.2% · 4.7% · 0.3% | 59.0% | 1.8 | 27 · 45 |
> | mixed | 28.0% | 3.57 | 8.1% · 5.8% · 0.8% | 70.1% | 13.2 | 28 · 47 |
> | dishonest | 18.4% | 5.43 | 17.8% · 6.0% · 1.3% | 77.9% | 28.6 | 29 · 47 |
>
> Within ten lives 98.2%, 93.6% and 83.3% of souls are liberated. Honest > mixed > dishonest holds at every life.

**Why it was gated, and what ungates it.** After Phase 9 a life ran out of years in 2.5% of
games (3.5% after 10B) and the rebirth snake fired in 8.2%. Everything in this phase would
have been built for one player in forty. Phase 12's geometry changed that first: the fall
from the heavens now ends a life on every overshoot, not once per life on one square, so a
second life is the common case before this phase begins. A life now ends two ways — the
years run out, or the merit does — and this phase builds what comes after both. Measure it
against liberation per life and lives per liberation, not only against turn count.

**1. Death.** Deterministic, never random. A "rocks fall, you die" card is the most resented
mechanic in games, and it is also bad doctrine: the Yoga Sūtra's own account (2.13 — jāti,
āyus, bhoga) has prārabdha fix the span. So death is **the top of Phase 12's severity
scale**: late in life, a heavy ledger, the omen on a 6, and the floor does not open, it
closes. The ledger decides; the die only says when. Its *forms* are the three already on
the board and in the texts — accident, illness, calamity: the bad chest all winter, the
roof that leaks onto forty years in a trunk, Uṣasti's famine. **Not murder.** Not because
it is taboo, but because it needs an agent, and this game has no villains; the rival is the
nearest thing and he is not one. A death by ledger ends on `p.holding` as Phase 8 already
writes it — the vice the life was still carrying — and that line is the hand-off below.

**2. The second life dreams the first.** The Yogavāsiṣṭha is the text, not Zhuangzi: King
Lavaṇa watches a magician wave a feather and lives sixty years of hardship among strangers
before looking up to find a moment has passed; Gādhi dips his head in a river, lives a whole
life as a king elsewhere, and surfaces before the ripples settle. These are *about* what
Phase 8 already models — years lived against turns taken — and the Māṇḍūkya's four states
are already square 82. The structural version: after the fall from the heavens or a death by ledger,
the new life carries the old as a dream half-remembered. The second life's account opens on
it — *{name} dreams, some nights, of a woman named Meera who gave away the better blanket*
— and the forgotten holding of §13.6 (*{name} does not know why mirrors make {name} uneasy*)
is the same device. Citragupta's book (§13.5) is what makes it coherent: the dreamer is the
one who was written down. Nothing new in state; it is `p.holding` and `saṃskāra` given
their frame. **Art note:** at the highest bhūmikās the board itself loses solidity — a
fade, a translucency — so that turyā is *seen* and never named. The board already changes
with years lived; this is one more state of it, and the only visual effect this plan asks
for that Phase 5's Basohli idiom did not already contain.

**3. The animal interlude.** This is the sanctioned path. The guardrail says *use the animal
births and the third place (Chāndogya 5.10.8); never the varṇa ladder*, so animal rebirth
is how the game does rebirth at all, and the board is already built for it: the
Panchatantra is the mirror text, and when the player *is* the tortoise, the stick-in-the-
mouth story stops being a mirror and becomes their square. Bharata reborn as a deer
(Bhāgavata 5.8) is already written at 64. The Jātaka rule from §13 gives it its weight —
*at that time, so-and-so was the X* — so the dog's master is the rival from the life before,
and the cast list crosses the species line.

**Scope it hard or it is a second game.** An interlude: fifteen turns, the first two bands,
the Panchatantra squares' mirrors promoted to moments for the duration. **A different goal:**
an animal cannot reach 105; it can only *earn the human birth back*. That is a per-law exit,
and Phase 17 builds the machinery; this phase builds the one law "animal" needs. A life
that ends the interlude well is reborn human carrying something; one that ends it badly is
reborn animal again, once, and then human regardless — the interlude never becomes a trap.

**4. The Mirror.** A third view of the finished life, beside the account (*the Story*) and
the moves (*the Path*): the Yakṣa's questions put to the *player*, not the book, after they
have read what the book says they did. *When you helped, did you want the other person to
be free, or to need you? Which was harder to put down — the thing, or being the one who had
it? Would you have made the same choice if nobody knew?* Unanswered, unrecorded, skippable.
This was proposed (20 Oct) as pauses during play and relocated here: mid-game it is another
popup, and Phase 11 spent itself removing those; at the end the player has time and has
just been shown their life. The reckoning screen is the natural place — Citragupta reads,
then asks.

**What remains from the original phase.** Yama's reckoning screen is Citragupta's book read
aloud (§13.5); the scribe is the hand and never a character, and appears as the pan-Indian
texts have him, with no lineage attached. āgāmi flows into sañcita; a slice is drawn as the
next life's prārabdha. `saṃskāra` persists in wrapped localStorage: lives, traits, teachers
met, carried debts, last guṇa mix, **and the cast**, so the same souls return in different
roles — the friend of one life the teacher of the next — which is the reason to play again:
to find Mīrā. The three worlds: regions below square 1 so a fall has somewhere real to go.

**5. What penance costs** (from Phase 14, decided 26 Oct). At the door a debt the book does not answer is paid in penance,
a year per unit of its weight, so a life of the least-worth choices reaches liberation 29.0% of the time against 13.6%
before the examination (an honest life 46.9%). Decide here, beside death, whether penance should cost more: years per
weight rising with the vice, penance that can run past `SPAN` into death at the door, or a debt penance cannot pay. Keep
liberation per life ordered honest > mixed > dishonest (`tests/balance.test.mjs`) and report all three before and after.

**Done when:** a death by ledger is reachable, reported as a rate, and ends on the holding
line; the fall's closing line from Phase 12 opens onto the dream the same way; life two
starts measurably different from life one *and* opens on a dream of it; an
animal interlude is playable end to end in under fifteen turns and ends in a human birth;
the Mirror view exists and is skippable; and liberation rate, death rate and rebirth rate
are reported together, since this phase is the first in which all three are meant to be
non-trivial.

> **Follow-up before Phase 17 (branch `phase-16-followup`, 29 Oct): who the tokens are, and four fixes from Bhaskar's
> live check.** Presentational but for ?first; golden identical on 20 seeds and all 21,784 life accounts (`--tag
> --lives=2`) byte-identical to main's, so no death changed its form.
> - *Gendered figures.* Every stage past the child has a female and a neutral figure beside the male one
>   (`src/render/art.js`, pure; `artOf(art, gender)`), chosen by `p.gender` for every player, computers too. Female: two
>   plaits with ribbons and a frock; one long plait, drawn centred down the back on a ladder (`behind`); a sari with the
>   pallu over the shoulder and a bun; a grey bun, shawl and staff; a sannyāsinī in saffron; the crown. Neutral ("A
>   child"): the male figures with no beard or moustache and hair to the collar, but the householder, bare-headed (a
>   turban reads male) in a short crop with a fringe (longer hair read as a woman's at board size). No bindi, sindoor
>   or mangalsutra. The mongoose stands reared up, its tail behind as a counterweight.
>   `mp.sprites()` shows every set side by side on every band's ground.
> - *The stage names agree in Hindi* (`hiF`): बालिका, विद्यार्थिनी, युवा विद्यार्थिनी, वानप्रस्थिनी, संन्यासिनी; गृहस्थ for
>   both (गृहिणी is a housewife, not the āśrama); neutral takes the masculine.
> - *The animal interlude draws the animal*: tortoise, jackal, mongoose, cat and lion, walking, each in its own coat
>   with a thread at the neck in the player's colour. The panel names the creature, and no stage is toasted.
> - *Fixes.* The panel names the real end ("A debt came due", "Years run out at the door", "Years run out"); the card
>   that ends a life offers no throw; ?first keeps its saṃskāra in memory for the page, never reading or writing the
>   stored one, so Be born again dreams and a death by ledger reaches the interlude; the death form's bands are stated
>   in years above, and the sim's ledger deaths by age report in them (to 50, 51–68, 69+).
> - Tests: every figure is whole and bounded by its outline, and the token's edge keeps 3:1 on every square it can
>   stand on (`tests/contrast.test.mjs`, `tests/sprites.test.mjs`); smoke covers a woman, a man, a neutral player and
>   an animal.

---

### Phase 17 — The laws

*The payoff of the whole design, and now also the repair of its largest open number.*

> **In progress** (branch `phase-17-laws`, decided by Bhaskar 29 Oct). Step 0, on `main`: a phone's ordinary sheet
> closes on a stray tap. **Step 1, the endgame: exact to Śiva, and rebirth through his snake.** No die past 110 is
> offered (`movesFor`); with none the life stays (`plan.stay`, `lHeavenStay`, the line under the board says why). 110 is
> always Śiva's snake, and it is rebirth in the seat (`bornAgain` in `src/engine/turn.js`): the closed life is pushed to
> `p.past` whole, with the cast it had (`castKept`), and the same soul is born at square 1 from `soulOf`/`bornOf`, with a
> new name and gender off a sequence of its own, never a name at the table or in its cast. Every sequence of a life's own
> (omen, ego, curse, joins, mirror) is salted by `p.rebirths`, zero for a first life, so first lives draw what they did.
> A log line keeps which life it is about (`e.life`). A person's rebirth is a modal card between lives, offering the
> book of the life just closed (`openReborn`; the book has a tab per life, `pastOf` in `src/engine/samskara.js`); a
> computer's is the line under the board, as the door's is. The game ends on a liberation, or when nobody is left.
> Measured, 20000 one-player games a policy, before → after (a life is each `p.past` and the last):
>
> | | honest | mixed | dishonest |
> |---|---|---|---|
> | turns a life, median / p95 | 27 / 45 → 28 / 47 | 28 / 48 → 30 / 48 | 29 / 49 → 30 / 49 |
> | turns a game, median / p95 / max | 27 / 45 / 69 → 45 / 155 / 721 | 28 / 48 / 82 → 47 / 159 / 541 | 29 / 49 / 82 → 46 / 142 / 376 |
> | turns in 106–109, mean / p95 / max | 0.83 / 3 / 4 → 1.96 / 8 / 32 | 0.83 / 3 / 4 → 1.95 / 8 / 27 | 0.78 / 3 / 4 → 1.80 / 8 / 27 |
> | liberated, a life | 43.5% → 42.1% | 35.4% → 32.2% | 27.5% → 24.1% |
> | lives per liberation | 2.30 → 2.37 | 2.82 → 3.11 | 3.64 → 4.15 |
> | died, a life | 6.3% → 6.7% | 14.6% → 17.2% | 25.1% → 28.9% |
> | Śiva's snake, a life | 50.2% (with the throw past) → 51.2% | 49.9% → 50.6% | 47.4% → 47.0% |
> | rebirths a game | — → 1.05 | — → 1.03 | — → 0.89 |
> | a game ends liberated | 43.5% → 86.3% | 35.4% → 65.2% | 27.5% → 45.5% |
>
> **Step 1's follow-up (Bhaskar, 29 Oct).** *Heaven lasts as long as the merit:* a life entering 106–109 may begin one
> to four turns there, by sattva's share of its guṇas as it enters (`meritOf`: under 0.45 one, 0.6 two, 0.75 three, then
> four), a stay counting as a turn; then nothing is thrown, and Śiva's snake takes it from the realm it is in, told as the
> merit spent (`plan.spent`, `lSpent`, `fellBy: "spent"`; the account closes on that realm). The exact throw onto 110 is
> still the snake. *Save and resume:* the game in progress is kept after every turn (`mp-game`, `saveGame`/`loadGame` in
> `src/prefs.js`, wrapped, and anything unreadable is a new game) and resumed on reload; `?seed` starts its seed instead,
> and `?first` reads and writes nothing. *A cast member gone at 100 does not return:* once a moment says someone is gone,
> a life sent back down the board neither names them nor lives beside their squares (`castAlong`, `castArcs`), and the
> fate lint runs over every life. The log now agrees Hindi with the life a line is about. Turns in 106–109 after it,
> mean / p95 / max: honest 1.43 / 5 / 5, mixed 1.24 / 4 / 5, dishonest 1.03 / 3 / 5 (step 1 alone: 1.96 / 8 / 32, 1.95
> / 8 / 27, 1.80 / 8 / 27). Liberated a life 41.9%, 32.2%, 24.2%; lives per liberation 2.39, 3.10, 4.14; turns a life
> median 27, 29, 29 and p95 46, 48, 48. The fall splits into the exact throw 28.5%, 23.0%, 16.7% of lives and the merit
> spent 22.9%, 27.7%, 30.3%. Merit on entering, mixed: one turn 20%, two 36%, three 33%, four 11%; honest leans to four,
> dishonest to one. Accounts against step 1: every change is in a game that went above the exit.
>
> The turn cap (5000) was never hit. Per-life liberation falls a little because a life born through Śiva carries the
> heaviest unmet debt as prārabdha, and the door refuses it more (refused arrivals 11.8% → 19.0% honest). Accounts against
> `main` (2000 seeds, `--tag --lives=2`): every changed account went above the exit, or is a second life born of one that
> did; each later life of a seat is hashed under `sivaN`, tagged `siva`. Golden: page and sim identical through rebirths.
>
> **Step 2, the law machinery (29 Oct).** A law is a module (`src/engine/laws/`): `board.js` is the game as step 1
> left it, `animal.js` the animal interlude's rules that `turn.js` used to branch on, and `index.js` the registry
> (`LAWS`, `choosable()`) and `lawOf(state, i)`: the player's `p.law`, else `rules.law`, else the board's. The engine
> asks the law and never its id (a test reads `turn.js` for `.law ===`). The hooks so far, each the board's behaviour in
> `board.js`: `movesFor(state, dice, base)`, `edge`, `situation`, `choose` (every computer's policy), `omen`, `curse`,
> `merit`, `siva` (`"reborn"` or `"out"`), `afterTurn`, and `text` (`name`, `about`); the rest of §3.2's list (`climbs`,
> `grace`, `winAt`, `door`, `rebirth`) arrives with the laws that need them. A law is chosen on the between-lives card and
> per row in Players & rules, never in a viewer's first life and only when more than one is choosable, so the picker
> stays hidden until step 3; the saṃskāra record keeps the choice (`soulOf`, `bornOf`). `?debug` adds `mp.law(id[,
> "all"])`, the sim `--law=id`. Accounts byte-identical to step 1's follow-up (2000 seeds, `--lives=2`), the mixed sim
> identical, golden identical.

- Mīmāṃsā first (default), then Cārvāka, then the rest.
- A law-select screen that explains each in the player's own terms before they commit.
- Different win conditions per §2.7.

**This phase carries an urgent problem, not only a payoff.** After Phase 9, **97.5% of
lives reach mokṣa;** after Phase 10 it is 96.5%. That inverts the game's own thesis: the
intro text says the heavens past the exit are still the wheel, and a board where liberation
is the overwhelming default says the opposite. Phase 12's geometry moves it first (the
overshoot now ends the life), Phases 14 and 16 move it again — the door costs years, death
by ledger ends lives — and this phase is where the number is finally owned, because each
darśana's bar is a different kind of hard: Mīmāṃsā's is not reachable by board position at
all, Advaita's is knowledge rather than arrival, Cārvāka has no liberation to offer.
**Report liberation rate per law as the headline number**, ahead of median lifespan. A law
under which almost everyone is liberated has not been implemented, only decorated.

**The target has two clocks (20 Oct).** The thesis reads two lessons off the historical
boards: *no matter how close you are to the goal, you can still miss it and fall back*, and
*if only you try hard enough, or play long enough, you will always reach it in the end.*
Both are the game. So the number is not one number: **liberation within a single life is
rare under every law; liberation across lives approaches certainty.** The 96.5% was wrong
because it was per life. `sim.mjs` plays lives in sequence under `saṃskāra` (Phase 16) and
reports, per law, the share liberated by life 1, 3, 5 and 10. A law that liberates almost
everyone in one life is decorated; a law that cannot liberate anyone in ten is broken.

**The Jain law is mechanically distinct, not only differently worded** (20 Oct, from
Jeṭhābhāī's rules and the Jain verses). Three rules, none of them new state:
- *Ladders are not automatic.* Landing at the foot does not climb. A pawn standing at the
  foot climbs on a later turn by throwing the admitting 1 (either die from 94; the single
  die below); any other throw moves it on and the ladder is lost. "There are six ladders;
  if the soul stops for a moment at their feet, it goes to stop above." The 1 as threshold
  face, kept.
- *Two kinds of climb, one ledger.* The Jain texts picture the ascent as two ladders
  (*śreṇi*): *upaśama*, suppression, from whose top the soul falls back without fail, and
  *kṣapaka*, destruction, which liberates. In the game: a ladder climbed while the vice
  beneath it is still held is suppression — the climb is real, `p.holding` stays, and it
  fruits later; a ladder climbed clean is destruction. No second counter; the ledger
  already knows which it was.
- *Merit also binds.* Under this law every karma, meritorious too, must be shed before the
  door opens ("a snake swallows the arising of good and bad karma"), so the door's last
  question asks after the merit the life is proud of, not only its debts.
The Vaiṣṇava law keeps the shape of the 72-board: bhakti the one ladder to the end, jñāna's
ladder to bliss, karmayoga with no ladder of its own because the karmic squares around it
are its ladders. The Jain board of Phase 18 uses these rules natively; under Phase 17 they
are the law a player chooses on the 110 board.

**The door's last question is where the laws bite** (§13.7). *Which is the real path?* —
the Advaitin door and the Mīmāṃsaka door ask the same eight questions and accept different
answers, and the per-law answer tables are this phase's content. That is the point at which
the schools stop being annotation and become structure.

**The animal interlude's exit is a law.** Phase 16 builds the one law it needs; this phase
generalises the machinery that law runs on.

**The computer plays under a law too.** A computer opponent may run a different law from the
player — a Cārvāka at the table, who takes what is in front of him and expects nothing after
— and its choices at situations follow. This replaces the idea of named "archetype" bots: a
law is an archetype with a philosophy behind it, and the sim's `--policy` is already most of
the implementation.

**Done when:** `sim.mjs` sweeps all implemented laws and reports liberation per life,
liberation by life 1, 3, 5 and 10, median lifespan and death-stage distribution per law, and
the numbers differ in shape rather than only in mean; no law's per-life liberation is above
60% or below 5% without a stated reason, and no law's ten-life liberation is below 80%
without one; the Jain law's three rules hold under the sim and the golden run; and the
computer can be set to a law other than the player's.

---

### Phase 18 — Historical boards

Board geometry becomes data. The variants are documented, not invented; see
`docs/REFERENCE.md §4`.

- 110-square modern board (current, default).
- 72-square Vaiṣṇava board — **from the critical reading** in Schmidt-Madsen 2019,
  Appendix D1 (the PDF is in `research/`), not from any one museum board: Vaikuṇṭha at 68
  flanked by Śiva at 67 and Brahmā at 69; ladders bhakti 54 → 68, jñāna 37 → 66 (ānanda),
  dayā 17 → 69, suvidyā 45 → 67, vivek 46 → 62; snakes hiṃsā 52 → 35 (narak), ahaṃkāra
  55 → 2 (māyā), tamoguṇa 72 → 51 (pṛthvī). Square 1 is the only square no snake reaches.
- 84-square Jain board — from Appendix D2 and Jeṭhābhāī's rules (Appendix F2): a 1 to
  leave square 1, ladders climbed on a 1 from the foot, footprints up the centre column on
  a 1, the vimānas above the grid each on a 1.
- 101-square Sufi board ending at the throne.
- **What each board does above its winning square, as that board's own rule.** The 72:
  the last square's snake to 51, the earth. The Jain 84: walk to 84, turn, and down the
  snake at 76 into 52, the human row, to climb again. Harikṛṣṇa's 84: roam 80–84 until the
  1 — the bounce the 110 board had until Phase 12, available here as history and nowhere
  as a default. The 500: round the whole board again.
- Historical rules worth restoring, each as a setting: squares that need an exact roll and
  cannot be passed; squares that must be passed in order; **and entry on a six** — the
  traditional start rule, flagged in `docs/LANDSCAPE.md` and raised again on 20 Oct
  (Johari's descent from Vaikuṇṭha into birth is also on a 6, the world's face). Not the
  default: a first-time player waiting on a six is a worse first five minutes, and Phase
  11 was built to protect those.
- **Element counts, corrected 20 Oct from the thesis.** The critically read 72 has ten
  snakes and eight to ten ladders; the Jain 84 nine snakes, six ladders and nine
  footprints; the Marathi 108 forty snakes and twenty-two ladders; the Mughal 100–101 is
  17 ladders to 13 snakes. Snake-heavy is the norm. `docs/BOARDCRAFT.md §1`'s "15 ladders"
  on the Jain board counted the footprints, and its "every pre-modern board is balanced or
  ladder-heavy" is wrong; `docs/REFERENCE.md §4` is corrected, BOARDCRAFT should follow.
- Each board's own randomizer: the Vaiṣṇava board used seven cowrie shells (binomial,
  p = 0.5; a "1" comes up 8.7% of the time, so the threshold face is rarer there), the
  Jaina board a four-outcome stick die (1, 2, 5, 6). The shells took that board from 64.5
  turns to 100.5, so the randomizer is a real design lever and belongs with its board. The
  *setting* for it is Phase 20's, after content is fixed.
- The 72-square board is also the natural home for the animal interlude if Phase 16's
  first-two-bands version proves too thin: a short board for a short life.

**Done when:** board choice is a setting, the renderer handles non-10-wide grids, each
board's rules load with it, and the sim reports each board's distribution beside the
110-square baseline.

---

### Phase 19 — Parallel lives

- Multiplayer becomes four lives lived side by side rather than a race. Phase 11's
  nāmakaraṇa already asks who is playing and names each in turn; this phase gives that
  table something to be other than a race.
- End screen: guṇa trajectories plotted over time, choices made at shared squares,
  where each life ended — and each life's account beside the others', since the cast is
  drawn per life and two players at one table will have met different Mīrās.
- Keep the old race as a mode for a shorter game.
- **Decide the solo default here if Phase 11's test did not.** The default table is one
  person and a computer. If first-time players never mention the computer, it is not
  earning its two seconds a turn, and "just me" becomes the default once the door gives a
  lone life its tension.

**Done when:** a four-player game produces one comparison screen worth screenshotting, and
the solo default is decided on the record.

---

### Phase 20 — Content to full, and balancing

*Last on purpose. Everything here is measurement or content that would be wasted while the
mechanics were still moving.*

**Content.**
- All 110 squares with situations where they earn one. Target roughly 35 situations at two
  or three options each (ten today).
- Codex complete across schools, sources and figures.
- **Intention beneath the action** (20 Oct). On the giving situations — the blanket at 44,
  the plate at 56, the night with the sick child at 51 — options that differ not in *what*
  is done but in *why*: given privately to help, given publicly for the admiration, given
  reluctantly and resented. The same outward act, three inner relationships to it, and they
  map without remainder onto the three guṇas Phase 8 already tracks — sattva, rajas, tamas
  — so no new state. It is the Gītā's niṣkāma karma made playable, and the account can
  tell the three apart years later without ever having scored them.
- **The present-tense pass** (20 Oct). Squares 21–50 and the situations are where a
  2026 teenager lives, and the moments there must be recognisable to one. The rule: **the
  gesture names itself; the device does not.** "Buys the thing at last" is the model. *Tells
  a secret she was told, to a dozen people at once, before lunch. Lies awake looking at
  pictures of the rival's new house, one after another. Takes a picture of the gift before
  handing it over. Checks whether anyone has replied, and nobody has, and checks again.*
  These age better than any named device, need no loanword in Hindi, and are more
  Chekhovian, not less. About a dozen rewrites. The sharpest tool is a situation: *someone
  sends you a picture of a classmate that was not meant for you — forward it / delete it /
  reply to the sender*, which is square 15's dilemma in the form every fifteen-year-old
  has faced this month. The test: a fifteen-year-old reads the brahmacharya band and
  recognises their week. **No teen mode, no modern skin** — one board, with the present in
  it. The mirrors stay as they are; the contrast is the point.
- **Schools as cast** (`docs/NARRATIVE.md` §13.8): each darśana assigned per life, seeded, to
  a cast member — the teacher a Mīmāṃsaka who holds the rite is enough, the friend's uncle a
  Cārvāka who lives as if there is nothing after, the rival late an Advaitin. Research brief
  for the content: for each school, a figure who held it and a scene where they held it, so
  the player learns the schools the way anyone did before textbooks — by knowing who.
- **The mirrors that are glosses.** Ten to fifteen of the seventy-six are commentary wearing
  a mirror's clothes — the Muṇḍaka's two birds with "Sāṃkhya, Advaita and Madhva all claim
  the verse," the Subhāṣita on laziness filed fifth among Patañjali's obstacles. A mirror
  holds a *moment from a text*, a person doing something; the school voices already exist
  for the commentary. Every mirror with no person in it gets a scene.
- **The "oldest" pass.** Eight text-bridges from Phase 11 lean on *one of the oldest, two
  oldest, longest and among the oldest*. A first-time reader learns nothing from the
  seventh "oldest." Vary them.

**Balancing.**
- **The ablation harness.** For each snake and ladder, run N games with that element
  removed and report the change in median turns. This is the method from
  arXiv:2304.14486 and it answers the board questions by measurement instead of
  argument: which elements matter and which are decoration, what the
  no-ladder-reaches-heaven rule actually costs, and whether the Ahaṅkāra snake at 99→61
  is too punishing. Deferred to here on purpose — tuning a board while its content is
  still moving is measuring a moving target.
- **The randomizer setting** (die / cowries / stick die) belongs here for the same
  reason: it rebalances everything downstream, so it is a bad thing to introduce
  mid-content-build.
- **The final numbers.** Liberation rate overall and per law; death rate; rebirth rate;
  median, p95, over-100; the same-moment-told-four-times share; and the three-player test
  of Phase 11 repeated on the finished game, with the same three questions.

Note from *80 Days*: most playthroughs there reveal under ten percent of the text. A
single life should not see most of this content. That dissolves the volume problem,
because you are authoring breadth for replay rather than a script — and the cast is what
makes the replay wanted.

**After 20, beside the game rather than in it.**
- **The maker's note.** A few hundred words in Bhaskar's own voice: why a physicist built
  this, and what the karma engine is as a dynamical system — a seed, a fuse, a firing,
  severity set by state, outcomes sensitive to everything between. Linked from the title.
  This is the one place physics belongs anywhere near the game, and it is the thing that
  tells a researcher the maker is serious.
- **Store packaging.** The game is already a PWA and already works offline from the home
  screen. The Play Store takes it as a Trusted Web Activity with little fuss. The App Store
  wants a developer account and is hostile to thin wrappers; for iOS the honest route is
  the home screen, with a line on the page saying so.
- **The Legend** (*The River Remembers*, 20 Oct), if it is wanted at all: behind the title,
  for a player who has finished a life and wants to read it. Never first.

**Done when:** the content counts above are met; the ablation table exists and has been
read; the randomizer is a setting; the final numbers are in `docs/REFERENCE.md`; and three
first-time players can say what happened to their character.

---

### Considered and declined — 20 Oct

*Recorded so that none of these is re-proposed without a new reason. Each was weighed; the
reason is the thing to re-examine, not the idea.*

- **The Legend as an opening sequence.** Well made, wrong voice. *The river does not
  answer; it only flows* beside *she does not cry, which is worse* — the second is the game.
  The authoring rule is *if a line could be printed on a poster it is wrong*. Opening on
  six hundred words and a touch-the-water cutscene is Nibedita's complaint rebuilt in front
  of the first square, and it contradicts its own stated principle that the player should
  feel the philosophy before being asked to understand it. The idea underneath — something
  remembers everything — is already Citragupta's book, more precisely and more Indian.
- **Tapas or Gyāna tokens that cushion a snake's fall.** A visible currency that buys out
  consequences: the karma scoreboard every other reviewer warns against, a dominant
  strategy (hoard, then fall freely), and the doctrinal error the 108 snake exists to refute
  — that merit *insures*. Merit is spent, a little at a time, like a wage.
- **Single-school Advaita commentary "for semantic clarity."** Would gut the thesis. The six
  voices, the per-law doors, square 36's three-way split, MOKSHA's *they do not mean the
  same thing by it* — the design is built on not collapsing to one school, because the
  disagreement is the most honest and most interesting thing about the tradition. Choosing
  Advaita is itself a theological position.
- **WebGL, 3D, particle trails, camera pans; Redux; WebSockets and server rooms; chat.**
  Guardrail #1: never break the single-file deploy. The flatness is the art — Basohli is
  flat primaries, a single-weight outline, a profile face with one eye, and no 3D game
  looks like that. A board is a map; maps are flat. Server multiplayer is a different
  product with hosting, moderation and accounts. What adds depth without breaking any of
  this: the board's ageing (built), the translucency at turyā (Phase 16), parallax on the
  sheet.
- **Physics on the cards.** Quantum mysticism in all its forms — the observer and the
  world, entanglement and interconnection, strings and Om, holography and Indra's net (which
  is Huayan Buddhist). Similarities of vocabulary, not content; the audience they are meant
  to attract is the one they repel. Lavaṇa's sixty years is the *opposite* of time dilation.
  The one true bridge is chaos as the accurate description of the karma engine, in the
  scholar layer and the maker's note.
- **A teen mode or modern skin.** Doubles the content and splits the board. One board, with
  the present in it, by the gesture-not-device rule.
- **Mirror questions as pauses during play.** Another popup, in the phase after the one that
  removed them. Relocated to the end of the life, Phase 16.
- **Random sudden death.** Never random. The top of the severity scale, deterministic in the
  ledger, Phase 16.
- **Murder as a form of death.** Needs an agent; the game has no villains.
- **"Move up to the roll."** Prototyped in Phase 9 and rejected on measurement: once it
  reaches the divine row the player declines to land on 108 and the rebirth snake never
  fires. Recorded here as well as in Phase 9 so it is not re-proposed.
- **Advance now, pay later.** See Phase 12, superseded.
- **The turn-back at 110.** Built in Phase 7, found on 20 Oct to be Harikṛṣṇa's 84-square
  rule (roam 80–84 until the 1), the one the thesis names as disrupting the cycle. Replaced
  by the fall back to the world; kept only as that historical board's own rule in Phase 18.
- **The omen on a 1.** Every surviving rule makes the 1 the admitting throw. Moved to the 6.
- **A heaven interlude as a separate band.** Proposed 20 Oct as the mirror of the animal
  interlude; absorbed into the row above 105, which already is one.
- **The subtle-body layer, the Sāṃkhya layer, snakes as nāḍīs.** All real on the 72-board
  (the realms as cakras, the three rivers as Iḍā, Piṅgalā and Suṣumnā, the guṇas and
  elements along the top rows), and all inert in play. They would pull the game toward one
  school and one body. Scholar-layer notes at most.
- **Lettered sub-phases.** 10A, 10B and 10C happened and are closed. One number per phase.

### Open from the research — 20 Oct

*Candidates the research offered that are not scheduled. Each is cheap; none is decided.*

- **Snake tail as fruit.** The thesis reads every snake and ladder as a karmic link —
  origin the action, terminus its ripening (hiṃsā → narak, bhakti → Vaikuṇṭha). An audit of
  our snakes: does each landing moment read as the fruit of its head's vice? Where it does
  not, the account's "years undone" join could say what ripened. Fits Phase 12 or 20.
- **Two parables as situations.** The rose-apple tree (six men want the fruit; one cuts the
  trunk, one the branch, one the twig, one the cluster, one picks what is needed, one
  gathers the fallen) is the Jain *leśyā* parable and is painted on the boards; the
  honey-drop man over the well, taken with the drop while the elephant and the snakes wait,
  is in the Mahābhārata too. Six options and two, no caste, no device. Phase 20, or the
  interlude's mirrors.
- **The allurement zone.** On the 72, *antarikṣ*, *nāglok* and *gandharvlok* sit together
  with no snake and no ladder: fantasy, entertainment, nullity — pleasant squares where
  nothing happens and years pass. A named idle stretch, if the present-tense pass wants one.
- **The look-ahead.** The thesis's experiential reading: the drama is the player inspecting
  the squares ahead before the throw. An affordance, not a mechanic — the row ahead
  legible at a glance.
- **The grandmother's grid.** The thesis ends with a friend recalling his grandmother
  drawing an unnumbered grid in the dirt, tracing a route and explaining each square while
  the children moved pebbles from heaven down to hell and back. If the Legend behind the
  title needs an image, that is the attested one.

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
- **One number per phase; no lettered sub-phases.** 10A, 10B and 10C happened and are closed.
  From 11 on, a piece of work that needs its own PR gets its own number, and the phases after
  it move up.
- **The gesture names itself; the device does not.** No named technology in a moment or an
  outcome. "Buys the thing at last" is the model: a 2026 reader knows it is a phone, and a
  2046 reader will still know what was meant. Behaviour outlasts the thing it runs on.
- **Nothing turns back above mokṣa.** Past 105 the only way is on, and then down: the
  heavens are walked, no throw passes 110, and the exact throw onto it is Śiva's snake, which ends the life and begins
  the next (Phase 17). A throw that offers no die stays: a stay is not a bounce. No bounce, no once-per-life exception,
  no square that sends a roll back toward the exit (decided 20 Oct; the stay, 29 Oct).
- **The 1 is the threshold face; the 6 is the world's face.** The slow arrival, the
  admitting throw, the question at the door are 1s; the omen, the entry into the world, the
  fall are 6s. No mechanic uses them the other way round.
- **No hierarchy of birth, anywhere, ever.** The game's only ranking is karma. This is a
  standing decision, not a preference to be reweighed.

  The live risk is Phase 10 and 11 content. The rebirth doctrine comes from Chāndogya
  5.10, and 5.10.7 ranks the good wombs as brāhmaṇa, kṣatriya and vaiśya against dog,
  hog and caṇḍāla. **Use the animal births and the third place (5.10.8). Do not use the
  varṇa ladder, and do not reword it into an equivalent** — "a low birth", "a better
  family", "born badly" are the same claim in a clean shirt.

  What stays, because it is the board's strongest material and must not be stripped by a
  literal reading of this rule:
  - varṇa words as plain description of who a character was ("the brahmin's wife" at 59,
    "a starving brahmin" for Ushasti);
  - stories whose point is that conduct outranks birth — Satyakāma at 28, Raikva at 54,
    the Buddha's line at 20. These undercut hierarchy and are the reason the board can
    handle the subject at all;
  - a scholar note naming a text's caste rules as contested, as the Manusmṛti and Gṛhya
    Sūtra glosses already do.

  What never appears: any card making birth a reward or a punishment, any ranking of
  human births, any euphemism for one.

  `lint-content.mjs` should **warn, not fail**, on new content containing varṇa terms, so
  a human reads it. Failing the build would delete Satyakāma.

- **Balance against p95, not the mean.** Any phase that changes movement or adds a
  mechanic reports median, p95 and the share of games over 100 turns, before and after.
  The mean hides the tail and the tail is what players feel. Baseline after Phase 4:
  median 41, p5 22, p95 82, mean 45.0, max 204, 1.7% over 100 turns. For reference the
  Milton Bradley board runs 3.3% over 100, which is the guardrail. **Current, after Phase
  9: median 34, p5 18, p95 71, mean 37.8, max 172, 0.7% over 100.** After Phase 10: median 32, p95 65, 0.3% over 100,
  liberation 96.5%. Treat a rise in p95 or
  in over-100% as a regression that needs a reason — and note that Phase 9 cleared the
  guardrail partly by making lives shorter and safer, which is why **liberation rate now
  needs watching alongside it** (Phase 17): turn count is no longer the only thing a
  movement change can break.
- Graceful degradation everywhere: missing situation falls back to story card, missing
  Hindi shows English and warns, missing sprite shows the old emoji. Never a blank card.

---

## 6. Known fixes

- README says `Jhooth · Fibbing` at square 19; code has `skt: "Asatya"`. Reconcile.
- Square 36, `tat tvam asi`, is where Vedānta splits three ways: Śaṅkara reads
  identity, Rāmānuja a mode of Brahman, Madhva re-splits the sandhi to *atat tvam asi*.
  One card carrying that disagreement does more than ten new narrative squares.
  **Still unwritten as of Phase 9** — `readings.json` 36 has an empty `schools` — which
  makes it the highest-value unwritten card on the board.
- ~~The heavenly row 101–109 is the thinnest content on the board.~~ **Resolved, and the
  other way round.** Phases 2 and 3 turned it into a descending arc of erasure: the
  offerings still travelling, one sentence still repeated below by someone who does not
  know where it came from, a habit kept in one house by people who think it was always
  done that way, and at last the name itself coming loose. It reads as some of the best
  writing on the board. Keep it, and do not overlay the darśanas onto it.
- `docs/BOARDCRAFT.md §1` counts the Jain board's footprints as ladders (15) and says every
  pre-modern board is balanced or ladder-heavy. Corrected in `docs/REFERENCE.md §4` on 20
  Oct; BOARDCRAFT should follow when Phase 18 opens it.
- The exit moved to 105 in Phase 7, so this item's old square number was stale. `MOKSHA`
  now carries the premise — "Nyāya, Sāṃkhya, Mīmāṃsā and three schools of Vedānta all say
  you have arrived here. They do not mean the same thing by it." — but **no school voices
  are written for it** (`readings.json` 105 has an empty `schools`). Setting the
  definitions out side by side is still a better last beat than a trophy, and it is now a
  small job on top of a line that already exists.
