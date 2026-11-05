import type { Generation } from './types.ts';

/** Generations I to IX, in order. */
export const ALL_GENERATIONS: readonly Generation[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'] as const;

/** "IV" for generation 4. */
export const romanGeneration = (generation: Generation): string => ROMAN[generation - 1]!;

export const isGeneration = (value: unknown): value is Generation =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 9;

/**
 * Turns whatever was stored or passed in into a valid choice of generations: whole numbers from 1
 * to 9, each once, in order. Nothing valid left means every generation, because a game with no
 * Pokémon to pick from makes no sense.
 */
export function normalizeGenerations(input: unknown): Generation[] {
  const chosen = Array.isArray(input) ? input.filter(isGeneration) : [];
  const unique = ALL_GENERATIONS.filter((g) => chosen.includes(g));
  return unique.length > 0 ? unique : [...ALL_GENERATIONS];
}

export const sameGenerations = (a: readonly Generation[], b: readonly Generation[]): boolean =>
  a.length === b.length && a.every((g, i) => g === b[i]);
