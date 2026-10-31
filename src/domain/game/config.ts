/** Tunable game rules. Keep every number here so balance changes touch one file. */
export const SCORING = {
  startScore: 100,
  wrongGuessPenalty: 15,
  /** The Nth wrong guess ends the game: 5 reveals + one final guess. */
  maxWrongGuesses: 6,
  /** Wrong guesses that trigger a reveal and a clue. */
  maxReveals: 5,
} as const;

/** Share of the silhouette visible at each reveal stage (stage = wrong guesses so far, max 5). */
export const REVEAL_FRACTIONS = [0.12, 0.3, 0.48, 0.66, 0.84, 1] as const;

export const CLUES_PER_GAME = 5;
