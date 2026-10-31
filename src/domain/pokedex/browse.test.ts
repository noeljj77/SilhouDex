import { describe, expect, it } from 'vitest';
import { pokedexIndex } from '../../data/pokedexIndex.ts';
import type { Discovery } from '../progression/types.ts';
import type { SpeciesId } from '../pokemon/types.ts';
import {
  browsePokedex,
  DEFAULT_FILTERS,
  generationProgress,
  type PokedexFilters,
} from './browse.ts';

const entries = pokedexIndex.entries;
const found = (
  id: number,
  last: string,
  times = 1,
  modes: Discovery['modes'] = ['daily'],
): [number, Discovery] => [
  id,
  { pokemonId: id, firstDiscoveredAt: last, lastDiscoveredAt: last, timesDiscovered: times, modes },
];
const discoveries = Object.fromEntries([
  found(25, '2026-11-03T10:00:00.000Z', 2), // Pikachu
  found(1, '2026-11-01T10:00:00.000Z', 1), // Bulbasaur
  found(4, '2026-11-05T10:00:00.000Z', 5), // Charmander
  found(150, '2026-11-02T10:00:00.000Z', 1), // Mewtwo
]) as Record<SpeciesId, Discovery>;

const browse = (over: Partial<PokedexFilters> = {}) =>
  browsePokedex(entries, discoveries, { ...DEFAULT_FILTERS, ...over });
const ids = (over: Partial<PokedexFilters> = {}) => browse(over).map((r) => r.entry.id);

describe('browsePokedex: the full catalogue', () => {
  it('lists every Pokémon in number order by default', () => {
    const rows = browse();
    expect(rows).toHaveLength(1025);
    expect(rows.map((r) => r.entry.id)).toEqual(Array.from({ length: 1025 }, (_, i) => i + 1));
  });

  it('attaches the discovery to exactly the discovered Pokémon', () => {
    const rows = browse();
    expect(rows.filter((r) => r.discovery).map((r) => r.entry.id)).toEqual([1, 4, 25, 150]);
    expect(rows[24]!.discovery?.timesDiscovered).toBe(2);
  });
});

describe('status filter', () => {
  it('shows only discovered Pokémon', () => {
    expect(ids({ status: 'discovered' })).toEqual([1, 4, 25, 150]);
  });

  it('shows only undiscovered Pokémon', () => {
    const rest = ids({ status: 'undiscovered' });
    expect(rest).toHaveLength(1021);
    expect(rest).not.toContain(25);
  });

  it('discovered + undiscovered always add up to everything', () => {
    expect(ids({ status: 'discovered' }).length + ids({ status: 'undiscovered' }).length).toBe(
      1025,
    );
  });
});

describe('generation and type filters', () => {
  it('filters by generation', () => {
    const gen1 = ids({ generation: 1 });
    expect(gen1).toHaveLength(151);
    expect(Math.max(...gen1)).toBe(151);
    expect(ids({ generation: 9 })).toHaveLength(120);
  });

  it('filters by type, including Pokémon that have it as their second type', () => {
    const poison = browse({ type: 'poison' });
    expect(poison.every((r) => r.entry.types.includes('poison'))).toBe(true);
    expect(poison.find((r) => r.entry.id === 1)).toBeDefined(); // Bulbasaur: grass/poison
    expect(poison.find((r) => r.entry.id === 25)).toBeUndefined();
  });

  it('combines filters', () => {
    expect(ids({ generation: 1, type: 'fire', status: 'discovered' })).toEqual([4]);
    expect(ids({ generation: 1, type: 'electric', status: 'discovered' })).toEqual([25]);
    expect(ids({ generation: 2, status: 'discovered' })).toEqual([]);
  });
});

describe('search', () => {
  it('finds discovered Pokémon by name, loosely', () => {
    expect(ids({ query: 'pika' })).toEqual([25]);
    expect(ids({ query: 'PIKACHU' })).toEqual([25]);
    expect(ids({ query: ' char ' })).toEqual([4]);
  });

  it('does NOT find undiscovered Pokémon by name (that would spoil the silhouettes)', () => {
    expect(ids({ query: 'eevee' })).toEqual([]);
    expect(ids({ query: 'squirtle' })).toEqual([]);
  });

  it('finds any Pokémon by number, discovered or not', () => {
    expect(ids({ query: '25' })).toContain(25);
    expect(ids({ query: '#133' })).toEqual([133]);
    expect(ids({ query: '0133' })).toEqual([133]);
  });

  it('treats a number as a prefix, like search-as-you-type', () => {
    const r = ids({ query: '15' });
    expect(r).toContain(15);
    expect(r).toContain(150);
    expect(r).toContain(151);
    expect(r).not.toContain(25);
  });

  it('shows everything for an empty query', () => {
    expect(ids({ query: '   ' })).toHaveLength(1025);
  });

  it('works together with other filters', () => {
    expect(ids({ query: 'pika', generation: 2 })).toEqual([]);
    expect(ids({ query: '1', generation: 1, type: 'grass', status: 'discovered' })).toEqual([1]);
  });
});

describe('sorting', () => {
  it('number descending', () => {
    expect(ids({ sort: 'number-desc' }).slice(0, 3)).toEqual([1025, 1024, 1023]);
  });

  it('name sorting orders discovered Pokémon, then the rest by number (no hint at hidden names)', () => {
    const asc = ids({ sort: 'name-asc' });
    expect(asc.slice(0, 4)).toEqual([1, 4, 150, 25]); // Bulbasaur, Charmander, Mewtwo, Pikachu
    expect(asc.slice(4, 7)).toEqual([2, 3, 5]);
    const desc = ids({ sort: 'name-desc' });
    expect(desc.slice(0, 4)).toEqual([25, 150, 4, 1]);
  });

  it('recently discovered puts the newest first, then undiscovered by number', () => {
    const r = ids({ sort: 'recent' });
    expect(r.slice(0, 4)).toEqual([4, 25, 150, 1]);
    expect(r.slice(4, 6)).toEqual([2, 3]);
  });

  it('most discovered puts the most-repeated first', () => {
    const r = ids({ sort: 'most' });
    expect(r.slice(0, 2)).toEqual([4, 25]);
  });

  it('keeps ties in number order', () => {
    const r = ids({ sort: 'most' });
    expect(r.slice(2, 4)).toEqual([1, 150]); // both discovered once
  });

  it('sorts the filtered list, not the whole catalogue', () => {
    expect(ids({ status: 'discovered', sort: 'recent' })).toEqual([4, 25, 150, 1]);
  });
});

describe('generationProgress', () => {
  it('counts discovered and total for each of the nine generations', () => {
    const progress = generationProgress(entries, discoveries);
    expect(progress.map((g) => g.generation)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(progress[0]).toEqual({ generation: 1, discovered: 4, total: 151 });
    expect(progress[1]).toEqual({ generation: 2, discovered: 0, total: 100 });
    expect(progress.reduce((n, g) => n + g.total, 0)).toBe(1025);
    expect(progress.reduce((n, g) => n + g.discovered, 0)).toBe(4);
  });

  it('is zero for an empty collection', () => {
    expect(generationProgress(entries, {}).every((g) => g.discovered === 0)).toBe(true);
  });
});
