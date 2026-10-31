import type { DateKey } from '../../lib/utcDate.ts';
import type { SpeciesId } from '../pokemon/types.ts';

export type GameMode = 'daily' | 'practice';
export type GameStatus = 'playing' | 'won' | 'lost' | 'gave_up';
export type FinishedStatus = Exclude<GameStatus, 'playing'>;

export interface Guess {
  pokemonId: SpeciesId;
  correct: boolean;
  /** ISO timestamp. */
  at: string;
}

/** One playthrough. Everything else (score, reveals, clues) is derived from this. */
export interface GameSession {
  id: string;
  mode: GameMode;
  pokemonId: SpeciesId;
  /** Daily only. */
  challengeNumber?: number;
  /** Daily only: the UTC date this challenge belongs to. */
  dateKey?: DateKey;
  guesses: Guess[];
  status: GameStatus;
  startedAt: string;
  endedAt?: string;
}

/** What gets locked in when a game ends. */
export interface GameResult {
  sessionId: string;
  mode: GameMode;
  pokemonId: SpeciesId;
  status: FinishedStatus;
  score: number;
  wrongGuesses: number;
  /** How many silhouette reveals the player triggered (0–5). */
  revealsUsed: number;
  /** ISO timestamp. */
  completedAt: string;
  dateKey?: DateKey;
  challengeNumber?: number;
}

/** Everything the UI needs to draw a session. Never stored. */
export interface GameView {
  wrongGuesses: number;
  score: number;
  /** 0 = opening silhouette, 5 = fully revealed. */
  revealStage: number;
  /** How many of the five clues are unlocked. */
  cluesUnlocked: number;
  /** Guesses left before the game is lost (0 once over). */
  guessesLeft: number;
  /** True while the last allowed guess is in play (all reveals used). */
  isFinalGuess: boolean;
  isOver: boolean;
}
