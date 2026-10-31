import { describe, expect, it } from 'vitest';
import { fixtures } from '../../test/fixtures/pokeapi/index.ts';
import {
  cleanFlavorText,
  defaultVarietyUrl,
  idFromUrl,
  mapDetails,
  mapEvolution,
  mapIndexEntry,
  parseGeneration,
} from './mappers.ts';

const details = (name: keyof typeof fixtures) => {
  const { species, pokemon, chain } = fixtures[name];
  return mapDetails(species, pokemon, chain);
};

describe('parseGeneration', () => {
  it('reads roman-numeral generation slugs', () => {
    expect(parseGeneration('generation-i')).toBe(1);
    expect(parseGeneration('generation-iv')).toBe(4);
    expect(parseGeneration('generation-ix')).toBe(9);
  });

  it('throws on unknown generations instead of guessing', () => {
    expect(() => parseGeneration('generation-x')).toThrow();
    expect(() => parseGeneration('gen-3')).toThrow();
  });
});

describe('idFromUrl', () => {
  it('reads ids with or without a trailing slash', () => {
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon-species/25/')).toBe(25);
    expect(idFromUrl('https://pokeapi.co/api/v2/pokemon/10001')).toBe(10001);
  });

  it('throws when there is no id', () => {
    expect(() => idFromUrl('https://pokeapi.co/api/v2/pokemon/')).toThrow();
  });
});

describe('cleanFlavorText', () => {
  it('turns form feeds and newlines into single spaces', () => {
    expect(cleanFlavorText('It can\nfly.\fIt is fast.')).toBe('It can fly. It is fast.');
  });

  it('removes soft hyphens and collapses whitespace', () => {
    expect(cleanFlavorText('  pok­emon   text ')).toBe('pokemon text');
  });
});

describe('mapIndexEntry', () => {
  it('maps a dual-type Pokémon', () => {
    const { species, pokemon } = fixtures.bulbasaur;
    expect(mapIndexEntry(species, pokemon)).toEqual({
      id: 1,
      slug: 'bulbasaur',
      name: 'Bulbasaur',
      generation: 1,
      types: ['grass', 'poison'],
      isLegendary: false,
      isMythical: false,
      artworkUrl: expect.stringMatching(/^https:\/\/.+\/official-artwork\/1\.png$/),
    });
  });

  it('flags mythical Pokémon', () => {
    const { species, pokemon } = fixtures.mew;
    expect(mapIndexEntry(species, pokemon)).toMatchObject({ isMythical: true, isLegendary: false });
  });

  it('throws when official artwork is missing', () => {
    const { species, pokemon } = fixtures.bulbasaur;
    const noArt = { ...pokemon, sprites: {} };
    expect(() => mapIndexEntry(species, noArt)).toThrow(/artwork/);
  });

  it('throws on an unknown type', () => {
    const { species, pokemon } = fixtures.bulbasaur;
    const odd = { ...pokemon, types: [{ slot: 1, type: { name: 'cosmic' } }] };
    expect(() => mapIndexEntry(species, odd)).toThrow(/types/);
  });
});

describe('mapDetails', () => {
  it('maps stats, size and abilities including hidden ones', () => {
    const bulbasaur = details('bulbasaur');
    expect(bulbasaur.stats).toEqual({
      hp: 45,
      attack: 49,
      defense: 49,
      'special-attack': 65,
      'special-defense': 65,
      speed: 45,
    });
    expect(bulbasaur.heightDm).toBe(7);
    expect(bulbasaur.weightHg).toBe(69);
    expect(bulbasaur.abilities).toEqual([
      { name: 'overgrow', hidden: false },
      { name: 'chlorophyll', hidden: true },
    ]);
  });

  it('maps habitat, egg groups, colour and shape', () => {
    const bulbasaur = details('bulbasaur');
    expect(bulbasaur.habitat).toBe('grassland');
    expect(bulbasaur.eggGroups).toEqual(['monster', 'plant']);
    expect(bulbasaur.color).toBe('green');
    expect(bulbasaur.shape).toBe('quadruped');
  });

  it('returns a null habitat when the data has none (generation 9)', () => {
    const sprigatito = details('sprigatito');
    expect(sprigatito.generation).toBe(9);
    expect(sprigatito.habitat).toBeNull();
  });

  it('returns cleaned, unique English Pokédex entries', () => {
    const { flavorTexts } = details('eevee');
    expect(flavorTexts.length).toBeGreaterThan(0);
    expect(new Set(flavorTexts.map((t) => t.toLowerCase())).size).toBe(flavorTexts.length);
    for (const text of flavorTexts) expect(text).not.toMatch(/[\f\n\r]|\s{2,}/);
  });

  it('gives null evolution info when there is no chain data', () => {
    const { species, pokemon } = fixtures.eevee;
    expect(mapDetails(species, pokemon, null).evolution).toBeNull();
  });
});

describe('mapEvolution', () => {
  it('describes the first stage of a three-stage line', () => {
    expect(details('bulbasaur').evolution).toEqual({
      stage: 1,
      totalStages: 3,
      evolvesFrom: null,
      evolvesInto: [{ id: 2, slug: 'ivysaur' }],
    });
  });

  it('describes the middle stage', () => {
    expect(details('ivysaur').evolution).toEqual({
      stage: 2,
      totalStages: 3,
      evolvesFrom: { id: 1, slug: 'bulbasaur' },
      evolvesInto: [{ id: 3, slug: 'venusaur' }],
    });
  });

  it('handles a species that does not evolve', () => {
    expect(details('ditto').evolution).toEqual({
      stage: 1,
      totalStages: 1,
      evolvesFrom: null,
      evolvesInto: [],
    });
  });

  it('handles branching evolutions', () => {
    const eevee = details('eevee').evolution;
    expect(eevee?.stage).toBe(1);
    expect(eevee?.totalStages).toBe(2);
    expect(eevee?.evolvesInto).toHaveLength(8);
    expect(eevee?.evolvesInto.map((e) => e.slug)).toContain('vaporeon');
  });

  it('returns null when the species is not in the chain', () => {
    const { chain } = fixtures.bulbasaur;
    expect(chain).not.toBeNull();
    expect(mapEvolution(chain!, 999)).toBeNull();
  });
});

describe('defaultVarietyUrl', () => {
  it('picks the default form', () => {
    expect(defaultVarietyUrl(fixtures.bulbasaur.species)).toMatch(/\/pokemon\/1\/?$/);
  });
});
