# Board design review

Research into whether the board's own layout should change. Companion to
`REDESIGN.md`. Not a phase; a set of findings and ranked recommendations, several of
which are cheap and independent of the phase order.

The main source is Dennis, Bender et al., *Quantifying the Vices and Virtues of Snakes
and Ladders Through Time* (Board Game Studies Journal 18, 2024; arXiv:2304.14486),
which simulated three historical boards 100,000 games each and measured every snake and
ladder by ablation. It is the only quantitative study of these boards and it answers
most of the questions directly.

---

## 1. The correction: snakes did not outnumber ladders

The claim that snakes outnumbered ladders roughly two to one, "because the good path is
harder", is everywhere on the popular web. **It does not survive contact with the
documented boards.** I repeated it in `docs/REFERENCE.md §4` and that line is wrong;
it has been corrected there.

| Board | Ladders | Snakes | Ratio |
|---|---|---|---|
| Jaina, 84 squares | **15** | 9 | 1.67 ladders per snake |
| Vaiṣṇava, 72 squares | 10 | 10 | even |
| Mughal / Sufi, 100–101 squares | **17** | 13 | 1.31 ladders per snake |
| Milton Bradley, 100 squares (1998) | 9 | 10 | 0.9 |
| **Moksha Patam (current)** | **11** | **13** | **0.85** |

Every documented pre-modern board is balanced or ladder-heavy. The Jaina board, the most
explicitly ascetic of the three, has the *most* ladders of any of them.

So the current board is not more authentic for being snake-heavy. It is more punishing
than any historical board on record, and more punishing than the modern commercial one.

That does not automatically mean it should change. "The path of righteousness is
difficult" is a defensible design thesis and a snake-heavy board expresses it. But it
should be adopted as a deliberate choice, not as a restoration, because it is not one.

---

## 2. Placement beats length, by a lot

The strongest finding in the paper, and the most useful one here. Ablation results,
measured as turns added to the mean when the element is removed:

**Milton Bradley board** (full-game mean 40.1 turns)

| Element | Span | Effect |
|---|---|---|
| Ladder I | 80 → 100 | **+19.2** |
| Ladder E | 28 → 84 | +10.9 |
| Ladder A | 1 → 38 (longest on board) | **+0.8** |
| Chute P | 87 → 24 | −7.4 |
| Chute L | 49 → 11 | −4.8 |

**Vaiṣṇava board** (mean 64.5)

| Element | Span | Effect |
|---|---|---|
| Ladder J | 54 → 68, short, lands on the winning square | **+17.9** |
| Ladder B | 17 → 69, longest on board | **−3.3** (it *hurts*, by overshooting the win at 68) |
| Snake K | 63 → 3 | −10.7 |

**Jaina board** (mean 110.2): ladder J +56.3 and ladder I +40.6 dominate; the longest
ladder A is negligible.

The pattern holds on all three boards. **A short ladder near the goal is worth an order
of magnitude more than a long ladder early**, and a long ladder that overshoots the goal
is actively bad for the player who climbs it.

### What this costs the current design

The rule "no ladder reaches heaven, so the divine row is walked on foot" removes exactly
the class of element that these boards show to be the most powerful. The longest ladders
on the board (23→37, 28→45, 34→53, 44→63) all sit in the middle, where the evidence says
they do the least work; the short ones near the end (85→94) sit where they would do the
most, but they stop at 94 and the final sixteen squares have nothing.

The rule is thematically good and I would keep it. But the board should be measured so
the cost is known rather than assumed. See §6.

---

## 3. The cyclical board, which is better than the exact-roll rule

The most interesting historical mechanic in the paper, and it is a direct upgrade.

The Vaiṣṇava board's win square is 68, not 72. Overshooting carries you into 69–72, and
**snake T at 72 drops you back to 51 to go round again.** A roll that would exceed 72 is
not made.

The measured consequence: only **16.8%** of games never use snake T, and most games use
it more than once. Rebirth is not a theme painted on that board, it is the modal
experience of playing it.

Compare the current rule: you need an exact roll for 110 and otherwise stay put, which
is the thing roll-and-move design literature flags as the classic stalling fault. It
produces a player sitting at 107 rolling for three turns, which is boredom, not saṃsāra.

**Recommendation (revised).** Moving the win down to ~104 was my first suggestion and it
is wrong: 101–109 hold nine gods with Phase 2 and 3 writing, sprites and readings, and
110 holds the Mokṣa card. Nothing coherent sits above liberation, so there is no
overshoot zone to build there.

Do it with two changes that move no content. **Bounce-back**: a roll past 110 carries the
token to 110 and back down by the remainder, which kills the stall in one rule. **A snake
at 109 → 81**: svarga is a reward and rewards are finite — *kṣīṇe puṇye martya-lokaṃ
viśanti*, "when their merit is exhausted they enter the world of mortals again" (Gītā
9.21). Falling from one square below liberation, through Śiva who dissolves what binds,
back to the start of Sannyāsa, is the most thematically exact snake available anywhere on
this board, and it turns a sixteen-square victory lap into the most dangerous stretch of
the game. Tuning (109→81 vs
107→81 vs a shorter fall) belongs to the sim.

**Historical warrant for a snake out of the god-realm.** Checked, and it is stronger than
expected. Some boards required that a player who reached **Brahmaloka** early then
**descend a snake to *pṛthvī*, earth, at least once** before finishing. A snake's head on
the **final square** returned the player to the start, described as the punishment for
overreaching. And on the 72-square Johnson board (Gerald Robert Dampier, *North Indian Notes and Queries* vol. 5, 1895, pp. 25–27, ed. William Crooke) the win is Vaikuṇṭha via
the Bhakti ladder at 54, while **square 72 carries a long snake back to earth, triggered
by a throw going beyond the winning square 68**, landing on 51, "Darkness". Square 72
there is labelled **Love of Violence**, a vice rather than a heaven, and Dampier himself
says it is unclear why it should lead to Darkness — so that board warrants the *mechanic*
(overshoot the win, land above it, take a long fall) but not the theming. The Brahmaloka
rule is what warrants falling out of a god-realm.

Note what that implies about architecture: on the historical boards the winning square
sits a few steps *before* the end and everything above it is a hazard. This board uses the
modern arrangement with the goal on the last square. That is a reasonable choice, but it
means the divine row is a processional corridor where the sources made it a trap.

The Brahmaloka rule can also be taken literally: a `hasFallen` flag, with 110 opening only
after the player has taken the fall once, so the first arrival at liberation always
bounces. Attested rather than invented, but it forces an extra circuit, so measure before
adopting.

---

## 4. The randomizer is an unused lever

The Vaiṣṇava board was played with seven cowrie shells, not a die. Each shell lands up
or down at p = 0.5, so the move distribution is binomial, not uniform:

| Move | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| P | 0.78% | 5.47% | 16.41% | 27.34% | 27.34% | 16.41% | 5.47% | 0.78% |

The same board took 64.5 turns with a die and **100.5 with shells**. A bell-shaped
randomizer makes the game markedly longer and much less swingy, because extreme moves
become rare and a 0 is possible.

The Jaina board used a four-outcome stick die (1, 2, 5, 6) with 3 and 4 converted up,
which is a bimodal distribution: lots of tiny moves and lots of big ones, nothing in the
middle.

**Recommendation.** Offer the randomizer as a setting: die, cowries, stick die. It is a
dozen lines of code against the existing seeded RNG, it is historically grounded, and it
changes the feel of the game more cheaply than any content work. It also pairs with the
law system later, since a school that denies chance should not be rolling the same
object as one that embraces it.

---

## 5. Report the median, not the mean

The README says "a 20,000-game simulation puts the average game at about 42 turns per
player". The mean is the wrong statistic for this distribution.

Milton Bradley: mean 40.1, **median 33**, SD 25.6, min 7, **max 318**. About 3.3% of
solo games run past 100 moves, and across a trillion simulated games the longest took
729 rolls.

The distribution is heavily right-skewed and the tail is what players actually
experience as a problem. A mean of 42 conceals that one game in thirty is three times
that long.

**Recommendation.** Have `tools/sim.mjs` report median, 5th and 95th percentile, and the
share of games over 100 turns. Balance against the 95th percentile, not the mean.

---

## 6. The ablation harness

The paper's method should become a tool in the repo, because it answers the design
questions directly instead of by argument.

For each snake and each ladder, run N games with that element removed and report the
change in median turns. Then:

- Which of the 11 ladders and 13 snakes actually matter, and which are decoration.
- What the "no ladder reaches heaven" rule costs in turns.
- Whether the five snake-then-remedy pairings (the tail landing one square before the
  healing virtue's ladder) are reachable often enough to be felt, or are a design
  intention that almost never fires in play. **This is the one I would check first.** It
  is the most distinctive idea on the board and nobody has verified it happens.
- Whether the Ahaṅkāra snake at 99→61 is too punishing. On the Milton Bradley board the
  worst chute (87→24) costs 7.4 turns; 99→61 is a longer fall from a later square on a
  longer board.

Suggested output: a markdown table written to `docs/board-metrics.md` on every run, so
changes to the board are visible in diffs.

---

## 7. Roll-and-move fixes worth taking

From the design literature on the mechanic's known faults. Four apply here and none
require the later phases.

**Roll at the end of your turn.** In multiplayer, rolling at the end of your own turn
rather than the start lets everyone see what is coming and plan during other players'
turns. It removes downtime at no cost to the rules. Cheap, and worth doing whenever the
multiplayer work happens.

**Move up to the roll.** Letting a player move *any amount up to* the number rolled kills
the exact-roll stall and quietly introduces the first real decision in the game. This is
a smaller, earlier version of the dice-allocation idea in `REDESIGN.md §2.1` and could
be tested long before that phase.

**Stop on a square you pass.** Currently a player sails over most of the board and only
ever reads the squares they land on, which with 110 squares means most of the writing is
never seen in a given game. Letting a player stop on a passed square, or surfacing a
one-line glimpse of what they went by, would put the content in front of people. Given
how much writing Phase 2 and 3 are putting into these squares, this may be the highest
content-return-per-line-of-code item in this whole document.

**A re-roll token.** One per game, spent to reject a roll. It maps exactly onto the Yoga
law's *nirodha* resource already specced, so it can be prototyped now as a plain setting
and absorbed into that law later.

---

## 8. Recommendations, ranked

1. **Surface passed squares** (§7). Most of the content is currently unread in any given
   game. Cheap, immediate, and it compounds with the Phase 2 and 3 writing.
2. **Build the ablation harness** (§6), and check the snake-to-remedy pairings first.
   The board's most distinctive idea is currently unverified.
3. **Report median and 95th percentile** (§5). One function, and it changes what
   "balanced" means for every later decision.
4. **Replace the exact-roll stall with the cyclical overshoot** (§3). Documented,
   thematically exact, and it fixes a known stalling fault.
5. **Add the randomizer setting** (§4). Small, historical, changes the feel more per line
   than anything else available.
6. **Decide the snake/ladder ratio deliberately** (§1). Either keep 13:11 as a stated
   thesis and say so in the README, or move toward the historical balance. What should
   not stand is the current README's implication that the snake-heavy board is the
   authentic one.
7. **Move at least one short ladder into the final stretch** (§2), or accept the cost of
   the no-ladder-to-heaven rule with the number in hand.

Items 1, 2, 3 and 5 are independent of the phase plan and could be done in an afternoon
between phases. Items 4 and 7 change the board and should wait until the ablation
harness exists to measure them.

---

## Sources

- Dennis, Bender et al., [*Quantifying the Vices and Virtues of Snakes and Ladders Through Time*](https://arxiv.org/abs/2304.14486), Board Game Studies Journal 18 (2024). [PDF](https://arxiv.org/pdf/2304.14486) · [journal version](https://reference-global.com/article/10.2478/bgs-2024-0001)
- [Snakes and Ladders: History and Absorbing Markov Chains](https://professionalmoron.com/2025/08/10/snakes-and-ladders-board-game/) — Althoen, King & Schilling (1993) give 47.76 moves for a 100-square board and a 50.9% first-player win rate
- [Gyan chauper](https://en.wikipedia.org/wiki/Gyan_chauper) — board variants and the Mughal board's 17 ladders and 13 snakes
- [Why roll-and-move games aren't necessarily bad](https://tabletopbellhop.com/gaming-advice/roll-and-move/) — the mechanic's known faults and the standard fixes
