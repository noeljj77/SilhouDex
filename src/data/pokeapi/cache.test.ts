import { describe, expect, it } from 'vitest';
import { fixtures } from '../../test/fixtures/pokeapi/index.ts';
import { createDetailsCache, DETAILS_CACHE_VERSION } from './cache.ts';
import { mapDetails } from './mappers.ts';

const { species, pokemon, chain } = fixtures.bulbasaur;
const bulbasaur = mapDetails(species, pokemon, chain);

/** A Storage that fails on every call, like blocked or full browser storage. */
const brokenStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new DOMException('full', 'QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
  key: () => null,
  length: 0,
  clear: () => {},
} as Storage;

describe('createDetailsCache', () => {
  it('round-trips details', () => {
    const cache = createDetailsCache();
    expect(cache.get(1)).toBeNull();
    cache.set(1, bulbasaur);
    expect(cache.get(1)).toEqual(bulbasaur);
  });

  it('stores records under the cache prefix, apart from player progress', () => {
    createDetailsCache().set(1, bulbasaur);
    expect(localStorage.getItem('silhoudex:cache:pokemon:1')).not.toBeNull();
    expect(localStorage.getItem('silhoudex:v1:progress')).toBeNull();
  });

  it('ignores records from another cache version', () => {
    localStorage.setItem(
      'silhoudex:cache:pokemon:1',
      JSON.stringify({ v: DETAILS_CACHE_VERSION + 1, fetchedAt: 'x', data: bulbasaur }),
    );
    expect(createDetailsCache().get(1)).toBeNull();
  });

  it('ignores a record stored under the wrong id', () => {
    localStorage.setItem(
      'silhoudex:cache:pokemon:2',
      JSON.stringify({ v: DETAILS_CACHE_VERSION, fetchedAt: 'x', data: bulbasaur }),
    );
    expect(createDetailsCache().get(2)).toBeNull();
  });

  it('treats corrupt JSON as a miss', () => {
    localStorage.setItem('silhoudex:cache:pokemon:1', '{not json');
    expect(createDetailsCache().get(1)).toBeNull();
  });

  it('never throws when storage is blocked or full', () => {
    const cache = createDetailsCache(brokenStorage);
    expect(() => cache.set(1, bulbasaur)).not.toThrow();
    expect(cache.get(1)).toBeNull();
    expect(() => cache.clear()).not.toThrow();
  });

  it('clear removes only cache records', () => {
    localStorage.setItem('silhoudex:v1:progress', '{"keep":true}');
    const cache = createDetailsCache();
    cache.set(1, bulbasaur);
    cache.clear();
    expect(cache.get(1)).toBeNull();
    expect(localStorage.getItem('silhoudex:v1:progress')).toBe('{"keep":true}');
  });
});
