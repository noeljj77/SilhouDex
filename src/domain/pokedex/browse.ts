import { normalizeName } from '../../lib/normalize.ts';
import type { Discovery } from '../progression/types.ts';
import type { Generation, PokemonIndexEntry, PokemonType, SpeciesId } from '../pokemon/types.ts';

export type StatusFilter = 'all' | 'discovered' | 'undiscovered';
export type SortKey = 'number-asc' | 'number-desc' | 'name-asc' | 'name-desc' | 'recent' | 'most';

export const SORT_LABELS: Record<SortKey, string> = {
  'number-asc': 'Number, low to high',
  'number-desc': 'Number, high to low',
  'name-asc': 'Name, A to Z',
  'name-desc': 'Name, Z to A',
  recent: 'Recently discovered',
  most: 'Most discovered',
};

export interface PokedexFilters {
  status: StatusFilter;
  generation: Generation | 'all';
  type: PokemonType | 'all';
  /** A name (matches discovered Pokémon only) or a Pokédex number like "25" or "#25". */
  query: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: PokedexFilters = {
  status: 'all',
  generation: 'all',
  type: 'all',
  query: '',
  sort: 'number-asc',
};

export interface PokedexRow {
  entry: PokemonIndexEntry;
  /** Present only for Pokémon the player has correctly identified. */
  discovery?: Discovery;
}

type Discoveries = Readonly<Record<SpeciesId, Discovery>>;

/**
 * Searching by name only finds Pokémon you have discovered. Otherwise typing a name would reveal
 * which silhouette it belongs to, which spoils the game. Numbers always work.
 */
function matchesQuery(row: PokedexRow, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const digits = /^#?(\d+)$/.exec(trimmed)?.[1];
  if (digits) return String(row.entry.id).startsWith(digits.replace(/^0+(?=\d)/, ''));
  return (
    row.discovery !== undefined && normalizeName(row.entry.name).includes(normalizeName(trimmed))
  );
}

/**
 * Sorting by name or discovery date only orders Pokémon you have discovered. The rest follow in
 * number order, so the order never hints at an undiscovered Pokémon's name.
 */
function compare(sort: SortKey): (a: PokedexRow, b: PokedexRow) => number {
  const byNumber = (a: PokedexRow, b: PokedexRow) => a.entry.id - b.entry.id;
  const discoveredFirst =
    (inner: (a: PokedexRow, b: PokedexRow) => number) => (a: PokedexRow, b: PokedexRow) => {
      if (a.discovery && !b.discovery) return -1;
      if (!a.discovery && b.discovery) return 1;
      if (!a.discovery && !b.discovery) return byNumber(a, b);
      return inner(a, b) || byNumber(a, b);
    };
  switch (sort) {
    case 'number-asc':
      return byNumber;
    case 'number-desc':
      return (a, b) => b.entry.id - a.entry.id;
    case 'name-asc':
      return discoveredFirst((a, b) => a.entry.name.localeCompare(b.entry.name, 'en'));
    case 'name-desc':
      return discoveredFirst((a, b) => b.entry.name.localeCompare(a.entry.name, 'en'));
    case 'recent':
      return discoveredFirst((a, b) =>
        b.discovery!.lastDiscoveredAt.localeCompare(a.discovery!.lastDiscoveredAt),
      );
    case 'most':
      return discoveredFirst((a, b) => b.discovery!.timesDiscovered - a.discovery!.timesDiscovered);
  }
}

/** The Pokédex as shown: every Pokémon with its discovery (if any), filtered and sorted. */
export function browsePokedex(
  entries: readonly PokemonIndexEntry[],
  discoveries: Discoveries,
  filters: PokedexFilters,
): PokedexRow[] {
  return entries
    .map<PokedexRow>((entry) => ({ entry, discovery: discoveries[entry.id] }))
    .filter((row) => {
      if (filters.status === 'discovered' && !row.discovery) return false;
      if (filters.status === 'undiscovered' && row.discovery) return false;
      if (filters.generation !== 'all' && row.entry.generation !== filters.generation) return false;
      if (filters.type !== 'all' && !row.entry.types.includes(filters.type)) return false;
      return matchesQuery(row, filters.query);
    })
    .sort(compare(filters.sort));
}

export interface GenerationProgress {
  generation: Generation;
  discovered: number;
  total: number;
}

/** Discovered / total for each generation, in order. */
export function generationProgress(
  entries: readonly PokemonIndexEntry[],
  discoveries: Discoveries,
): GenerationProgress[] {
  const byGen = new Map<Generation, GenerationProgress>();
  for (const e of entries) {
    const row = byGen.get(e.generation) ?? { generation: e.generation, discovered: 0, total: 0 };
    row.total += 1;
    if (discoveries[e.id]) row.discovered += 1;
    byGen.set(e.generation, row);
  }
  return [...byGen.values()].sort((a, b) => a.generation - b.generation);
}
