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
English moment that does not open with the name, including one that opens on "A", but never
"I"). A square lived a second time in one life is folded into one line ("Meera went back over
ground first walked at forty-three to forty-six."); the ages are the ones that ground was first
lived at, and the line says so, because the years lived have moved on since. A second visit to
the heights is "And the same heights again." The fall from Brahma begins another life, headed
"Born again".

**Nothing is told in full twice (Phase 9).** A life stuck in a loop should read as stuck in one
line. A snake or ladder taken the first time is told whole: the square, the join, the square it
led to. The second time it is one line ("At ninety-six, Ego again, and thirty-eight more years
came undone."). From the third time it is only counted, in a tally that ends the paragraph
("Ego took Rohit back three times in all, the last time at a hundred and four."). A square
already told and reached again by a snake or ladder says only where it was first lived ("…and
Rohit is still eighty-two and back where Rohit was at thirty-eight."). Years sat out in
practice are one line ("Meera sat three years out in practice, from eighty-four to
eighty-six.").

**The opening.** The account is written once the whole life is known, so its first line
knows the shape of it, and says only what happened, never what it was worth: born twice,
ran out of years at a hundred and eleven, lived to ninety-four and at eighty-nine had to
begin again, nothing went backwards, or lived to an age. **The ending** of a life that ran
out of years names what it was still holding: the vice it took most often, in that snake's
`holding` ("…on ground already walked once, still asking whether the son has eaten.").
Phase 12 makes that what carries over. **A life let go** ends with the same weight (Phase 9): it names
that same vice, the one a death would have named as still held, as the thing put down, in the
snake's `letgo` ("Then, at eighty-eight, moksha, and Meera put down the body that seemed to
settle it."). A life that took no snake has "nothing to put down". What the dying hold is what
the freed let go.

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

---

## 13. The story layer — people, the book, the question, the door

*Written 19 Oct after Phase 9, approved by Bhaskar, appended after Phase 10 shipped. Threaded
into REDESIGN.md as Phase 10C and into Phases 11–13 and 16. Nothing here is a new mechanic;
it is the narrative layer the existing phases were built to carry.*

### 13.1 What the accounts proved

Phase 8's account is good glue around good moments and it still reads as a chronicle, and
the reason is now measurable. Generate any life and ask who is in it. A friend, a teacher, a
rival, a spouse, a son, a daughter, a father — by role, in the prose, across some forty
squares. The rival is at 38, 55, 57, 69, 79. The son at 53, 62, 93. The friend at 6, 9, 16,
33. **The prose already has a recurring cast and the data does not know it**, so the rival
at 57 and the rival at 79 are the same words and not the same person, the account cannot
thread them, and the reader feels nothing when the rival returns because nothing says it is a
return.

The lack is not squares or mirrors. It is people.

### 13.2 §6 is reversed, and why

§6 said: *do not name them; the player's name is the only proper noun in the foreground, and
the named people belong to the mirror.* That was a real literary rule with a real reason —
keep two registers apart, the domestic foreground of roles and the mythic background of
names, so that Naciketas and Maitreyī stand out as the ones with names.

It cost the thing the game most needs. A role cannot be missed. "Your friend" at 86 is which
friend; a reader does not track a role across thirty squares the way they track a name. The
accounts show it: the rival appears five times and no one notices.

The resolution keeps §6's actual concern and drops its instrument. **Name the cast with
ordinary names; keep the mythic names in the mirror.** Mīrā and Kabīr in the foreground,
Naciketas and Gārgī behind the glass. Two registers, still distinct, and now someone to lose.

### 13.3 The cast, named

**Roles.** Re-derive the role of every square from the *shipped* moments, not from §6's
table, which predates the Phase 3 authoring. The roles are what the prose already uses:

| token | role | gender |
|---|---|---|
| `{mother}` | mother | f |
| `{father}` | father | m |
| `{teacher}` | the teacher | seeded |
| `{friend}` | the friend | seeded |
| `{spouse}` | the one the player married | seeded, opposite the player by default; a setting may change this later, not now |
| `{child}` | the child | seeded; squares that say "the son" or "the daughter" keep their gender and the token resolves to it |
| `{rival}` | the rival | seeded |

A seeded teacher, friend or rival of either gender quietly puts Gārgī's world on the board
without a card saying so.

**Names.** Drawn at birth from `content/names.json`, seeded off `state.rng` the same way
the player's defaults are, one per role, **first names only**. Surnames in India are caste
markers; this is how the no-hierarchy guardrail holds inside the cast. The draw excludes the
player's own name and never repeats within a life. Bilingual, with gender, so the Phase 3
`{m|f}` machinery applies to the cast exactly as to the player. A starter list for review —
ordinary, pan-Indian, none of them mythic, none of them marked:

| m | hi | f | hi | either | hi |
|---|---|---|---|---|---|
| Arjun | अर्जुन | Mīrā | मीरा | Kiran | किरण |
| Kabīr | कबीर | Tārā | तारा | Jaya | जया |
| Ānand | आनंद | Rādhā | राधा | | |
| Rohan | रोहन | Līlā | लीला | | |
| Sameer | समीर | Āśā | आशा | | |
| Vikram | विक्रम | Nīrā | नीरा | | |

Bhaskar reviews the list; it is the one piece of content here that a native ear must pass.

**Introduction.** The first square a role appears on *introduces* the name and the rest use
it. "{name} is three and has found a friend. Her name is Mīrā." After that, "Mīrā" alone.
This is the first decision to settle: whether the player meets the friend (the name arrives
in the moment) or is introduced (the account says it later). Meeting is better; it is how
the reader learns the name in a novel, and the moment's own text is where the name belongs.
The introducing clause is a per-role string, not per-square, so it is authored once.

**The cast ages on the Phase 8 clock.** The friend is three at 6 and eighty-six at 86, for
nothing. Where a moment states the cast member's age it should be `{friend.age}`, filled
from the player's years with the role's offset (the friend is the player's age; the teacher
is older by a seeded 20–35; the child is younger by the player's age at the marriage
square plus a seeded 1–4).

### 13.4 Threads in the account

Three things follow from a named cast for almost no cost.

**The strongest join.** The join ladder in `account.js` gets the rung it lacked data for:
*the same person returns.* It outranks the gap and same-year joins and sits beside the
echo. "Mīrā, who broke the biscuit, is the one who lends the money at thirty-three." The
reader now has a reason to have remembered square 6.

**Fates the player did not see.** Every cast member has a seeded arc across *every* square
that mentions them, landed on or not. The player sees Mīrā at 6, 16 and 33 and never again.
The account's closing names what the life never found out:

> Mīrā, whom {name} last saw at thirty-three, died at sixty-one. Nobody wrote.

That line is the engine of the whole layer. It is an open loop closed by the book instead of
by play, and the next life exists so the player can go and find her. The closing says one
fate per cast member the life met, in the order they were met, after the holding line and
before the end.

**The consistency constraint.** A cast member's fate must be consistent with every square
they appeared on in this life. If the friend lent money at 33 the friend was alive at 33. The
arc is seeded from the squares the life actually touched, then extended; it is never drawn
independently. Wildermyth's designers name the two ways generated characters lose a player —
breach of trust and acting out of character — and this constraint is the guard against the
second.

### 13.5 Citragupta's book

The life account is already the central object of the game, and the design has not said so.
Say so. Citragupta is Yama's scribe in the Garuḍa Purāṇa, who writes every deed down, and
what he has written is read back at the reckoning. **The account is that record.** Phase 12's
reckoning screen is Citragupta reading it aloud to Yama.

What this buys is a narrator with a stake. The account already knows what the player did not
notice — it says "still eighty-nine", it says "on ground already walked once." Give that
knowledge a voice that is *bound to record truly* and the account stops being a summary and
becomes the verdict the player has been writing since square 1. Phase 8's opening line
becomes the first line of an entry; the title becomes a heading in a ledger.

The scribe appears as what he is in the pan-Indian texts — the one who writes — and never
with a lineage or community attached; he has a devotional association with one, and it does
not belong in this game. He is never a character in the life. He is the hand.

### 13.6 The curse: a fuse with a sentence

Bhaskar asked for mystery after Phase 5 and nothing answered it. The tradition's native
device is the curse — Durvāsā to Śakuntalā, the ṛṣi's son to Parikṣit — which is **a fuse
with words attached**. Phase 11 has fuses. One of them speaks.

Early in the life, in childhood or brahmacharya, someone says one line the player cannot
yet understand. Keep the game's register; nothing oracular, nothing in capitals:

> An old woman at the well tells {name}, who is nine, that {name} will give away the thing
> {name} loves most and not notice.

It is seeded to a late square — 44, the better blanket, or 93, the son. If the player lands
there the account closes it: *The woman at the well had said so.* If they never do, the
account closes it the other way: *She was right, in a way {name} never found out.* Either
closing is an ending; the player has carried a sentence for a whole life and the book tells
them what it was for.

Authoring rules for a curse: one per life, drawn from a small set of perhaps eight; each is
tied to a *family* of late squares rather than one, so most lives can close it by landing;
the early line names a thing and never a square; the Hindi agrees with the player.

**From the second life onward there is a second mystery for free.** The player does not
remember what they were still holding when the years ran out. Citragupta does. The second
life's account can say, early:

> {name} does not know why mirrors make {name} uneasy.

The player can solve it by reading their last life — replay as detective work — which is the
Jātaka structure exactly: every tale ends *and at that time, so-and-so was the X, and I was
the Bodhisatta.*

### 13.7 The door is an examination

Émerson's gate (19 Oct): arrive at the last houses carrying a debt, be held there, work it
off roll by roll. Here is what it is in the game's own idiom. The Yakṣa Praśna is the
tradition's examination at a threshold — Yudhiṣṭhira at the lake, his brothers dead until
he answers. **Each turn at the door is one question, and the life answers, not the player.**
Citragupta reads the answer out of the book.

| the Yakṣa asks | the canonical answer | the life answers with |
|---|---|---|
| Who is truly happy? | The one without debt | the ledger at the door |
| Why are friends forsaken? | For greed | 55, and the friend thread |
| What is the greatest wonder? | That men see others die and believe they will not | 99, the mirror |
| Which is the invincible enemy? | Anger | 59 |
| What is poison? | Desire | 47 |
| What is envy? | Grief of the heart | 69 |
| What, renounced, makes one liked by all? | Self-pride | 77, 39 |
| Which is the real path? | Argument settles nothing; scriptures disagree; the path is the one the great have walked | the law in force |

A question the life answers well clears a share of the debt; one it fails, the player sits a
year. **The player never sees a number. They feel the debt as how long they stand there.**
That is Émerson's 5×10 kept whole and made into the game's most devastating scene, and it is
`p.holding` under cross-examination.

The last question is where the laws bite. Under Phase 13 the Advaitin door and the
Mīmāṃsaka door ask the same questions and accept different answers — and that is where
"informative" stops being annotation and becomes structure.

This also resolves the tension Phase 10A recorded, that a 1 is both the omen's dread-face
and the slow arrival's lucky face: at the door, a 1 is the question. Below 94 it is how you
arrived. They never share a square.

Each turn at the door is still a Phase 9 turn: two dice, and the sannyāsin's option to sit
the year in practice. If practice pays the debt down — penance, which is what it is — the
door is a choice between moving and clearing, not a counter emptying. That is the one place
the allocation loop Phase 9 declined earns its complexity.

### 13.8 The schools as people

A darśana is currently a voice in a footnote. Make them cast. The teacher at 23 is a
Mīmāṃsaka who holds that the rite is enough. The friend's uncle is a Cārvāka who says there
is nothing after and lives accordingly. The rival, late, becomes an Advaitin. The player
learns the schools the way anyone did before there were textbooks — by knowing who held
them and watching how those lives went. Yājñavalkya won a thousand cows. Maṇḍana Miśra lost
to Śaṅkara and his wife was the judge. These were people in rooms.

Assignment is per life and seeded, so no school is always the teacher's. At the door the
cast are the ones who went before, and the question is whose answer the player lived.

### 13.9 What not to build

Branching plot, dialogue trees, cutscenes. They cost everything and kill replay. The 80 Days
rule — most playthroughs see under a tenth of the text — only pays if the player *wants* the
other nine tenths, and a named friend whose death they were not told about is the reason
they will. The whole layer is data on squares and rules in the account; no new screen until
the door, and the door is Phase 11's gate with words.

### 13.10 Authoring constraints

- **Names:** first names only; none mythic; none community-marked; excluded if the player
  chose it; the list passes a native ear before it ships.
- **Consistency:** a cast fate contradicts no square the life touched. Lint it: every cast
  member's death year is later than the player's age at their last appearance.
- **Register:** the curse speaks like the rest of the board. If a line could be printed on a
  poster it is wrong.
- **Hindi:** the cast carries gender; every token interpolation goes through `g()`;
  introductions are per role and agree.
- **Mirror stays mythic:** no cast name ever appears in a mirror; no mirror name is ever on
  the cast list.
- **Nothing shown as a number:** the door is felt as years, the fates as sentences.

### 13.11 Phasing

Everything slots into a phase that exists.

1. **Cast as data, seeded names, the introducing clause, the returns join** — Phase 10C,
   its own PR from a clean main. Tagging ~40 squares, one name list, one join rung. Highest
   leverage of anything on the table.
2. **Fates in the closing** — same pass.
3. **The curse** — Phase 11. It is a fuse.
4. **The door as praśna** — Phase 11. It is the gate.
5. **Cast across lives; the forgotten holding** — Phase 12. It is saṃskāra.
6. **Schools as cast** — Phases 13 and 16, content.

**Done when:** a generated life names a friend on their first square and uses the name on
every later one; the account joins a return by name; the closing names at least one fate the
life did not see; stripping `names.json` leaves every account byte-identical to Phase 10;
and a native reader passes the Hindi.
