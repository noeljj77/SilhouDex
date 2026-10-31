import { describe, expect, it } from 'vitest';
import { normalizeName } from './normalize.ts';

describe('normalizeName', () => {
  it.each([
    ['Flabébé', 'flabebe'],
    ['Farfetch’d', 'farfetchd'],
    ["Farfetch'd", 'farfetchd'],
    ['Mr. Mime', 'mrmime'],
    ['mr-mime', 'mrmime'],
    ['Type: Null', 'typenull'],
    ['Nidoran♀', 'nidoranf'],
    ['Nidoran♂', 'nidoranm'],
    ['  PIKACHU  ', 'pikachu'],
    ['Porygon-Z', 'porygonz'],
  ])('normalises %s → %s', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });

  it('lets typed variants match the same Pokémon', () => {
    expect(normalizeName('nidoran f')).toBe(normalizeName('nidoran-f'));
    expect(normalizeName('flabebe')).toBe(normalizeName('Flabébé'));
  });
});
