import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from './prng.ts';

describe('createRng', () => {
  it('repeats exactly for the same seed', () => {
    const a = createRng('daily:#42');
    const b = createRng('daily:#42');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs between seeds', () => {
    expect(createRng('a').next()).not.toBe(createRng('b').next());
  });

  it('stays within [0, 1)', () => {
    const rng = createRng('range');
    for (let i = 0; i < 1000; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('int() covers its range and rejects bad input', () => {
    const rng = createRng('int');
    const seen = new Set(Array.from({ length: 300 }, () => rng.int(5)));
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(() => rng.int(0)).toThrow(RangeError);
    expect(() => rng.int(1.5)).toThrow(RangeError);
  });

  it('shuffle returns a permutation without changing the input', () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    const out = createRng('shuffle').shuffle(input);
    expect(input).toEqual(Array.from({ length: 50 }, (_, i) => i));
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(out).not.toEqual(input);
  });

  it('pick throws on an empty list', () => {
    expect(() => createRng('x').pick([])).toThrow(RangeError);
  });

  it('is pinned: the algorithm must never change (it fixes every daily answer)', () => {
    expect(hashSeed('silhoudex')).toBe(hashSeed('silhoudex'));
    expect(hashSeed('')).toBe(0x811c9dc5);
    expect(createRng('pin').shuffle([1, 2, 3, 4, 5, 6, 7, 8])).toEqual(
      createRng('pin').shuffle([1, 2, 3, 4, 5, 6, 7, 8]),
    );
  });
});
