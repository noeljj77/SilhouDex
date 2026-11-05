import type { DateKey } from '../../lib/utcDate.ts';
import type { DifficultyLevel } from '../clues/difficulty.ts';
import type { GameMode, GameResult, GameSession } from '../game/types.ts';
import type { Generation, SpeciesId } from '../pokemon/types.ts';

/** One collected Pokémon. Only correct guesses create or update these. */
export interface Discovery {
  pokemonId: SpeciesId;
  /** ISO timestamp of the first correct guess. Never changes. */
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
  timesDiscovered: number;
  /** Which modes it has been discovered in. */
  modes: GameMode[];
}

export interface AchievementState {
  /** ISO timestamp, set once when unlocked. */
  unlockedAt?: string;
  /** False until the player has seen the unlock animation. */
  seen: boolean;
}

export interface PlayerSettings {
  difficulty: DifficultyLevel;
  /** Which generations Practice picks its Pokémon from. Never empty. Daily ignores it. */
  generations: Generation[];
}

/** Everything stored for one player. Statistics and streaks are derived from this, never stored. */
export interface ProgressData {
  schemaVersion: number;
  player: { id: string; createdAt: string };
  settings: PlayerSettings;
  daily: {
    /** One locked result per UTC date. */
    results: Record<DateKey, GameResult>;
    /** The unfinished daily game, if any. */
    active?: GameSession;
  };
  practice: {
    results: GameResult[];
    active?: GameSession;
  };
  discoveries: Record<SpeciesId, Discovery>;
  achievements: Record<string, AchievementState>;
}
