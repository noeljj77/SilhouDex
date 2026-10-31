import { describe, expect, it } from 'vitest';
import type { PokemonIndexEntry } from '../domain/pokemon/types.ts';
import { validateIndex } from './indexValidation.ts';
import { createPokedexIndex, pokedexIndex } from './pokedexIndex.ts';

describe('bundled Pokédex index', () => {
  it('passes validation', () => {
    expect(validateIndex(pokedexIndex.entries)).toEqual([]);
  });

  it('covers the National Pokédex without gaps', () => {
    expect(pokedexIndex.entries.length).toBeGreaterThanOrEqual(1025);
    expect(pokedexIndex.getById(1)?.name).toBe('Bulbasaur');
    expect(pokedexIndex.getById(1025)?.name).toBe('Pecharunt');
  });

  it.each([
    ['flabebe', 'Flabébé'],
    ['farfetchd', 'Farfetch’d'],
    ['mr mime', 'Mr. Mime'],
    ['nidoran f', 'Nidoran♀'],
    ['Type: Null', 'Type: Null'],
    ['PORYGON-Z', 'Porygon-Z'],
  ])('finds "%s" as %s', (typed, expected) => {
    expect(pokedexIndex.findByName(typed)?.name).toBe(expected);
  });

  it('returns undefined for unknown names', () => {
    expect(pokedexIndex.findByName('notapokemon')).toBeUndefined();
    expect(pokedexIndex.findByName('')).toBeUndefined();
  });

  it('searches with prefix matches before inner matches', () => {
    const names = pokedexIndex.search('char', 50).map((e) => e.name);
    expect(names[0]).toBe('Charmander');
    const firstInner = names.findIndex((n) => !n.toLowerCase().startsWith('char'));
    const lastPrefix = names.map((n) => n.toLowerCase().startsWith('char')).lastIndexOf(true);
    if (firstInner !== -1) expect(lastPrefix).toBeLessThan(firstInner);
  });

  it('limits results and ignores empty queries', () => {
    expect(pokedexIndex.search('a', 5)).toHaveLength(5);
    expect(pokedexIndex.search('   ')).toEqual([]);
  });

  it('gives Mew and Mewtwo the right rarity flags', () => {
    expect(pokedexIndex.findByName('Mew')).toMatchObject({ isMythical: true, isLegendary: false });
    expect(pokedexIndex.findByName('Mewtwo')).toMatchObject({
      isLegendary: true,
      isMythical: false,
    });
  });
});

describe('createPokedexIndex', () => {
  it('works on a custom list', () => {
    const entry: PokemonIndexEntry = {
      id: 1,
      slug: 'test',
      name: 'Test',
      generation: 1,
      types: ['fire'],
      isLegendary: false,
      isMythical: false,
      artworkUrl: 'https://example.com/1.png',
    };
    const index = createPokedexIndex([entry]);
    expect(index.getById(1)).toBe(entry);
    expect(index.search('te')).toEqual([entry]);
  });
});
