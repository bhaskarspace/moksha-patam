# Narrative specification — the player's life

**For Claude Code.** This is the brief for **Phase 3 — The Lived Board**. Phases 0, 1
and 2 are shipped and are not to be reopened; this phase is additive to all of them.
Companions: `REDESIGN.md` (phases), `docs/CONTENT.md` (what Phase 2 did),
`docs/REFERENCE.md` (philosophy and board history).

---

## 1. The problem

Phase 2 fixed the content and the diagnosis was right as far as it went. Every square
now names someone and carries a disagreement. But the grammar is wrong, and the grammar
is the whole thing.

Every card's subject is the tradition:

> In the Kauṣītaki the dying father sits facing his son and hands over his faculties one
> at a time.

> *Līlā* means play, and Bādarāyaṇa uses it for why there is a world at all.

That is an encyclopedia entry with a dice game attached. The player is reading *about*
a text while a token moves somewhere nearby. Nothing on the card happens to them.

The game already knows how to do this correctly, in one place. The move log says
"{name} rolled 4: moved to 12." The log is in the player's life; the cards are not.

**The fix:** the card's subject becomes the player. The text becomes the mirror held up
to what just happened to them, not the subject of the sentence.

> Your father is dying. He asks for fresh grass to be strewn, sits facing you, and
> begins handing things over one at a time. *Let me place my speech in you.*
>
> The Kauṣītaki knows this scene and writes down the whole script, down to the last
> item handed over: understanding.
>
> [Mīmāṃsā] … [Bauddha] …

Same square, same text, same voices. The player is now in it.

---

## 2. Card anatomy v2

Three beats. The first is new; the second is what Phase 2 already wrote.

| Beat | Slot | Job | Length |
|---|---|---|---|
| **Moment** | `moment` *(new)* | What is happening to this player, now, in their life. Named, present tense, concrete, small. | 1–2 sentences |
| **Mirror** | the current lead, renamed `mirror` | The text that holds the same moment. Opens with a connective that ties it back. | 1–2 sentences |
| **Voices** | `readings.json` `schools[]` | Unchanged. Already good. | as now |

**This is an additive migration.** Rename the existing lead to `mirror`, add a `moment`
above it. No Phase 2 writing is thrown away. A square with no `moment` renders exactly
as it does today, so the game stays shippable at every commit during the content build.

### The mirror connective

The mirror must *attach* to the moment, not sit beside it. Use a connective that does
the joining work:

- "The Kauṣītaki knows this scene:"
- "A jackal once tried the same thing."
- "Bādarāyaṇa had a word for doing something for no reason at all."
- "Naciketa was about your age."

Never "In the Chāndogya Upaniṣad, Satyakāma…" as an opener. That is the Phase 2 voice
and it is the thing being replaced.

---

## 3. The naming

Asking the player's name becomes the first beat of the game rather than a field in a
settings panel.

A single screen before the board, framed as the *nāmakaraṇa*, the naming rite performed
on the eleventh or twelfth day. It asks for:

1. **A name.** Free text. Default stays as it is now.
2. **Gender.** Required, and §4 explains why it is not optional.

One line of framing text, then the board. This costs almost nothing and it converts a
settings field into the first thing that happens to you.

For a computer player, generate a name rather than calling it "Computer". A short list
in `content/names.json`, drawn randomly, with the gender attached.

---

## 4. Hindi gender agreement — read this before writing any content

This is the thing that will break the phase if it is not planned for.

Hindi verbs and adjectives agree with the subject's gender. A card that says
`{name} पैदा हुआ` is wrong for half of all players. English is milder but has the same
problem with he/she/they.

**Required:**

- A `gender` field on every player: `m` | `f` | `n`.
- A helper in `src/i18n.js`: `g(gender, { m, f, n })` returning the agreeing form, with
  `n` falling back to `m` when a neutral form has not been authored.
- Hindi moments authored with the helper wherever agreement is unavoidable:
  `{name} ने देखा` needs nothing (ergative), `{name} बड़ा हुआ` / `बड़ी हुई` needs `g()`.
- English moments authored in a way that avoids the pronoun where possible, and using
  the player's name rather than a pronoun on second mention.

**Prefer constructions that dodge agreement.** It is usually possible and the writing is
better for it. Reach for `g()` when it is not.

**If the Hindi becomes unmanageable**, the fallback is second person throughout ("You
are six…"), which removes most agreement in English and much of it in Hindi. Do not take
that fallback without saying so, because third person is what makes a four-player game
legible: you are watching four lives, not inhabiting one.

**Lint:** fail the build when a `moment` exists in one language and not the other, and
when a Hindi `moment` contains `{name}` followed by a bare agreeing verb form with no
`g()` call. The second check can be a warning if a clean rule is hard to write.

---

## 5. Age

Every square gets an authored `age`. Do not derive it from the square number: square 4
is the first taste of rice at about six months, not age four.

Ages make a life legible and give each moment its texture. A rough mapping, to be
authored square by square:

| Squares | Ages |
|---|---|
| 1–20 | 0–12 |
| 21–40 | 12–25 |
| 41–60 | 25–50 |
| 61–80 | 50–68 |
| 81–100 | 68–90 |
| 101–110 | no age; see §8 |

The age does not have to appear in every moment's text. It should appear often enough
that the player always roughly knows how old they are, and it belongs in the card
furniture (near the square number) on every square that has one.

**Since Phase 8 the square's age is the age its moment belongs to, and the age a moment
*says* is the years the player has lived.** A snake moves the token down the board, not
the player back in time: a vice spends years rather than rewinding them. So a moment says
its age through `{age}` ("{name} is {age} and starts again…", "{name} {age} बरस {का|की}
है"), filled with the years lived as words, and "still eighty-nine" / "अब भी नवासी" on
the square a snake has just put someone on. On a climb with no snakes the years lived are
exactly the authored ages, so nothing reads differently; the lint fails a moment that
spells its age out instead. The month ages (squares 2–4) stay literal: every snake tail is
above them. The clock is in `src/engine/self.js` and REDESIGN.md Phase 8.

---

## 6. Continuity: the cast and the callbacks

One hundred and ten vignettes about one person is still ad hoc, just with a name on it.
Two cheap mechanisms turn it into a life.

### The cast

A small fixed set of **roles**, not names. Roles work bilingually, need no extra naming
screen, and recur naturally:

| Role | Appears around |
|---|---|
| mother | 2, 11, 18 |
| father | 3, 46, 60 |
| the teacher | 21, 23, 26, 37, 38, 40 |
| the friend | 6, 15, 16 |
| the one you marry | 41, 65, 78 |
| your child | 49, 60, 62, 93 |
| the rival | 52, 69 |

Use "your teacher", "your daughter". Do not name them; the player's name is the only
proper noun in the foreground, and the named people belong to the mirror.

### Callbacks

Add an optional `callsBack: n` to a square. The moment may then refer to an earlier one.

Square 50, after the anger snake at 59, is the obvious case: *the same hand that struck
the mongoose.* So is square 61's "begin again" after any fall. Keep these to maybe a
dozen across the board; they are seasoning, and every one of them needs the earlier
square to have actually been passed, so the text must work either way.

**Phase 8 wired them.** A callback is said by the life account, not by the moment: the
square carries an `echo`, a phrase that reads on into its moment ("Long after the hour
asleep on that chest, "), said only when the square it calls back to is in the same life.
There are twelve: 30→19, 37→26, 40→27, 50→59, 53→3, 61→99, 63→43, 67→52, 78→41, 81→10,
93→62, 97→6. 50 and 61 are their own snakes' tails, so the snake's join speaks for them on
the way down and their echo only on a later walk (61's never can: nothing below 99 leads
back above it but the fall from Brahma, which begins another life).

---

## 7. Snakes and ladders are the drama

This matters more than any other category, because these are the only squares with a
built-in event and they are currently the most abstract things on the board. Square 59
says "Anger · Krodha · the brahmin and the mongoose". It should say what he did.

> **59.** Your daughter breaks something of yours and you hit her before you know you
> have moved. She does not cry, which is worse.
>
> The brahmin's wife saw blood on the mongoose's mouth and struck once, before looking
> in the cradle.
>
> [Nyāya] … [Yoga] …

Then square 50, the tail it drops to:

> **50.** For a week she flinches when you come into a room. You find yourself
> explaining to people who did not ask.

Every snake becomes a thing the player did; every ladder becomes a thing they chose.
This alone will carry most of the storytelling feeling.

---

## 8. Where the voice changes

Three places the grammar should deliberately break, and the break should be felt.

**Squares 101–109, the divine row.** The life is over. There is no moment, because there
is nobody left to have one. Replace the moment with a single line in the same slot
saying what is left of them at that height: what still carries their name, what has
already been forgotten. The shift from "you" to an absence is the point, and it should
land without being explained.

**Square 110.** No moment, no mirror. Only the six definitions of mokṣa side by side,
as Phase 2 built it. The player's name does not appear on this card. That is the whole
statement, and adding anything to it weakens it.

**Square 1.** The moment is the player's first, and it should be the shortest card on
the board. Name, age zero, one sentence.

---

## 9. The life account

The payoff, and it is nearly free because the data already exists in `state.log`.

At the end of a game, generate **the player's life as continuous readable prose**: every
moment they actually landed on, in order, with ages, stitched together with connectives.
Not a list of squares. A short biography of someone who lived about forty turns.

- One page per player, switchable in a four-player game.
- Built entirely from `moment` strings plus a small set of joining phrases.
- Downloadable or copyable, so it leaves the game.
- Bilingual like everything else.

**The joins (Phase 8, `src/engine/account.js`).** A join is chosen by how a moment
relates to the one before it, first match winning:

1. the square a snake led to: the years it undid, never "afterwards", since no time passed;
2. a square whose `callsBack` is already in this life: its `echo`;
3. the square a ladder led to: "And so, ";
4. a snake or ladder taken a second time in one life: "Once again, ";
5. eight or more years since the last moment: "Nine quiet years later, ";
6. the same year ("That same year, "), or months for a baby;
7. otherwise one of the plain joins, drawn from a sequence seeded by the game's seed and
   the player, never from the dice.

Every join ends in a space, so it reads on into the moment (`after()` lower-cases an
English moment that does not open with the name). A square lived a second time in one life
is folded into one line ("Meera walked through forty-three to forty-six a second time.")
instead of being told again; a second visit to the heights is "And the same heights
again." The fall from Brahma begins another life, headed "Born again".

**The opening.** The account is written once the whole life is known, so its first line
knows the shape of it, and says only what happened, never what it was worth: born twice,
ran out of years at a hundred and eleven, lived to ninety-four and at eighty-nine had to
begin again, nothing went backwards, or lived to an age. **The ending** of a life that ran
out of years names what it was still holding: the vice it took most often, in that snake's
`holding` ("…on ground already walked once, still asking whether the son has eaten.").
Phase 12 makes that what carries over.

Two players who roll differently get genuinely different lives, which is the thing that
makes somebody play twice. This is the single most shareable artifact the project can
produce and it should be treated as a headline feature of the phase, not a footnote.

---

## 10. Authoring rules

Five rules. The first two are lintable.

1. **Every moment names the player.** `{name}` must appear. No exceptions outside §8.
2. **Every moment is bilingual**, and the Hindi handles agreement per §4.
3. **Specific and small beats large and abstract.** "You quarrel with your brother over
   a mango" is a moment. "You experience envy" is a label. Concrete nouns, ordinary
   objects, one action.
4. **The moment does not moralise.** It reports. The mirror and the voices do the
   interpreting, and the card is ruined the instant the moment starts explaining itself.
5. **The moment must be true of almost any life.** This is a board every player walks.
   Avoid anything that assumes wealth, a particular region, caste, or a specific family
   shape. "Your teacher" works; "the servants" does not.

### Worked examples

Enough of these to pin the voice. Write the rest against them.

| # | Moment | Mirror opener |
|---|---|---|
| 1 | {name} is born. | The Aitareya counts three births, and says this is only the second. |
| 2 | {name} is small enough to be carried everywhere, and is carried everywhere. | "It becomes one self with the woman, and so does her no harm." |
| 3 | {name}'s father is dying. He asks for fresh grass to be strewn, sits facing {name}, and begins handing things over one at a time. | The Kauṣītaki knows this scene and writes down the whole script. |
| 5 | {name} is one. Falls, gets up, falls, gets up, and by evening has crossed the room. | Patañjali has a word for exactly this: *abhyāsa*, the repetition that lays down a groove. |
| 7 | {name} is four, and spends the whole afternoon moving stones from one pile to another for no reason anyone can see. | Bādarāyaṇa says the world was made the same way. Not from need. For play. |
| 11 | {name} is seven and says it was not him. It was him, and everyone in the room knows it. | A jackal who fell in a dye-vat tried the same thing and held out longer. |
| 17 | {name} is nine and cannot get out of bed, and does not know why, and is called lazy for it. | Sāṃkhya has a name for the weight: *tamas*. Not a failing, a proportion. |
| 21 | {name} is twelve. The house gets smaller behind him on the road and he does not turn around. | You do not pay the teacher. You bring firewood and wait to be asked. |
| 41 | {name} is twenty-six and takes seven steps around a fire with someone he has met four times. | After the seventh step the words are *be my friend*, before anything else is promised. |
| 49 | {name} is thirty-four and feeds four people before he eats, every day, and has stopped noticing that he does it. | Born owing three debts, the householder pays them daily. |
| 59 | {name} is forty-eight. His daughter breaks something of his and he hits her before he knows he has moved. She does not cry, which is worse. | The brahmin's wife saw blood on the mongoose's mouth and struck once, before looking in the cradle. |
| 60 | {name} is fifty. The hair at his temple has gone white and his son has a son. | Manu does not fix the moment by an age. He fixes it by three signs, and these are two of them. |
| 66 | {name} is fifty-four and hands over the keys, the accounts and the house, and finds he is still standing in the doorway. | Yājñavalkya got as far as the door before Maitreyī asked him a question he could not leave. |
| 84 | {name} is seventy-two and eats what he is given at seven houses, and keeps nothing for tomorrow. | Mīmāṃsā objected: a man with no fire cannot sacrifice, and a man who cannot sacrifice cannot be doing dharma. |
| 98 | {name} is eighty-eight, and there is nothing he is waiting for. | *Śānti* three times, for three kinds of trouble. The third is the one the verse cannot promise. |
| 102 | *(no moment)* Nothing of {name} is left here but the offerings he made, still travelling. | Agni carries every offering to the gods. |

---

## 11. Schema and engineering

```
// content/squares.json — SQ[n]
{ ic, en, hi,
  age,                       // new, authored, null for 101-110
  moment: { en, hi },        // new; absent is legal and renders as today
  mirror: { en, hi },        // the Phase 2 lead, renamed
  callsBack: n | null,       // new, optional
  echo: { en, hi },          // Phase 8: how the life account says the callback; with callsBack only
  src }

// LADDERS[n] and SNAKES[n] add, in Phase 8:
  guna: "s" | "r" | "t",     // the guna the Gita gives the virtue or vice; every virtue is sattva
  aims: { dharma?, artha?, kama? },   // what it does to the three aims
  holding: { en, hi },       // snakes only: "still …", what a life was still holding at its end
```

- `src/i18n.js` gains `g(gender, forms)` and name interpolation in card strings.
- Player state gains `gender`.
- `content/names.json` for computer players.
- The naming screen goes before the board; the existing "Players & rules" panel stays
  for the rest of the setup.
- The card renderer shows `moment` above `mirror`, with the age in the card furniture.
- `tools/lint-content.mjs` gains the checks in §4 and §10.
- Degradation: no `moment` → render `mirror` alone, exactly as today. Never a blank card.

---

## 12. Phase 3 — The Lived Board

**Scope:** narrative voice and the life account. No new game mechanics. Phases 0–2 stay
as they are.

1. Naming screen with name and gender (§3), plus `names.json` for computer players.
2. `g()` helper and gender on the player (§4).
3. Schema migration: lead → `mirror`, add `moment`, `age`, `callsBack` (§11).
4. Write 110 moments, bilingual, against the rules and examples in §10. Snakes and
   ladders first (§7), since they carry the most.
5. Author the age table (§5).
6. The voice changes at 101–110 (§8).
7. The life account at the end of a game (§9).
8. Lint and degradation (§4, §11).

**Done when:**

- Every square outside 101–110 opens with something happening to the named player.
- No card's first sentence has a text or a school as its subject.
- A female-named player's Hindi is correct throughout.
- Finishing a game produces a readable life, in both languages, that can be copied out.
- Deleting every `moment` from `squares.json` leaves the game exactly as Phase 2 shipped.

**Suggested order:** do 1–3 and 8 first, then the snakes and ladders, then one ashrama
band at a time. The lint should report moments-written as a count so the phase has a
visible burn-down.
