import { createContext, useContext, useSyncExternalStore } from 'react';
import { pokedexIndex } from '../data/pokedexIndex.ts';
import { markSeen, unlockAchievements } from '../domain/achievements/evaluator.ts';
import type { DifficultyLevel } from '../domain/clues/difficulty.ts';
import { toGameResult } from '../domain/game/engine.ts';
import type { GameMode, GameResult, GameSession } from '../domain/game/types.ts';
import { recordGameEnd, setActiveSession } from '../domain/progression/record.ts';
import type { PokemonIndexEntry } from '../domain/pokemon/types.ts';
import type { ProgressData } from '../domain/progression/types.ts';
import type { ProgressRepository, StorageMode } from '../persistence/localRepository.ts';

export interface FinishOutcome {
  result: GameResult;
  /** False when the result was ignored because that daily date already had one. */
  recorded: boolean;
  isNewDiscovery: boolean;
  /** Achievements this game unlocked (ids). */
  newAchievements: string[];
}

export interface ProgressStore {
  getSnapshot(): ProgressData;
  subscribe(listener: () => void): () => void;
  readonly storageMode: StorageMode;
  /** Saves the unfinished game so a refresh can resume it. */
  saveActive(mode: GameMode, session: GameSession): void;
  /** Drops an unfinished game (for example one left over from a previous day). */
  clearActive(mode: GameMode): void;
  /** Locks in a finished game: result, discovery, and clearing the unfinished game. */
  finishGame(session: GameSession): FinishOutcome;
  /** Clue difficulty for Practice. (Daily always uses the same difficulty for everyone.) */
  setDifficulty(difficulty: DifficultyLevel): void;
  /** Records that the player has been shown these unlocked achievements. */
  markAchievementsSeen(ids: readonly string[]): void;
}

export interface ProgressStoreOptions {
  /** The Pokémon achievements are measured against. Defaults to the bundled Pokédex. */
  catalogue?: readonly PokemonIndexEntry[];
  now?: () => string;
}

/** Holds the player's progress in memory, writing every change through the repository. */
export function createProgressStore(
  repo: ProgressRepository,
  options: ProgressStoreOptions = {},
): ProgressStore {
  const catalogue = options.catalogue ?? pokedexIndex.entries;
  const now = options.now ?? (() => new Date().toISOString());
  let state = repo.load();

  // Catch up on progress made before achievements existed. These unlocks start as already seen.
  const caughtUp = unlockAchievements(state, catalogue, now(), true);
  if (caughtUp.newlyUnlocked.length > 0) {
    state = caughtUp.data;
    repo.save(state);
  }
  const listeners = new Set<() => void>();

  const commit = (next: ProgressData) => {
    if (next === state) return;
    state = next;
    repo.save(state);
    listeners.forEach((l) => l());
  };

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get storageMode() {
      return repo.mode;
    },
    saveActive: (mode, session) => commit(setActiveSession(state, mode, session)),
    clearActive: (mode) => commit(setActiveSession(state, mode, undefined)),
    finishGame(session) {
      const result = toGameResult(session);
      const outcome = recordGameEnd(state, result);
      let next = outcome.data;
      let newAchievements: string[] = [];
      if (outcome.recorded) {
        const unlocked = unlockAchievements(next, catalogue, result.completedAt);
        next = unlocked.data;
        newAchievements = unlocked.newlyUnlocked;
      }
      commit(next);
      return {
        result,
        recorded: outcome.recorded,
        isNewDiscovery: outcome.isNewDiscovery,
        newAchievements,
      };
    },
    markAchievementsSeen: (ids) => commit(markSeen(state, ids)),
    setDifficulty: (difficulty) => {
      if (state.settings.difficulty === difficulty) return;
      commit({ ...state, settings: { ...state.settings, difficulty } });
    },
  };
}

export const ProgressContext = createContext<ProgressStore | null>(null);

export function useProgressStore(): ProgressStore {
  const store = useContext(ProgressContext);
  if (!store) throw new Error('useProgressStore must be used inside <ProgressProvider>');
  return store;
}

/** The player's current progress. Re-renders whenever it changes. */
export function useProgress(): ProgressData {
  const store = useProgressStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
