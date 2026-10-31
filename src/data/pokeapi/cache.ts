import type { PokemonDetails, SpeciesId } from '../../domain/pokemon/types.ts';

/** Bump when the shape of PokemonDetails changes, so stale cached records are ignored. */
export const DETAILS_CACHE_VERSION = 1;
const KEY_PREFIX = 'silhoudex:cache:pokemon:';

interface CachedRecord {
  v: number;
  fetchedAt: string;
  data: PokemonDetails;
}

export interface DetailsCache {
  get(id: SpeciesId): PokemonDetails | null;
  set(id: SpeciesId, details: PokemonDetails): void;
  clear(): void;
}

/**
 * Caches Pokémon details in LocalStorage. This is a pure cache: every failure (storage blocked,
 * quota full, corrupt JSON, old version) quietly behaves like a cache miss, and nothing here is
 * ever needed for correctness. It lives under its own key prefix, apart from player progress.
 */
export function createDetailsCache(storage?: Storage): DetailsCache {
  const resolve = (): Storage | null => {
    try {
      return storage ?? globalThis.localStorage ?? null;
    } catch {
      return null; // accessing localStorage can throw in some privacy modes
    }
  };

  return {
    get(id) {
      try {
        const raw = resolve()?.getItem(KEY_PREFIX + id);
        if (!raw) return null;
        const record = JSON.parse(raw) as Partial<CachedRecord>;
        if (record.v !== DETAILS_CACHE_VERSION || record.data?.id !== id) return null;
        return record.data;
      } catch {
        return null;
      }
    },
    set(id, details) {
      try {
        const record: CachedRecord = {
          v: DETAILS_CACHE_VERSION,
          fetchedAt: new Date().toISOString(),
          data: details,
        };
        resolve()?.setItem(KEY_PREFIX + id, JSON.stringify(record));
      } catch {
        // Quota or blocked storage: skip caching.
      }
    },
    clear() {
      try {
        const store = resolve();
        if (!store) return;
        const keys: string[] = [];
        for (let i = 0; i < store.length; i++) {
          const key = store.key(i);
          if (key?.startsWith(KEY_PREFIX)) keys.push(key);
        }
        keys.forEach((key) => store.removeItem(key));
      } catch {
        // ignore
      }
    },
  };
}
