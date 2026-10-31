import { describe, expect, it } from 'vitest';
import { createRng } from '../../lib/prng.ts';
import type { GameResult } from '../game/types.ts';
import { pickPracticePokemonId, RECENT_PRACTICE_MEMORY, recentPracticeIds } from './select.ts';

const ids = Array.from({ length: 50 }, (_, i) => i + 1);
const result = (pokemonId: number): GameResult => ({
  sessionId: `s${pokemonId}`,
  mode: 'practice',
  pokemonId,
  status: 'won',
  score: 100,
  wrongGuesses: 0,
  revealsUsed: 0,
  completedAt: 't',
});

describe('pickPracticePokemonId', () => {
  it('always returns one of the given Pokémon', () => {
    const rng = createRng('a');
    for (let i = 0; i < 200; i++) expect(ids).toContain(pickPracticePokemonId(rng, ids));
  });

  it('never picks an excluded Pokémon (today’s daily answer)', () => {
    const rng = createRng('b');
    for (let i = 0; i < 500; i++) expect(pickPracticePokemonId(rng, ids, [], [7])).not.toBe(7);
  });

  it('avoids recent Pokémon while others remain', () => {
    const rng = createRng('c');
    const recent = ids.slice(0, 45);
    for (let i = 0; i < 200; i++)
      expect(recent).not.toContain(pickPracticePokemonId(rng, ids, recent));
  });

  it('falls back to recent ones when nothing else is left', () => {
    const rng = createRng('d');
    expect([1, 2]).toContain(pickPracticePokemonId(rng, [1, 2], [1, 2]));
  });

  it('still excludes the daily answer even when it is the only fresh choice', () => {
    const rng = createRng('e');
    for (let i = 0; i < 50; i++) expect(pickPracticePokemonId(rng, [1, 2], [2], [1])).toBe(2);
  });

  it('is varied', () => {
    const rng = createRng('f');
    const seen = new Set(Array.from({ length: 200 }, () => pickPracticePokemonId(rng, ids)));
    expect(seen.size).toBeGreaterThan(30);
  });

  it('repeats exactly for the same seed', () => {
    const run = () => {
      const rng = createRng('same');
      return Array.from({ length: 10 }, () => pickPracticePokemonId(rng, ids));
    };
    expect(run()).toEqual(run());
  });

  it('throws when nothing is eligible', () => {
    expect(() => pickPracticePokemonId(createRng('x'), [1], [], [1])).toThrow(RangeError);
    expect(() => pickPracticePokemonId(createRng('x'), [])).toThrow(RangeError);
  });
});

describe('recentPracticeIds', () => {
  it('returns the latest Pokémon, oldest first', () => {
    expect(recentPracticeIds([result(5), result(6), result(7)])).toEqual([5, 6, 7]);
  });

  it('keeps only the most recent ones', () => {
    const many = Array.from({ length: RECENT_PRACTICE_MEMORY + 5 }, (_, i) => result(i + 1));
    const recent = recentPracticeIds(many);
    expect(recent).toHaveLength(RECENT_PRACTICE_MEMORY);
    expect(recent[0]).toBe(6);
    expect(recent.at(-1)).toBe(RECENT_PRACTICE_MEMORY + 5);
  });

  it('is empty without history', () => {
    expect(recentPracticeIds([])).toEqual([]);
  });
});
