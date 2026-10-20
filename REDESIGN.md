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
4. [Phases 0 through 16](#4-phases)
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

Phases 4 and 7 lay the groundwork. Bounce-back already lets a player touch the top of
the board and come back down, and once the exit sits at 105 a player can pass straight
over liberation without taking it. Arriving and being let through are two different things
before the gate exists; the gate only has to supply the reason.

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
randomizer. Both are in Phase 15, and the reasoning is in `docs/BOARDCRAFT.md §4, §6`.

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
> - *Whose age:* all the lives at once. Sepia is what every player has left behind, keyed to the youngest player. Dim is what no player has reached, keyed to the oldest. The squares between stay in full colour. The drone follows whoever is furthest on. `lens(state, i)` in `render/age.js` already takes one player's index, for Phase 14.
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
> No tail from 20 to 60 meets the Phase 4 bar; the cliff is between 100 and 98, as it was between 101 and 95 before. **Item 5's premise measured false:** the fall does not fire on "a minority of approaches" but in 59% of lives, 1.45 times each, because from above the exit can only be reached from 109 (a 6) or 110 (a 5), so the higher heavens hold a player while 108 keeps being hit. 108 → 48 ships anyway, with a quarter of lives over 100 turns, and is accepted until Phase 12, when the fall ends a life instead of lengthening one. A once-per-life fall measured 55 / 116 / 9.7% and was not taken.
> - *Changed after shipping (2026-10-19, fix pass before Phase 8):* the fall now goes to **1**, birth, so that it really is a rebirth. 108 → 1 on every landing measured unplayable, so the fall was made rarer instead of shorter: it takes only a player climbing onto 108 (a bounce down onto it is just Brahmā's square) and at most once in a life (`p.hasFallen`). Brahmā's card says so (`fallWhen`).
>
> | rule | median | p95 | over 100 | fall fires |
> |---|---|---|---|---|
> | 108 → 48, every landing (shipped) | 61 | 194 | 25.4% | 59% |
> | 108 → 1, every landing (rejected) | 71 | 253 | 34.4% | 59% |
> | **108 → 1, climbing only, once** | **54** | **123** | **12.5%** | **42%** |
>
> 59.5% of lives are now won from above; with two players the median is 38, p95 86, 1.8% over 100.
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
becomes a true rebirth that *ends a life* rather than lengthening one. At that point the
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
- **Later, a karma-responsive partial.** Once Phase 11 exists, accumulated karma adds a
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
>   the race alone. YS 2.13 (jāti, āyus, bhoga) is the hook for Phases 11–12, where prārabdha sets the span.
> - *When the years run out, the life ends.* The reason, on the record: a life's length is almost entirely its snakes.
>   Across 20,000 single lives, snakes taken by game-length quartile run 2.1 / 5.1 / 8.0 / 14.6, and 22.1 in the
>   slowest 5%; the lives that die took 16.5 snakes on average against 6.1. Death is where a life the snakes already
>   wrecked comes to an end. That is the teaching, and it needs no new content. Only re-walking outruns the table,
>   which tops out at 90, so only snakes bring it about. *Rejected:* rebirth at square 1, which before Phase 11
>   gives karma anything to carry is a respawn: it would teach that rebirth costs nothing and reopen the tail the
>   fix pass closed. *Rejected:* the divine row, which works as a ladder for anyone who dies early and is wrong in
>   the theology: the divine row is earned by merit and spent by merit, which is what the 108 snake is for.
>   - A person whose years run out reads their life at once instead of watching the others finish. A game of one
>     person ends on that account ("The life of Asha"), never on a race nobody won. A race result ("No one reached
>     Moksha.") is kept for games of several people. Once no person is alive the game is over; the computers do
>     not play on for nobody. A dead token stays where it fell, greyed in the paint only.
>   - The account's last line names what the life was still holding: the vice taken most, the latest on a tie, in
>     its snake's `holding` ("…on ground already walked once, still asking whether the son has eaten."). It is kept
>     as `p.holding` for Phase 12 to carry over.
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
(§2.3) once Phase 11 exists; before that, approximate from the guṇa mix. This is the
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
>   Phase 11 can read āgāmi from it. Ranked for the sim and the lint by dharma, then guna.
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
>   27/47/0.1%. **Liberation 97.5% → 96.5%**, down, not worse; Phase 13 still owns it. A square landed on four times or
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
accrues. The settlement is Phase 11's.

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
>   joined by the recall of the moment where they were met ("Tārā, who once broke a biscuit badly with Meera, was there
>   again: "). An echo outranks it; a fold, a "back where" line or a tally names nobody and is not a return.
> - *Fates*: after the end line, one per member the last life met, in order. Drawn in the player's years between the
>   board's last word on them (landed or not) and every landing on their squares, and before 100 if the life told it;
>   the father's is 53's age. `lintFates` holds it for 500 seeds a gender in the build, 2000 in the tests.
> - *Measured* (4000 lives): 99.7% name someone, 58.5% join a return by name, 99.6% close on a fate, 4.1 fate lines
>   a life. **Nothing moved**: `npm run sim` for one and two players is byte-identical to Phase 10, and with
>   `names.json` `cast` stripped all 16,000 accounts of `node tools/accounts.mjs 2000` (seeds 1–2000, both languages,
>   both genders, and two unnamed computers) are byte-identical to Phase 10.
> - *For Bhaskar*: the list is the §13.3 starter, unchanged. The lint warns that Līlā (7) and आनंद (70, 89) are also
>   words in the mirrors; Arjun, Rādhā, Tārā, Kabīr and Mīrā carry mythic or devotional echoes; Jaya is rarely a man's
>   name. The Hindi of every recall, intro and fate line wants a native ear.

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

### Phase 11 — Karma

- Three buckets, fuses, deferred firing.
- `bandha` and the gate at **105** (the exit, after Phase 7).
- A karma panel whose visibility is set by the active law.

**The reckoning — Émerson Moreira's mechanic, worked out with him over several
conversations.**

*The omen.* **A roll of 1 is the sign.** Whether it becomes a reckoning depends on where
the player is and what they are carrying. Early with a clean ledger a 1 is only a 1; late
and loaded it is almost certainly the floor opening. One visible marker, no second die, no
counter to explain, and players learn to dread a face they currently ignore.

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
choices decide *how much*.

*Timing.* The fuse and the omen combine rather than compete, and the combination is the
doctrine. A seed becomes **ripe** when its fuse expires, then waits for a 1 to land. That
is prārabdha exactly: released from the store, not yet fruited.

*A low ledger is not a weak event.* He worried that a small purge would fizzle. It should.
A player carrying almost nothing walks away from the reckoning nearly untouched, and that
is what they earned. Fix the presentation, not the number: the omen always produces the
card and the floor always seems to open. What follows scales.

**Which channel does an event belong to? Ask whether the player can steer away from it.**
This is what keeps two channels from drifting into five. A Phase 10 square event is
steerable — below 94 by declining to land there, above 94 outright, which is why Phase 10
restricts them to below 94. The omen on a 1 is never steerable. Steerable is āgāmi, what
the player is making by how they move; unsteerable is prārabdha, already released. Assign
every new event by that test.

**Rate check on the omen.** Phase 9 cut the median life from 49 turns to 34, so a flat
1-in-6 now fires about six times a life rather than eight — still nearer weather than
fate. The rising curve toward 105 is meant to shape this; measure the realised
distribution in `sim.mjs` rather than assuming the curve does the work.

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

**The omen and Phase 10's slow arrival share a face.** Since Phase 10 a 1 below 94 is the lucky face on the
roll-dependent squares (came slowly, and noticed). They can coexist, since those squares are below 94 and the omen
rises toward 105, but a player taught to dread a 1 is also taught to hope for one. Decide here which one reads.

**Open, from Phase 10: the divine row repeats.** 19.2% of lives land on a square at or above 94 four times or more,
mostly 106–109 bounced around under Phase 9's two dice. Phase 10 cannot touch it, by its own boundary.

**The curse — a fuse with a sentence** (`docs/NARRATIVE.md` §13.6). One fuse per life speaks.
Early, in childhood or brahmacharya, someone says a line the player cannot yet understand — in
the board's own register, nothing oracular — seeded to a *family* of late squares. Land on one
and the account closes it: *the woman at the well had said so.* Never land and it closes the
other way: *she was right, in a way {name} never found out.* Eight curses, one drawn per life.

**The door is an examination** (§13.7). Émerson's gate — arrive carrying debt, be held, work it
off — in the game's idiom: the Yakṣa Praśna. Each turn at 105 is one question; **the life
answers, not the player**, Citragupta reading it out of the book; a question the life fails
costs a year. The player never sees a number and feels the debt as how long they stand there.
Each turn at the door is still a Phase 9 turn — two dice, and the sannyāsin's option to sit the
year in practice — and **practice pays the debt down**, so the door is a choice between moving
and clearing rather than a counter emptying. That is the one place the allocation loop Phase 9
declined earns its complexity.

**This settles the open item above about the shared face.** At the door a 1 is the question.
Below 94 it is how you arrived. They never share a square.

**Done when:** a seed planted at square 20 ripens and then waits for a 1, firing with a
card that names where it came from; the chance visibly rises toward 105; severity depends
only on the ledger; and a player who reaches 105 carrying debt is examined rather than refused —
the Yakṣa's questions, answered from the life, one a turn, a year for each the life fails, and
never a number on screen.

---

### Phase 12 — Death and rebirth

- Yama's reckoning screen reading the ledger.
- āgāmi flows into sañcita; a slice is drawn as next life's prārabdha.
- `saṃskāra` persisted in localStorage: lives, traits, teachers met, carried debts,
  last guṇa mix.
- The three worlds: add regions below square 1 so a fall has somewhere real to go.

**`p.holding` already exists.** Phase 8 computes the vice a life was still holding when
its years ran out, and names it in the closing line of the account. That is the concrete
hand-off into the next life: no new state to design, only a rule for what it does on
arrival.

**This phase is gated by how rare death now is.** After Phase 9 a life runs out of years in
2.5% of games (was 16.8%) and the rebirth snake fires in 8.2% (was 37.3%). Yama's reckoning
screen, the saṃskāra record and the worlds below square 1 would all be built for something
one player in forty ever sees. Either the exit gets harder first — see Phase 13 — or this
is content written for an audience that does not arrive.

**The cast crosses lives** (§13.6, §13.8). `saṃskāra` carries the cast, and the Jātaka rule
applies — the same souls in different roles, the friend of one life the teacher of the next —
which is the reason to play again: to find Mīrā. **The forgotten holding:** `p.holding` from the
last life becomes a line early in the next account that the player cannot explain (*{name} does
not know why mirrors make {name} uneasy*), solved by reading the last life. Replay as detective
work.

**Yama's reckoning screen is Citragupta's book read aloud** (§13.5). The account is the
record; the scribe is the hand and never a character. He appears as the pan-Indian texts have
him, with no lineage attached.

**Done when:** life two starts measurably different from life one and the difference is
legible to the player on the birth screen.

---

### Phase 13 — The laws

- Mīmāṃsā first (default), then Cārvāka, then the rest.
- A law-select screen that explains each in the player's own terms before they commit.
- Different win conditions per §2.7. These are the payoff of the whole design.

**This phase now carries an urgent problem, not only a payoff.** After Phase 9, **97.5% of
lives reach mokṣa.** After Phase 10 it is 96.5%. That inverts the game's own thesis: the intro text says the heavens
past the exit are still the wheel, and a board where liberation is the overwhelming default
says the opposite. It also strands Phases 11 and 12, whose content only fires on lives that
fall or run out of years.

The cause is not a defect in Phase 9 — the agency it added is right, and the loop repetition
is genuinely gone — but the exit got much cheaper as a side effect of clearing the over-100
guardrail, and nobody chose that. The per-school win conditions are where it is fixed,
because each darśana's bar is a different kind of hard: Mīmāṃsā's is not reachable by board
position at all, Advaita's is knowledge rather than arrival, Cārvāka has no liberation to
offer. **Decide whether this phase moves ahead of 11 and 12**, or whether one interim
condition on the 105 gate restores a believable rate while karma is built.

**The door's last question is where the laws bite** (§13.7). *Which is the real path?* — the
Advaitin door and the Mīmāṃsaka door ask the same eight questions and accept different answers,
and the per-law answer tables are this phase's content. That is the point at which the schools
stop being annotation and become structure.

**Report liberation rate per law as the headline number**, ahead of median lifespan. A law
under which almost everyone is liberated has not been implemented, only decorated.

**Done when:** `sim.mjs` sweeps all implemented laws and reports liberation rate,
median lifespan and death-stage distribution per law, and the numbers differ in shape
rather than only in mean.

---

### Phase 14 — Historical boards

Board geometry becomes data. The variants are documented, not invented; see
`docs/REFERENCE.md §4`.

- 110-square modern board (current, default).
- 72-square Hindu board.
- 84-square Jain board.
- 101-square Sufi board ending at the throne.
- Historical rules worth restoring: squares that need an exact roll and cannot be
  passed; squares that must be passed in order; bounce-back and the merit-exhausted
  fall from the divine row (already taken in Phase 4).
- **Element counts, from the documented boards** (`docs/BOARDCRAFT.md §1`): Jaina 84 =
  15 ladders / 9 snakes; Vaiṣṇava 72 = 10 / 10; Mughal 100–101 = 17 / 13. Do not carry
  over the "snakes outnumber ladders two to one" claim; it is not supported.
- Each board's own randomizer: the Vaiṣṇava board used seven cowrie shells (binomial,
  p = 0.5), the Jaina board a four-outcome stick die (1, 2, 5, 6). The shells took that
  board from 64.5 turns to 100.5, so the randomizer is a real design lever and belongs
  with its board.

**Done when:** board choice is a setting, the renderer handles non-10-wide grids, and
each board's rules load with it.

---

### Phase 15 — Parallel lives

- Multiplayer becomes four lives lived side by side rather than a race.
- End screen: guṇa trajectories plotted over time, choices made at shared squares,
  where each life ended.
- Keep the old race as a mode for a shorter game.

**Done when:** a four-player game produces one comparison screen worth screenshotting.

---

### Phase 16 — Content to full, and balancing

- All 110 squares with situations where they earn one.
- Codex complete across schools, sources and figures.
- Target roughly 35 situations at two or three options each.
- **Schools as cast** (`docs/NARRATIVE.md` §13.8): each darśana assigned per life, seeded, to
  a cast member — the teacher a Mīmāṃsaka who holds the rite is enough, the friend's uncle a
  Cārvāka who lives as if there is nothing after, the rival late an Advaitin. Research brief
  for the content: for each school, a figure who held it and a scene where they held it, so
  the player learns the schools the way anyone did before textbooks — by knowing who.
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
  needs watching alongside it** (Phase 13): turn count is no longer the only thing a
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
- The exit moved to 105 in Phase 7, so this item's old square number was stale. `MOKSHA`
  now carries the premise — "Nyāya, Sāṃkhya, Mīmāṃsā and three schools of Vedānta all say
  you have arrived here. They do not mean the same thing by it." — but **no school voices
  are written for it** (`readings.json` 105 has an empty `schools`). Setting the
  definitions out side by side is still a better last beat than a trophy, and it is now a
  small job on top of a line that already exists.
