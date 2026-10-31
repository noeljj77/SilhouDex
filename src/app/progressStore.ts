import { createContext, useContext, useSyncExternalStore } from 'react';
import type { DifficultyLevel } from '../domain/clues/difficulty.ts';
import { toGameResult } from '../domain/game/engine.ts';
import type { GameMode, GameResult, GameSession } from '../domain/game/types.ts';
import { recordGameEnd, setActiveSession } from '../domain/progression/record.ts';
import type { ProgressData } from '../domain/progression/types.ts';
import type { ProgressRepository, StorageMode } from '../persistence/localRepository.ts';

export interface FinishOutcome {
  result: GameResult;
  /** False when the result was ignored because that daily date already had one. */
  recorded: boolean;
  isNewDiscovery: boolean;
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
}

/** Holds the player's progress in memory, writing every change through the repository. */
export function createProgressStore(repo: ProgressRepository): ProgressStore {
  let state = repo.load();
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
      commit(outcome.data);
      return { result, recorded: outcome.recorded, isNewDiscovery: outcome.isNewDiscovery };
    },
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
