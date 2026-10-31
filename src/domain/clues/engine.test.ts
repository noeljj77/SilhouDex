import { describe, expect, it } from 'vitest';
import { mapDetails } from '../../data/pokeapi/mappers.ts';
import { pokedexIndex } from '../../data/pokedexIndex.ts';
import { normalizeName } from '../../lib/normalize.ts';
import { fixtures } from '../../test/fixtures/pokeapi/index.ts';
import type { EvolutionRef, PokemonDetails } from '../pokemon/types.ts';
import { DIFFICULTY_PROFILES, fallbackOrder, type DifficultyLevel } from './difficulty.ts';
import { generateClues } from './engine.ts';
import { CLUE_PROVIDERS } from './providers.ts';
import { isClueSafe, maskName, NAME_MASK } from './safety.ts';

const details = (name: keyof typeof fixtures): PokemonDetails => {
  const { species, pokemon, chain } = fixtures[name];
  return mapDetails(species, pokemon, chain);
};

const displayName = (ref: EvolutionRef) => pokedexIndex.getById(ref.id)?.name ?? ref.slug;
const gen = (p: PokemonDetails, seed = 'daily:#1', difficulty?: DifficultyLevel) =>
  generateClues(p, { seed, difficulty, displayName });

const ALL = Object.keys(fixtures) as (keyof typeof fixtures)[];
const LEVELS: DifficultyLevel[] = ['easy', 'normal', 'hard'];

describe('generateClues: rules that must hold for every Pokémon', () => {
  for (const name of ALL) {
    for (const level of LEVELS) {
      it(`${name} / ${level}: five unique, safe clues across 40 seeds`, () => {
        const p = details(name);
        const key = normalizeName(p.name);
        for (let s = 0; s < 40; s++) {
          const clues = gen(p, `seed-${s}`, level);
          expect(clues).toHaveLength(5);
          expect(new Set(clues.map((c) => c.category)).size).toBe(5); // no repeated fact
          expect(new Set(clues.map((c) => c.body)).size).toBe(5); // no duplicate text
          for (const c of clues) {
            expect(c.title).not.toBe('');
            expect(c.body).not.toBe('');
            expect(normalizeName(`${c.title} ${c.body}`)).not.toContain(key);
            expect(isClueSafe(c, p)).toBe(true);
          }
        }
      });
    }
  }
});

describe('generateClues: determinism and variety', () => {
  it('returns identical clues for the same seed', () => {
    const p = details('bulbasaur');
    expect(gen(p, 'daily:#7')).toEqual(gen(p, 'daily:#7'));
  });

  it('varies with the seed', () => {
    const p = details('bulbasaur');
    const variants = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(gen(p, `s${i}`))));
    expect(variants.size).toBeGreaterThan(5);
  });
});

describe('generateClues: difficulty', () => {
  it('follows the profile when every strength is available', () => {
    const p = details('bulbasaur');
    for (const level of LEVELS) {
      expect(gen(p, 'x', level).map((c) => c.difficulty)).toEqual([...DIFFICULTY_PROFILES[level]]);
    }
  });

  it('defaults to normal', () => {
    const p = details('bulbasaur');
    expect(gen(p).map((c) => c.difficulty)).toEqual([3, 3, 2, 2, 1]);
  });

  it('easy is stronger than hard', () => {
    const sum = (level: DifficultyLevel) => DIFFICULTY_PROFILES[level].reduce((a, b) => a + b, 0);
    expect(sum('easy')).toBeLessThan(sum('normal'));
    expect(sum('normal')).toBeLessThan(sum('hard'));
  });

  it('falls back to the closest strength, vaguer first on a tie', () => {
    expect(fallbackOrder(1)).toEqual([1, 2, 3]);
    expect(fallbackOrder(2)).toEqual([2, 3, 1]);
    expect(fallbackOrder(3)).toEqual([3, 2, 1]);
  });

  it('falls back when a strength has no usable clue', () => {
    const p = details('bulbasaur');
    const onlyVague = CLUE_PROVIDERS.filter((c) => c.difficulty === 3 || c.difficulty === 2);
    const clues = generateClues(p, { seed: 'fb', displayName, providers: onlyVague });
    expect(clues).toHaveLength(5);
    expect(clues.every((c) => c.difficulty !== 1)).toBe(true);
  });

  it('throws rather than show fewer than five clues', () => {
    const p = details('bulbasaur');
    const few = CLUE_PROVIDERS.slice(0, 3);
    expect(() => generateClues(p, { seed: 'few', displayName, providers: few })).toThrow(
      /usable clues/,
    );
  });
});

describe('generateClues: awkward Pokémon', () => {
  const all = (name: keyof typeof fixtures) =>
    Array.from({ length: 60 }, (_, i) => gen(details(name), `s${i}`)).flat();

  it('handles dual types', () => {
    const typing = all('bulbasaur').filter((c) => c.id === 'typeFull');
    expect(typing.length).toBeGreaterThan(0);
    expect(typing[0]?.body).toBe('Type: Grass / Poison.');
    const one = all('bulbasaur').filter((c) => c.id === 'typePrimary');
    for (const c of one) expect(c.body).toMatch(/One of its types is (Grass|Poison)\./);
  });

  it('handles a single type', () => {
    const typing = all('mew').filter((c) => c.id === 'typeFull');
    expect(typing.length).toBeGreaterThan(0);
    expect(typing[0]?.body).toBe('Type: Psychic.');
    expect(all('mew').filter((c) => c.id === 'typePrimary')[0]?.body).toBe('Its type is Psychic.');
  });

  it('never shows a habitat clue when habitat data is missing (Gen 9)', () => {
    expect(details('sprigatito').habitat).toBeNull();
    expect(all('sprigatito').some((c) => c.id === 'habitat')).toBe(false);
  });

  it('uses habitat when it exists', () => {
    expect(all('bulbasaur').some((c) => c.id === 'habitat')).toBe(true);
  });

  it('never shows evolution relatives for a Pokémon that does not evolve', () => {
    const ditto = all('ditto');
    expect(ditto.some((c) => c.id === 'evolutionRelatives')).toBe(false);
    expect(ditto.some((c) => c.id === 'evolutionPosition')).toBe(false);
    expect(ditto.find((c) => c.id === 'evolutionLine')?.body).toBe('It does not evolve.');
  });

  it('skips every evolution clue when there is no chain data', () => {
    const { species, pokemon } = fixtures.eevee;
    const noChain = mapDetails(species, pokemon, null);
    const clues = Array.from({ length: 40 }, (_, i) => gen(noChain, `n${i}`)).flat();
    expect(clues.some((c) => c.category === 'evolution')).toBe(false);
  });

  it('summarises branching evolutions without listing them', () => {
    const relatives = all('eevee').find((c) => c.id === 'evolutionRelatives');
    expect(relatives?.body).toBe('It can evolve into 8 different Pokémon.');
  });

  it('names a single evolution', () => {
    const relatives = all('bulbasaur').find((c) => c.id === 'evolutionRelatives');
    expect(relatives?.body).toBe('It evolves into Ivysaur.');
    const ivysaur = all('ivysaur').find((c) => c.id === 'evolutionRelatives');
    expect(ivysaur?.body).toBe('It evolves from Bulbasaur. It evolves into Venusaur.');
  });

  it('shows the rarity of legendary and mythical Pokémon', () => {
    expect(all('mew').some((c) => c.id === 'rarityLegendary')).toBe(true);
    expect(all('mew').find((c) => c.id === 'rarityLegendary')?.body).toBe(
      'It is a mythical Pokémon.',
    );
    expect(all('mew').some((c) => c.id === 'rarityOrdinary')).toBe(false);
    expect(all('bulbasaur').some((c) => c.id === 'rarityLegendary')).toBe(false);
  });

  it('only quotes real Pokédex entries', () => {
    const p = details('eevee');
    const entries = all('eevee').filter((c) => c.id === 'pokedexEntry');
    expect(entries.length).toBeGreaterThan(0);
    for (const c of entries) {
      const original = p.flavorTexts.find((t) => maskName(t, p) === c.body);
      expect(original).toBeDefined();
    }
  });

  it('skips the "highest stat" clue when many stats tie (Mew is 100 across the board)', () => {
    expect(all('mew').some((c) => c.id === 'topStat')).toBe(false);
    expect(all('bulbasaur').find((c) => c.id === 'topStat')?.body).toBe(
      'Its highest base stat is Special Attack and Special Defense (65).',
    );
  });

  it('reports real measurements', () => {
    const size = all('bulbasaur').find((c) => c.id === 'sizeExact');
    expect(size?.body).toBe('Height 0.7 m, weight 6.9 kg.');
    const spread = all('bulbasaur').find((c) => c.id === 'statSpread');
    expect(spread?.body).toBe(
      'HP 45, Attack 49, Defense 49, Special Attack 65, Special Defense 65, Speed 45.',
    );
  });
});

describe('name safety', () => {
  const bulbasaur = details('bulbasaur');

  it('masks the name inside Pokédex text, in any case', () => {
    expect(maskName('BULBASAUR can be seen napping. Bulbasaur likes sun.', bulbasaur)).toBe(
      `${NAME_MASK} can be seen napping. ${NAME_MASK} likes sun.`,
    );
  });

  it('masks accented names however they are spelled', () => {
    const { species, pokemon } = fixtures.bulbasaur;
    const flabebe = mapDetails(
      {
        ...species,
        id: 669,
        name: 'flabebe',
        names: [{ name: 'Flabébé', language: { name: 'en' } }],
      },
      pokemon,
      null,
    );
    expect(maskName('Flabébé and flabebe and FLABEBE', flabebe)).toBe(
      `${NAME_MASK} and ${NAME_MASK} and ${NAME_MASK}`,
    );
  });

  it('flags text that contains the name, ignoring spacing and punctuation', () => {
    expect(isClueSafe({ title: 't', body: 'Bulbasaur is cute' }, bulbasaur)).toBe(false);
    expect(isClueSafe({ title: 't', body: 'b-u-l-b-a-s-a-u-r' }, bulbasaur)).toBe(false);
    expect(isClueSafe({ title: 't', body: 'A seed Pokémon' }, bulbasaur)).toBe(true);
  });

  it('drops a clue that would reveal the name and picks another', () => {
    const leaky = {
      id: 'leak',
      category: 'generation' as const,
      difficulty: 3 as const,
      applies: () => true,
      build: (p: PokemonDetails) => ({ title: 'Oops', body: `It is ${p.name}.` }),
    };
    const clues = generateClues(bulbasaur, {
      seed: 'leak',
      displayName,
      providers: [leaky, ...CLUE_PROVIDERS],
    });
    expect(clues.some((c) => c.id === 'leak')).toBe(false);
    expect(clues).toHaveLength(5);
  });

  it('every real Pokédex entry is safe once masked', () => {
    for (const name of ALL) {
      const p = details(name);
      for (const text of p.flavorTexts) {
        expect(isClueSafe({ title: '', body: maskName(text, p) }, p)).toBe(true);
      }
    }
  });
});
