import { describe, expect, it } from 'vitest';
import type { PokemonIndexEntry } from '../domain/pokemon/types.ts';
import { validateIndex } from './indexValidation.ts';

const make = (id: number, over: Partial<PokemonIndexEntry> = {}): PokemonIndexEntry => ({
  id,
  slug: `mon-${id}`,
  name: `Mon${String.fromCharCode(96 + id)}`,
  generation: 1,
  types: ['normal'],
  isLegendary: false,
  isMythical: false,
  artworkUrl: `https://example.com/${id}.png`,
  ...over,
});

describe('validateIndex', () => {
  it('accepts a clean index', () => {
    expect(validateIndex([make(1), make(2), make(3)])).toEqual([]);
  });

  it('rejects an empty index', () => {
    expect(validateIndex([])).toEqual(['Index is empty']);
  });

  it('rejects gaps and out-of-order ids', () => {
    expect(validateIndex([make(1), make(3)]).join()).toMatch(/expected id 2/);
  });

  it('rejects duplicate slugs', () => {
    expect(validateIndex([make(1), make(2, { slug: 'mon-1' })]).join()).toMatch(/duplicate slug/);
  });

  it('rejects names that collide after normalising', () => {
    const problems = validateIndex([make(1, { name: 'Mr. Mime' }), make(2, { name: 'Mr Mime' })]);
    expect(problems.join()).toMatch(/clashes/);
  });

  it.each([
    ['generation 0', { generation: 0 as never }, /generation/],
    ['no types', { types: [] }, /1 or 2 types/],
    ['three types', { types: ['fire', 'water', 'grass'] as never }, /1 or 2 types/],
    ['unknown type', { types: ['cosmic'] as never }, /unknown type/],
    ['repeated type', { types: ['fire', 'fire'] as never }, /repeated type/],
    ['legendary and mythical', { isLegendary: true, isMythical: true }, /both legendary/],
    ['http artwork', { artworkUrl: 'http://example.com/1.png' }, /artwork/],
    ['non-png artwork', { artworkUrl: 'https://example.com/1.gif' }, /artwork/],
    ['blank name', { name: '  ' }, /empty name/],
  ])('rejects %s', (_label, over, pattern) => {
    expect(validateIndex([make(1, over)]).join()).toMatch(pattern);
  });
});
