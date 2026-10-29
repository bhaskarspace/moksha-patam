// Phase 17: Śiva's snake is rebirth in the seat, so a game played out can hold several lives a seat (p.past, then the
// life in it). Tests written about one life a seat read each seat's first: the game as it stood when that life ended.
export const firstLives = s => (s.players.some(p => p.past?.length)
  ? { ...s, winner: s.players[s.winner]?.past?.length ? null : s.winner, players: s.players.map(p => p.past?.[0] ?? p) }
  : s);
