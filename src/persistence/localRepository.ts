import { createEmptyProgress } from '../domain/progression/record.ts';
import type { ProgressData } from '../domain/progression/types.ts';
import { newId } from '../lib/id.ts';
import { migrateToCurrent } from './migrations.ts';

export const STORAGE_KEY = 'silhoudex:v1:progress';
const BACKUP_PREFIX = 'silhoudex:backup:';

/**
 *  - persistent: saved in LocalStorage.
 *  - memory: LocalStorage is blocked, so progress lasts only until the page closes.
 *  - read-only: stored data came from a newer version of the app; it is left untouched.
 */
export type StorageMode = 'persistent' | 'memory' | 'read-only';

/** The only door to stored progress. A backend version can replace this later. */
export interface ProgressRepository {
  readonly mode: StorageMode;
  load(): ProgressData;
  save(data: ProgressData): void;
}

export interface LocalRepositoryOptions {
  storage?: Storage;
  now?: () => string;
  playerId?: () => string;
}

function getStorage(storage?: Storage): Storage | null {
  try {
    const store = storage ?? globalThis.localStorage;
    if (!store) return null;
    const probe = 'silhoudex:probe';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

export function createLocalRepository(options: LocalRepositoryOptions = {}): ProgressRepository {
  const now = options.now ?? (() => new Date().toISOString());
  const playerId = options.playerId ?? newId;
  const store = getStorage(options.storage);
  let mode: StorageMode = store ? 'persistent' : 'memory';

  /** Keeps a copy of data we cannot read, so nothing is ever silently lost. */
  const backUp = (raw: string) => {
    try {
      store?.setItem(`${BACKUP_PREFIX}${Date.now()}`, raw);
    } catch {
      // Backup is best effort.
    }
  };

  const save = (data: ProgressData) => {
    if (!store || mode === 'read-only') return;
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      mode = 'memory'; // storage became unavailable or full
    }
  };

  return {
    get mode() {
      return mode;
    },
    save,
    load() {
      const fresh = () => createEmptyProgress(now(), playerId());
      if (!store) return fresh();
      let raw: string | null;
      try {
        raw = store.getItem(STORAGE_KEY);
      } catch {
        mode = 'memory';
        return fresh();
      }
      if (raw === null) return fresh();

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        backUp(raw);
        return fresh();
      }

      const result = migrateToCurrent(parsed, { now: now(), playerId: playerId() });
      if (result.status === 'ok') {
        if (result.migrated) {
          backUp(raw); // keep the pre-upgrade copy
          save(result.data);
        }
        return result.data;
      }
      if (result.status === 'future') {
        mode = 'read-only';
        return fresh();
      }
      backUp(raw);
      return fresh();
    },
  };
}
