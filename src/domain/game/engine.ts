import type { DateKey } from '../../lib/utcDate.ts';
import type { SpeciesId } from '../pokemon/types.ts';
import { SCORING } from './config.ts';
import type { FinishedStatus, GameMode, GameResult, GameSession, GameView } from './types.ts';

export interface NewSession {
  id: string;
  mode: GameMode;
  pokemonId: SpeciesId;
  startedAt: string;
  challengeNumber?: number;
  dateKey?: DateKey;
}

export function createSession(init: NewSession): GameSession {
  return { ...init, guesses: [], status: 'playing' };
}

function countWrong(session: GameSession): number {
  return session.guesses.filter((g) => !g.correct).length;
}

/** Score for a given number of wrong guesses: 100, 85, 70, 55, 40, 25. Never below zero. */
export function scoreForWrongGuesses(wrong: number): number {
  return Math.max(0, SCORING.startScore - wrong * SCORING.wrongGuessPenalty);
}

/** Derives everything the UI shows from the stored session. */
export function getGameView(session: GameSession): GameView {
  const wrongGuesses = countWrong(session);
  const isOver = session.status !== 'playing';
  // A win keeps the points earned so far. A loss or a give-up scores nothing.
  const score =
    session.status === 'lost' || session.status === 'gave_up'
      ? 0
      : scoreForWrongGuesses(wrongGuesses);
  const reveals = Math.min(wrongGuesses, SCORING.maxReveals);
  return {
    wrongGuesses,
    score,
    revealStage: reveals,
    cluesUnlocked: reveals,
    guessesLeft: isOver ? 0 : SCORING.maxWrongGuesses - wrongGuesses,
    isFinalGuess: !isOver && wrongGuesses === SCORING.maxReveals,
    isOver,
  };
}

export type GuessOutcome =
  /** The right Pokémon: the game is won. */
  | 'correct'
  /** A wrong Pokémon: costs points and reveals more. */
  | 'wrong'
  /** Already guessed: ignored, no penalty. */
  | 'duplicate'
  /** The game is already over. */
  | 'ignored';

export function submitGuess(
  session: GameSession,
  pokemonId: SpeciesId,
  at: string,
): { session: GameSession; outcome: GuessOutcome } {
  if (session.status !== 'playing') return { session, outcome: 'ignored' };
  if (session.guesses.some((g) => g.pokemonId === pokemonId)) {
    return { session, outcome: 'duplicate' };
  }

  const correct = pokemonId === session.pokemonId;
  const guesses = [...session.guesses, { pokemonId, correct, at }];
  const wrong = guesses.filter((g) => !g.correct).length;

  if (correct) {
    return { session: { ...session, guesses, status: 'won', endedAt: at }, outcome: 'correct' };
  }
  if (wrong >= SCORING.maxWrongGuesses) {
    return { session: { ...session, guesses, status: 'lost', endedAt: at }, outcome: 'wrong' };
  }
  return { session: { ...session, guesses }, outcome: 'wrong' };
}

/** Giving up ends the game with zero points. Does nothing if the game is already over. */
export function giveUp(session: GameSession, at: string): GameSession {
  if (session.status !== 'playing') return session;
  return { ...session, status: 'gave_up', endedAt: at };
}

/** Builds the result to lock in. Throws if the game is still being played. */
export function toGameResult(session: GameSession): GameResult {
  if (session.status === 'playing' || !session.endedAt) {
    throw new Error('Cannot build a result for a game that is still in progress');
  }
  const view = getGameView(session);
  const result: GameResult = {
    sessionId: session.id,
    mode: session.mode,
    pokemonId: session.pokemonId,
    status: session.status satisfies FinishedStatus,
    score: view.score,
    wrongGuesses: view.wrongGuesses,
    revealsUsed: view.revealStage,
    completedAt: session.endedAt,
  };
  if (session.dateKey) result.dateKey = session.dateKey;
  if (session.challengeNumber !== undefined) result.challengeNumber = session.challengeNumber;
  return result;
}
