// ---- Together and the race (REDESIGN.md Phase 19) ----
// A game of several seats is played together or as a race. Together, no one wins by arriving first: a life its law lets go
// frees its seat (p.free) and the others go on, and every other end of a life is born again in the seat; the game is over
// when no person is still living. The race is the older, shorter game: the first through the exit wins it. A game with no
// mode is a race, so every game from before Phase 19, and every tool that does not ask, plays as it did. Pure.
export const together = state => state?.rules?.mode === "together";
// How long a game played together lasts (Phase 19, 11 Nov): "free", until every soul is let go, born again in its seat
// as often as it takes; or "one", one life each, the game over when every seat's life has ended, and a soul that would be
// born again carries its saṃskāra into the next game (Be born again). Together with no length is "free".
export const oneLife = state => together(state) && state.rules.length === "one";
// Whether seat i's life was let go: the race's winner, or a seat freed in a game played together
export const liberated = (state, i) => state?.winner === i || !!state?.players?.[i]?.free;
