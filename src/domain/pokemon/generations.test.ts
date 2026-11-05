import { describe, expect, it } from 'vitest';
import {
  ALL_GENERATIONS,
  isGeneration,
  normalizeGenerations,
  romanGeneration,
  sameGenerations,
} from './generations.ts';

describe('generations', () => {
  it('lists generations I to IX', () => {
    expect(ALL_GENERATIONS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(ALL_GENERATIONS.map(romanGeneration)).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
      'VI',
      'VII',
      'VIII',
      'IX',
    ]);
  });

  it('only accepts whole numbers from 1 to 9', () => {
    for (const ok of [1, 5, 9]) expect(isGeneration(ok)).toBe(true);
    for (const bad of [0, 10, -1, 2.5, '3', null, undefined, NaN])
      expect(isGeneration(bad)).toBe(false);
  });

  describe('normalizeGenerations', () => {
    it('sorts, removes repeats and drops anything invalid', () => {
      expect(normalizeGenerations([3, 1, 3, 12, 'x', 2.5, 0])).toEqual([1, 3]);
    });

    it('means every generation when nothing valid is left', () => {
      const everything = [...ALL_GENERATIONS];
      expect(normalizeGenerations([])).toEqual(everything);
      expect(normalizeGenerations([0, 10])).toEqual(everything);
      expect(normalizeGenerations(undefined)).toEqual(everything);
      expect(normalizeGenerations('1,2')).toEqual(everything);
      expect(normalizeGenerations({ 0: 1 })).toEqual(everything);
    });

    it('returns a new list each time, so callers cannot change the shared one', () => {
      const a = normalizeGenerations(undefined);
      a.pop();
      expect(normalizeGenerations(undefined)).toHaveLength(9);
      expect(ALL_GENERATIONS).toHaveLength(9);
    });
  });

  it('compares two choices by content', () => {
    expect(sameGenerations([1, 2], [1, 2])).toBe(true);
    expect(sameGenerations([1, 2], [1, 3])).toBe(false);
    expect(sameGenerations([1], [1, 2])).toBe(false);
  });
});
