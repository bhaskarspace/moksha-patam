# Moksha Patam · मोक्ष पटम

The old Indian game of snakes and ladders, played as one life, in English and Hindi, in a single HTML file. Every square tells part of a story from the Panchatantra or the Upanishads, in the order a life would meet them.

**Play:** https://codebpr.com/moksha-patam/ (add `?lang=hi` to open in Hindi)

## The board as a life
| Squares | Stage | Stories from |
|---|---|---|
| 1–20 | Childhood | Panchatantra fables |
| 21–40 | Brahmacharya (student) | Taittiriya, Chandogya, Katha, Mundaka; Aruni from the Mahabharata |
| 41–60 | Grihastha (householder) | Brihadaranyaka, Isha, Taittiriya, Mahabharata |
| 61–80 | Vanaprastha (forest-dweller) | Brihadaranyaka, Kena, Chandogya |
| 81–100 | Sannyasa (renunciate) | Mundaka, Mandukya, the four Mahavakyas |
| 101–110 | Divine realms, ending in Moksha | |

## How the snakes and ladders are placed
- **Nothing on squares 1–5.** A newborn can't climb by virtue or fall by vice.
- **Childhood vices are small slips** (chatter, fibbing, laziness) **with short falls.** Adult enemies like anger, craving and greed only appear in the householder years. Ahankara (ego) waits at 99 and is the longest fall of all.
- **Ladders are biggest in the middle of life** (truth, resolve, giving, duty) and short near the end. No ladder reaches heaven, so the divine row is reached on foot.
- **Fall, then the remedy:** five snakes drop you one square before the ladder of the virtue that heals them:
  - Pride of learning → Guru-bhakti
  - Greed → Dana
  - Anger → Daya
  - Hypocrisy → Tapas
  - Clinging → Vairagya

| Ladder | Virtue | Story |
|---|---|---|
| 6→15 | Maitri · Friendship | Crow, mouse, tortoise and deer (Panchatantra) |
| 12→24 | Buddhi · Wit | The lion and the clever hare (Panchatantra) |
| 23→37 | Guru-bhakti | Aruni holds back the flood (Mahabharata) |
| 28→45 | Satya · Truth | Satyakama Jabala (Chandogya 4.4) |
| 34→53 | Shraddha · Resolve | Nachiketa at Death's door (Katha) |
| 44→63 | Dana · Giving | "Datta" from the thunder (Brihadaranyaka 5.2) |
| 51→67 | Daya · Compassion | "Dayadhvam" from the thunder (Brihadaranyaka 5.2) |
| 57→75 | Dharma · Duty | King Janaka |
| 65→83 | Vairagya · Detachment | Maitreyi's question (Brihadaranyaka 2.4) |
| 72→89 | Tapas · Austerity | Bhrigu and Varuna (Taittiriya 3) |
| 85→94 | Viveka · Discernment | Two birds on one tree (Mundaka 3.1.1) |

| Snake | Vice | Story |
|---|---|---|
| 14→8 | Vachalata · Chatter | The tortoise and the geese |
| 19→11 | Asatya · Fibbing | The blue jackal |
| 29→17 | Alasya · Laziness | Subhashita |
| 39→22 | Vidya-mada · Pride of learning | The lion-makers |
| 47→31 | Kama · Craving | Yayati |
| 55→43 | Lobha · Greed | The greedy jackal and the bowstring |
| 59→50 | Krodha · Anger | The brahmin and the mongoose |
| 62→46 | Moha · Attachment | Dhritarashtra |
| 69→52 | Matsarya · Envy | Duryodhana at Indraprastha |
| 77→58 | Mada · Pride | The gods and the Yaksha (Kena 3) |
| 88→71 | Dambha · Hypocrisy | The cat who played ascetic |
| 93→64 | Asakti · Clinging | Jada Bharata and the fawn (Bhagavata 5.8) |
| 99→61 | Ahankara · Ego | Virochana and the reflection (Chandogya 8.8) |

A 20,000-game simulation (`npm run sim`) puts a single life at about 42 turns from birth to Moksha.

## Features
- **Every square is a card you can read.** Tap any square on the board, or any move in the log, to open its card. The cards are drawn as pothi folios, palm-leaf manuscript pages. ‹ › (or the arrow keys) turns the leaves from 1 to 110, so you can read the whole board without rolling once. Cards can be linked: `#sq/36` opens square 36.
- **Cards wait for you.** Your landing card stays open until you close it, and the computer waits while you read. A computer's own landing card closes itself after a moment, unless you start reading it.
- **Every square is a scene with someone in it, and an argument.** Each lead line names a person, a school or a text, and at the default depth two schools disagree about it.
- **Painted squares** in the Basohli manner: flat colour, one black outline, figures in profile with one large eye. The old emoji come back for any square without a picture.
- **Three reading depths:** *Story*, *Story + school* (what the darśanas would have argued on that square), and *Scholar* (IAST, notes on the sources, and the people involved). Square 36 carries Vedānta's three-way split over *tat tvam asi*, and square 110 sets each school's own idea of mokṣa side by side.
- **The Codex**, beside the moves: schools, sources and people. It fills in as you meet them and is kept between games. Entries can be linked too: `#codex/nyaya`.
- **English / हिंदी**, for the whole page (remembered), or per card with its own toggle. There is also an option to show both languages on every card, for Hindi learners. Hindi mode uses Devanagari digits.
- **Sound:** a die rattle, a page turn, a rising scale for ladders and a hiss for snakes, all synthesised with Web Audio. It has a mute button that is remembered, and it is softer with reduced motion.
- **Installable and offline:** add it to a phone's home screen, and it plays with no connection after one visit.
- **Pixel-art players** who grow from baby to student, householder, forest-dweller, renunciate and divine soul as they climb, and get younger again when a snake catches them. Ladder climbs and snake swallows are animated.
- 2–4 players, each human or computer.

To play locally, open `index.html`. Add `?seed=N` to replay the same dice (the current seed is shown under *Players & rules*). `?depth=scholar` sets the reading depth. Add `?debug` to get console helpers: `mp.jump(n)`, `mp.roll(v)`, `mp.seed()` / `mp.seed(n)`, `mp.open(n)`, `mp.entry(id)`, `mp.close()` and `mp.setLang("hi")`.

## Developing
`index.html` is built, so don't edit it by hand. The sources are:

- `src/`: the game as ES modules (`engine/` holds the rules, `render/` the drawing, and `rng.js` the only randomness)
- `content/*.json`: the squares and stories (`squares.json`), the school lines and scholar notes for each square (`readings.json`), the Codex (`codex.json`), the UI strings (`strings.json`), and the names a lead line can carry (`names.json`, for the lint)
- `assets/sprites.svg`: one Basohli symbol per square and a seal per school, inlined by the build (delete it and the board shows emoji)
- `src/sw.js`, `manifest.webmanifest`, `icons/`: the installable app (`node tools/icons.mjs` redraws the icons)
- `src/styles.css` and `src/index.html`: the page shell

```
npm install
npm run build    # inline src/ and content/ into index.html (refuses any Math.random outside rng.js)
npm test         # rules, RNG and content tests (the build also refuses content missing Hindi or pointing nowhere)
npm run lint     # the content lint alone: Hindi, two voices per square, a name in every lead, the sprite palette
npm run smoke    # every Phase 1 and 2 behaviour in a real browser, including offline, install and the emoji fallback
npm run sim      # 20,000 headless lives; `node tools/sim.mjs 20000 2` for two-player races
npm run golden   # replays seeds through the pre-split game, the build and the sim, and checks the logs match
```

Commit the rebuilt `index.html` with your changes. GitHub Pages serves it straight from `main`. See `REDESIGN.md` for the phased plan.
