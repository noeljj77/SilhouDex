import { normalizeName } from '../lib/normalize.ts';
import type { PokemonIndexEntry, SpeciesId } from '../domain/pokemon/types.ts';
import indexFile from './pokedex-index.json';

/** Lookup helpers over a list of index entries. Built once, so searches never rescan the data. */
export interface PokedexIndex {
  readonly entries: readonly PokemonIndexEntry[];
  getById(id: SpeciesId): PokemonIndexEntry | undefined;
  /** Exact match after normalising (accents, case, punctuation). Used to validate guesses. */
  findByName(input: string): PokemonIndexEntry | undefined;
  /** Prefix matches first, then substring matches, each in Pokédex order. */
  search(query: string, limit?: number): PokemonIndexEntry[];
}

export function createPokedexIndex(entries: readonly PokemonIndexEntry[]): PokedexIndex {
  const byId = new Map<SpeciesId, PokemonIndexEntry>();
  const byName = new Map<string, PokemonIndexEntry>();
  const keyed = entries.map((entry) => {
    const key = normalizeName(entry.name);
    byId.set(entry.id, entry);
    byName.set(key, entry);
    return { entry, key };
  });

  return {
    entries,
    getById: (id) => byId.get(id),
    findByName: (input) => byName.get(normalizeName(input)),
    search(query, limit = 8) {
      const q = normalizeName(query);
      if (!q) return [];
      const prefix: PokemonIndexEntry[] = [];
      const inner: PokemonIndexEntry[] = [];
      for (const { entry, key } of keyed) {
        if (key.startsWith(q)) prefix.push(entry);
        else if (key.includes(q)) inner.push(entry);
      }
      return [...prefix, ...inner].slice(0, limit);
    },
  };
}

interface IndexFile {
  schemaVersion: number;
  count: number;
  entries: PokemonIndexEntry[];
}

const file = indexFile as unknown as IndexFile;

/** The bundled index of every eligible Pokémon. */
export const pokedexIndex: PokedexIndex = createPokedexIndex(file.entries);
