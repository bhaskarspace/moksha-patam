# Content and art specification

**For Claude Code.** This is the brief for **Phase 2 — The Told Board**. Phases 0 and 1
are done and are not to be touched. Companion files: `REDESIGN.md` (phases),
`docs/REFERENCE.md` (philosophy and history), `docs/LANDSCAPE.md` (what else exists).

---

## 1. What is actually wrong

Phase 1 was scoped as "make the existing content readable", so it did exactly that and
no more. The cards look better and say the same thing. Measured against the shipped
`content/`:

- **67 of 110** squares have school voices in `readings.json`.
- **31 squares have only a `scholar` note**, which is hidden at the default depth
  (`prefs.depth` defaults to `"school"`). Those cards show the bare old line.
  Squares: 2, 3, 8, 9, 12, 13, 16, 22, 23, 25, 27, 28, 34, 36, 38, 42, 45, 46, 52, 54,
  56, 61, 63, 74, 77, 87, 88, 90, 97, 98, 110.
- **12 squares have nothing at all**: 7, 15, 21, 37, 43, 50, 60, 66, 76, 100, 103, 104.

So **43 of 110 squares show a single old sentence** at the setting most players use.
That is the complaint, and it is a content gap, not a rendering one.

Separately, about **26 lead lines are not scenes**. They are proverbs (2, 3, 10, 30, 56,
90, 97, 98), rite descriptions (4, 20, 38, 41, 80), or abstractions (5, 7, 17, 21, 42,
49, 60, 66, 76, 84, 100). Nothing happens in them and nobody is named.

---

## 2. The card contract

Three rules. Every square must satisfy all three, and `lint-content.mjs` should check
the first two mechanically.

**1. Every card names someone.** A person, a school, or a named text. "Play teaches
sharing" names nobody. "Bādarāyaṇa says the world is made as play, for no reason at
all" names two things and invites a search.

**2. Every card leaves something open.** A statement closes a loop; a disagreement
opens one. Curiosity is the open loop. This is the mechanism the whole redesign turns
on, so prefer "X said this, Y said the opposite, and here is what hangs on it" over any
amount of elegant assertion.

**3. The lead line carries the turn.** The reader reads the first sentence and maybe
the second. Putting the interesting material in `scholar` depth and a proverb on top is
why the current cards feel flat. The turn is the sentence that makes the square strange.

Worked example, square 3:

> **Now:** Pitru devo bhava: honour your father as a god.
>
> **Should be:** Dying, the father has fresh grass strewn and sits facing his son.
> *Let me place my speech in you.* — *I take your speech in me.* Then breath, eye, ear,
> mind, and last of all understanding. (Kauṣītaki 2.15)
>
> **Turn:** the rite treats a person as a set of parts that can be handed over. So who
> is left on the bed?

Same square, same source, and now it is a scene with a question in it.

### Slot model

The shipped schema already supports this. Use it rather than inventing one.

| Slot | File | Depth | Job |
|---|---|---|---|
| lead | `squares.json` `SQ[n][3]` / `[4]` | story | the scene, with the turn in it |
| voices | `readings.json` `schools[]` | school | two schools disagreeing, named |
| scholar | `readings.json` `scholar` | scholar | citation, textual problem, cross-link |
| chip | `codex.json` | all | the school, linked to its Codex entry |

**Fix the depth gating as part of this phase:** a square whose only extra content is a
`scholar` note currently shows nothing at default depth. Either promote `scholar` to
show at `school` depth when `schools[]` is empty, or guarantee every square has at
least one voice. Prefer the second; do the first as a safety net.

---

## 3. Lead-line rewrites

The 26 flat squares. Keep each lead to one or two sentences. Hindi to match.

| # | Title | Replace with |
|---|---|---|
| 1 | Birth | The Aitareya counts three births for one self, and being born is only the second of them. |
| 2 | Mother | "It becomes one self with the woman, and so does her no harm." Aitareya 2 calls carrying a child the self's first birth, and says the father is begetting himself. |
| 3 | Father | Dying, the father sits facing his son and hands over his faculties one at a time. *Let me place my speech in you.* *I take your speech in me.* Then breath, eye, ear, mind, and last, understanding. (Kauṣītaki 2.15) |
| 4 | First rice | At the annaprāśana the child eats grain for the first time. Taittirīya 2 starts its account of the self with the same substance: the outermost sheath is made of food. |
| 5 | First steps | Falling and getting up is *abhyāsa*, repetition laying down a saṃskāra. Patañjali says the same machinery is what later makes a person hard to change. |
| 7 | Play | *Līlā* means play, and Bādarāyaṇa uses it for why there is a world at all: not need, not duty, but sport. (Brahma Sūtra 2.1.33) |
| 10 | First words | A child's first word is a convention it never agreed to. Mīmāṃsā denied there was any convention: word and meaning are eternal and nobody invented them. |
| 17 | Missed lesson | Sāṃkhya has a name for the weight that keeps a boy in bed. *Tamas*, one of three strands every mind is wound from. Not a failing, a proportion. |
| 20 | Sacred thread | *Upanayana* means leading near. The boy is led to a teacher and counted born a second time. The first birth was the body's; this one belongs to the text. |
| 21 | Gurukul | You do not pay the teacher. You bring firewood, herd his cattle and wait to be asked. The fee is attention. |
| 26 | Firewood | The seeker arrives holding firewood, which is both the fee and the signal. Muṇḍaka 1.2.12 adds the condition: he must already have found that nothing built by action lasts. |
| 30 | Speak the truth | Both are commands, and Mīmāṃsā built a philosophy on that grammar: dharma is what the Veda *enjoins*, never what anyone feels to be right. |
| 38 | Graduation | On the last day the teacher says: speak the truth, do your duty, never neglect study. Then the sentence that concedes the rules run out — *where there is doubt about conduct, behave as the thoughtful do.* |
| 41 | Marriage | Seven steps, and after the seventh you are friends: *sakhā saptapadā bhava*. The vow is to friendship before it is to anything else. |
| 42 | Home | Manu puts the householder first of the four stages, not because he is holiest but because the other three eat his food. |
| 49 | Five offerings | Born owing three debts, to the sages, the gods and the ancestors, the householder pays them daily. Cārvāka's reply: a debt nobody can show you a ledger for is not a debt. |
| 56 | The guest | *A-tithi*: the one without a date. You feed him before you eat because he is the one visitor you could not have prepared for. |
| 60 | Grey hair | Manu fixes the moment by three signs, not by an age: the skin wrinkles, the hair whitens, and you see your son's son. |
| 66 | To the forest | He hands over the house, takes the fires with him and goes. Yājñavalkya did this, and Maitreyī stopped him at the door with a question. |
| 76 | Sandhya | Three times a day he faces the sun and says the Gāyatrī, a verse that asks the light to *impel our thoughts*. It asks for a better mind, not a better life. |
| 80 | Saffron robe | At the sannyāsa rite he performs his own funeral, offers the last fire and takes a new name. From that morning he is dead in law and owes the three debts no longer. |
| 84 | Alms | He begs at seven houses, takes what is given and keeps nothing for tomorrow. Mīmāṃsā objected: a man with no fire cannot sacrifice, and a man who cannot sacrifice cannot be doing dharma. |
| 90 | Lead me to light | The line is older than the schools that use it, and each fills in *the real* differently: for Sāṃkhya the witness, for Nyāya a self with properties, for Advaita the only thing there is. |
| 97 | Wholeness | Take the whole from the whole and the whole remains. A sentence about infinity, written down before anyone had the word. |
| 98 | Shanti | Three times, for three kinds of trouble: from yourself, from other beings, and from what nobody controls. The third is the one the verse cannot promise. |
| 100 | The threshold | The last square of the world. Everything above it is a reward, and Nyāya, Mīmāṃsā and Advaita agree on exactly one thing: rewards run out. |

---

## 4. Voices for the 12 empty squares

| # | Square | Voices to write |
|---|---|---|
| 7 | Play | **Vedānta**: creation is *līlā*, sport, with no motive (BS 2.1.33). **Nyāya**: no, God makes the world for the sake of souls' karma, which is a reason. |
| 15 | Set free | **Jaina**: *ahiṃsā* reaches the mouse and the deer because every one of them has a soul with as much claim as yours. **Mīmāṃsā**: and yet the Veda enjoins animal sacrifice, which kept both schools arguing for a thousand years. |
| 21 | Gurukul | **Advaita**: Śaṅkara lists what a student must bring before a teacher will start, beginning with the ability to tell the lasting from the passing. **Mīmāṃsā**: no qualification is needed, only the injunction. |
| 37 | Blessing | **Nyāya**: a teacher's word is *śabda*, a means of knowledge in its own right, valid because the speaker is reliable. **Cārvāka**: testimony is not knowledge; it is someone else's perception, and you have no way to check it. |
| 43 | The bowstring | **Cārvāka**: eat the ghee today even if you borrow for it, because there is no tomorrow to save for. **Mīmāṃsā**: the jackal's error was not saving, it was acting without knowing the rule. |
| 50 | Too late | **Nyāya**: blood on the mouth is a *hetu* with no *vyāpti*. Blood does not invariably accompany killing, so the inference was void before she raised her hand. This is the school's own worked example of a fallacy. **Yoga**: the fault is upstream, in a mind the strands had already set racing. |
| 60 | Grey hair | **Mīmāṃsā**: the stages are injunctions, so leaving is not a mood, it is a duty with conditions. **Advaita**: Śaṅkara held that one who knows need not wait for grey hair, and one who does not will not be helped by it. |
| 66 | To the forest | **Advaita**: renunciation is the outward form of knowing the house was never yours. **Viśiṣṭādvaita**: Rāmānuja kept the house and the world real, so leaving is a discipline, not a correction. |
| 76 | Sandhya | **Mīmāṃsā**: the daily rites are *nitya karma*, obligatory and fruitless. You do them because they are enjoined, and asking what you get is the wrong question. **Yoga**: the repetition is the point; it is the only thing that reshapes a mind. |
| 100 | The threshold | **Nyāya**: heaven is a reward, and rewards are finite. **Mīmāṃsā**: for centuries that was enough, and mokṣa was not the goal. **Advaita**: which is why everything above this line is still saṃsāra. |
| 103 | Surya | **Nyāya**: the world shows design, so infer a designer, as you infer a potter from a pot. **Mīmāṃsā**: there is no maker. The Veda is authorless and the world had no beginning to need one. |
| 104 | Ganesha | **Yoga**: Patañjali lists nine obstacles to a settled mind, among them illness, doubt, carelessness and sheer inability to stay (YS 1.30). The last obstacle on the board is a list. |

---

## 5. Voices for the 31 scholar-only squares

Keep the existing `scholar` notes; add one pair of voices each. Short suggestions:

| # | Voice pairing |
|---|---|
| 2 | Sāṃkhya (prakṛti does the making) vs Nyāya (a self arrives that the body did not make) |
| 3 | Mīmāṃsā (the rite transfers what it says it transfers) vs Buddhism (no self to transfer; only a stream) |
| 8 | Jaina (speech is one of the ways karma sticks) vs Cārvāka (a tortoise falls because it is heavy) |
| 9 | Nyāya (stories as *upamāna*, knowledge by likeness) vs Mīmāṃsā (only injunctions teach) |
| 12 | Nyāya (wit is inference under pressure) vs Yoga (a settled mind, not a quick one) |
| 13 | Cārvāka (the body is the self, so of course he fought for it) vs Vedānta (he escaped by saying the self was elsewhere, and was right by accident) |
| 16 | Vaiśeṣika (the necklace works by ordinary causes) vs Nyāya (the crows reasoned, and that is what reasoning is) |
| 22 | Nyāya (*vyāpti* without *upādhi*; they never checked the limiting condition) vs Sāṃkhya (knowledge in a rajasic mind) |
| 23 | Mīmāṃsā (service is enjoined) vs Dvaita (devotion is the means, not the fee) |
| 25 | **The dogs' udgītha** (Chāndogya 1.12): dogs process in a line, each holding the tail ahead, and chant for food. Müller and Deussen read it as satire of priests. Put it beside the most-recited verse on the board and let Mīmāṃsā answer. |
| 27 | **Buddha's poisoned arrow**: Pippalāda says wait a year and then ask; the Buddha says the man with an arrow in him should not be asking who shot it. Two ways of refusing a question. |
| 28 | Nyāya (truth as correspondence) vs Mīmāṃsā (the teacher accepted him on a sign, not a proof) |
| 33 | **Vaiśeṣika**: Kaṇāda says a fleck of dust is the smallest thing you can see and it still has parts, down to the partless *paramāṇu*, then dyads, then triads. Chāndogya says the subtle is the cause; Vaiśeṣika says the subtle has structure. |
| 34 | Nyāya (mokṣa is the end of pain, not bliss, and only after death) vs Advaita (Naciketa was asking the right question of the right person) |
| 36 | **The translation fight.** Śaṅkara: *you are That.* Rāmānuja: a mode of That. Madhva re-splits the sandhi to *atat tvam asi*, you are *not* That. Brereton, Olivelle and Doniger render it "that's how you are" and deny it is an identity claim at all. Four readings, one sentence. |
| 38 | Mīmāṃsā (the farewell is a set of injunctions) vs Advaita (its last clause admits injunctions run out) |
| 42 | Mīmāṃsā vs Sāṃkhya on whether the householder's acts bind or free |
| 45 | Nyāya (the face shining is a *liṅga*, a sign to infer from) vs Cārvāka (a man came back rich, that is all anyone saw) |
| 46 | Jaina (*anekāntavāda*: everyone in that war had a partial truth) vs Mīmāṃsā (duty was stated and ignored) |
| 52 | Yoga (envy as a *kleśa*) vs Nyāya (the dice game was a bad inference about one's own prospects) |
| 54 | Mīmāṃsā (the king had the rites) vs Advaita (the cart-man had the knowledge, and the text makes him the Brahmin) |
| 56 | Mīmāṃsā (hospitality is one of the five daily debts) vs Cārvāka (feed the guest because it is pleasant, not because it is owed) |
| 61 | Advaita (Indra's 101 years are the text telling you the first answer is always wrong) vs Nyāya (he was doing it correctly: successive approximation) |
| 63 | Mīmāṃsā (enjoy means enjoy; the Veda does not forbid) vs Advaita (enjoy by letting go is the whole instruction) |
| 74 | Vaiśeṣika (space is one of nine substances and it is not inside you) vs Advaita (the space in the heart is not the space outside it) |
| 77 | Kena's own answer vs Cārvāka (the gods lost a bet with a stranger, and the lesson is about gods) |
| 87 | Yoga (the lid is the mind's own activity) vs Nyāya (the lid is simply that some things are not perceptible) |
| 88 | Jaina (outward austerity without inward is one of the ways karma binds harder) vs Mīmāṃsā (the rite works whatever the performer feels, which is exactly the problem) |
| 90 | See §3 lead; add Sāṃkhya vs Advaita on what "the real" names |
| 97 | **Vaiśeṣika** on whether infinity can be a substance vs **Advaita** on the verse as a definition of the whole |
| 98 | Yoga (the three troubles map onto the obstacles of YS 1.30) vs Nyāya (the third kind is why mokṣa cannot be had by effort alone) |
| 110 | **The payoff card.** Each school's own definition of mokṣa, side by side: Nyāya's *apavarga* as the end of pain and explicitly not bliss; Sāṃkhya and Yoga's *kaivalya*; Mīmāṃsā's centuries of saying svarga was enough; Advaita's identity; Rāmānuja's union with individuality kept; Madhva's eternal service. They all said you had arrived and they meant six different things. |

---

## 6. New material worth a square of its own

Three pieces are strong enough to displace something.

**Gārgī Vācaknavī (BU 3.6, 3.8)** is the largest omission on the board. At Janaka's
assembly she questions Yājñavalkya in a regress — on what is the world woven, and on
what is *that* woven — until he says *gārgi mātiprākṣīḥ, mā te mūrdhā vyapaptat*: do
not question too far, lest your head fall off. Śaṅkara's gloss is the gift: the warning
is against reasoning past the proper means of knowledge. That ties the board's best
scene directly to the pramāṇa theme. She then returns for a second round and concedes
publicly that nobody will beat him. **Put her at square 79**, which currently holds a
weaker Muṇḍaka image, and keep the bow-and-arrow verse as her scholar note.

**The Nāsadīya Sūkta (RV 10.129)** ends: *he knows — or maybe even he does not know.*
The gods came after creation, so they cannot know either. **Put it on square 107,
Brahmā**, so the creator square carries the hymn that doubts the creator knows. The
heavenly row stops being a roll-call at its most important square.

**Ushasti Cākrāyaṇa (Chāndogya 1.10)** eats another man's leftover beans during famine
and then refuses the water, because the beans he could not avoid and the water he
could. Dharma under duress, argued out loud. **Put it on square 48**, next to "food is
Brahman", where it sharpens a square that is currently a maxim.

---

## 7. Art specification

### Idiom

**Basohli**, the Pahari school of roughly 1678–1730s. Chosen on three practical
grounds: it uses flat brilliant primaries with no modelling, which survives at icon
size; it has a hard single-weight outline, which is what an SVG path is; and its faces
are profile with one oversized eye, which reads at 40px where a three-quarter face does
not. It is also regionally right for a board painted on cloth in the same centuries.

Surviving gyan chaupar boards were painted and inscribed on cloth or paper, each square
carrying a numeral and a teaching, with the snakes and ladders drawn across the grid,
sometimes framed by the *lokapuruṣa*. The current layout is already faithful to that;
only the pictures need to change.

### Palette

Lock these as tokens and let nothing else in. Since Phase 13 they live in one place,
`content/boards.json` (the 110 board's `palette`); `tools/build.mjs` writes them into
`styles.css` as `--b-*` custom properties, and the lint, the contrast test and the sprite
generator all read them from there. The grounds are pale and the pigment is in the
figures, the snakes, the ladders, the border and the divine row, as on the surviving
boards: a saturated ground under a dark pictogram is the hierarchy upside down.

| Token | Use |
|---|---|
| vermilion `#C8352A` | borders, the red frame, snake bodies, ladder outlines, robes |
| ochre `#D9A441` | earth, brick, wood, the warm robes |
| Indian yellow `#E3A21A` | ladder rails, sashes, the sun, coins, flames' cores |
| indigo `#2B3A67` | night, water, robes; Moksha's flat ground at 105 |
| malachite `#3F7A4E` | vegetation, robes |
| lamp black `#1A1410` | every outline, one weight; hair; the black nāga |
| shell white `#F4EDDC` | paper, skin, raised dots for pearls, a snake's belly |
| beetle green `#1F7A5A` | one accent per board, reserved for jewels |
| gold `#B8862B` and gold-hi `#EDCF72` | the divine row and the board's border, and nothing else: the only gradient on the page runs between these two, because that is what metal does |
| cream `#F5E9C9`, pale ochre `#EDD49B`, pale green `#DCE0B4` | the squares' grounds, two per āśrama band, alternating by row (`grounds`) |
| cloth `#E8D7AE` | the page itself |
| lac `#5A1208` | the darkest red: the page's rules and ink, the frame's dark edge, the vimāna's outline |

**No gradients but the gold.** The lint rejects any CSS gradient that uses a token other
than gold or gold-hi, and any canvas gradient in `board.js`; the age canvas's worn edge is
five flat rings, not a radial gradient.

**The board's look is data.** A board entry in `content/boards.json` declares its palette,
its grounds by band, its divine row (`ground`, `goal`), its snake pigments (pairs of body
and band; `snakeHues` in `src/render/ground.js` gives each snake one, so that no two snakes
whose bodies come within 1.6 squares share a pigment), its ladder (`rail`, `outline`), its
`border` (today `scroll`, a flat floral tile) and its `superstructure` (today `vimana`, the
arches over 101–110). Phase 17's 72, 84 and 101 boards are new entries plus their motifs,
not new code paths. On a weak device (`:root.plain`) the ornament (scroll and vimāna) goes
first; the pigment and the ageing always stay.

### SVG rules

- 24×24 viewBox for a sprite, 1px safe margin, no artwork touching the edge (a vignette's
  are below).
- Flat fills only. No gradients, no blur, no filters on the sprites.
- One outline weight throughout the sheet (1.25 units at 24px).
- Figures in profile, one large eye, sturdy outline, no foreshortening.
- Vegetation as repeated stylised motifs, not observed plants.
- A framing arch only where a square is a scene with a setting.
- Ship as one `assets/sprites.svg` symbol sheet, referenced by `<use>`.
- **Keep the emoji as fallback.** If a symbol id is missing, render the old emoji. No
  blank squares at any point during the art build.

### Vignettes (Phase 13)

A square's picture can be a **vignette**: a small painted scene of its *moment*, not its
abstract name, filling the whole square rather than the roundel. 34 have one: the 13 snake
heads, the 11 ladder feet and the divine row 101–110. The other 76 keep their sprites.

- **Generated, not hand-written.** `tools/vignette-parts.mjs` is a parts library (a profile
  head with the one eye, as man, woman or child, with black, grey or white hair; robe,
  seated, limb, lying; arch, sea, sun, cloth, lotus, flame, moon, pot, books, house, bowl,
  crown), each returning paths with their coordinates already placed (no `transform=`). The
  scenes are `art/vignettes.mjs`, one `{ keep, draw }` per square; `node tools/vignettes.mjs
  [squares…]` writes them into `assets/sprites.svg` under the square's own id, `sq-N`, with
  `class="vg"`, so the fallback chain is unchanged: vignette, else emoji.
- `viewBox="0 0 48 48"`, outline **1.25**, the same weight the sprites have at 24 (the lint
  holds every stroke to 1.25). Flat fills from the palette only, one outline, profile with
  one eye, no gradients.
- **Composed around the square.** The number sits in the top-left (about 12 × 9) and the
  name along the bottom (about 7). On a snake's square the hood and body cover part of the
  cell, and on a ladder's the rails do; a scene is told in the part its square leaves open,
  measured from the board's own geometry (`keep` names it). Figures go to one side, the
  thing they look at in a niche or a corner.
- **On the board** a vignette is painted in the cell layer (`.cell .pic.vg`), under the
  snakes and ladders and under the ageing, as all the art is; its label then carries no
  roundel. On the card it sits in the illuminated arch like any sprite.
- **Moksha keeps ॐ on the board.** 105's vignette, the door open with a lotus on its
  threshold, is drawn for its card alone.
- The divine row's are seals, more pattern than figure: Indra's vajra, Agni over the brick
  altar, Surya's disc with a face in profile, Ganesha crowned, Lakshmi's lotus with coins,
  Saraswati's swan, Brahma's faces on the lotus, Vishnu's discus and conch, Shiva's trident,
  drum and moon.

### Icon direction by square type

| Type | Direction | Examples |
|---|---|---|
| Rite | the object, not the ceremony | 20 the thread alone; 80 a folded saffron cloth and a cold fire |
| Scene | one figure in profile, mid-action, nothing else | 3 father and son facing, hands touching; 79 Gārgī standing, arm raised, in an assembly reduced to three seated outlines |
| Argument | a diagram-like glyph, deliberately schematic | 33 a dust fleck with three nested dots; 36 one figure reflected in two different mirrors |
| Fable | the animal in profile at the moment of the turn | 50 the mongoose with the dead cobra, not the raised hand |
| Divine | a seal-like emblem, more pattern than figure | 107 a four-faced mark with the last line of the hymn curving under it |
| School chip | a small seal per darśana, 16×16, outline only | six seals plus three for the nāstika schools |

---

## 8. Phase 2 — The Told Board

**Scope:** content and art. No rules change, no new mechanics, no touching Phases 0–1.

1. Rewrite the 26 lead lines in §3, English and Hindi.
2. Write voices for the 12 empty squares (§4).
3. Write voices for the 31 scholar-only squares (§5).
4. Add the three new pieces (§6), moving squares 79, 107 and 48.
5. Fix the depth gating so no square can ever show a bare lead at default depth.
6. Extend `lint-content.mjs`: fail when a square has no voice, when a lead names nobody,
   and when any string is missing its Hindi.
7. Build the Basohli sprite sheet (§7) with emoji fallback.
8. Codex entries for every school, figure and text newly named.

**Done when:**

- `lint-content.mjs` reports zero squares with no voice and zero missing Hindi.
- Opening any square at default depth shows a named person or school and a disagreement.
- No lead line is a bare proverb; every one of the 110 names someone.
- The board renders with no emoji, and deleting the sprite sheet falls back cleanly.
- Square 110 shows six definitions of mokṣa side by side.

**Deliberately not in this phase:** texture, camera, the ageing board and the adaptive
drone. Those are Phase 3, the Painted Board. Keeping them apart means the writing is not
blocked by the asset work.

---

## 9. Sources

- [Gārgī Vācaknavī](https://en.wikipedia.org/wiki/G%C4%81rg%C4%AB_V%C4%81chaknav%C4%AB) · [BU 3.6, with Śaṅkara's gloss](https://www.wisdomlib.org/hinduism/book/the-brihadaranyaka-upanishad/d/doc118357.html)
- [Chāndogya Upaniṣad](https://en.wikipedia.org/wiki/Chandogya_Upanishad) — dogs' udgītha 1.12, Raikva 4.1, Satyakāma 4.4, Śvetaketu 6, Nārada 7.1
- [Kauṣītaki 2.15, the father's transfer](https://www.universalfreemasonry.org/en/library/the-upanishads-part-1/adhy%C3%A2ya-II)
- [Aitareya 2, the three births](https://oneeyedman.net/teaching/fulltext/www.ancienttexts.org/library/indian/upanishads/aitar.html)
- [Nāsadīya Sūkta, RV 10.129](https://en.wikipedia.org/wiki/Nasadiya_Sukta)
- [Vaiśeṣika atomism and the padārthas](https://en.wikipedia.org/wiki/Vaisheshika)
- [Parable of the Poisoned Arrow](https://en.wikipedia.org/wiki/Parable_of_the_Poisoned_Arrow)
- [Basohli painting](https://www.britannica.com/print/article/55311) · [Pahari schools, NCERT](https://sathee.iitk.ac.in/ncert-books/class-12/an-introduction-to-indian-art/chapter-05-the-pahari-schools-of-painting)
- [Gyan Chaupar, how the boards were made](https://asiainch.org/article/gyan-chaupar-a-simple-way-of-teaching/)
