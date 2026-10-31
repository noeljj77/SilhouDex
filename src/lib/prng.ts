/** Deterministic random numbers from a string seed. Same seed → same sequence, on every device. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  /** Returns a shuffled copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
}

/** FNV-1a 32-bit hash. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 generator seeded from a string. */
export function createRng(seed: string): Rng {
  let state = hashSeed(seed);
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (maxExclusive: number) => {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1) {
      throw new RangeError(`int() needs a positive integer, got ${maxExclusive}`);
    }
    return Math.floor(next() * maxExclusive);
  };
  return {
    next,
    int,
    pick(items) {
      if (items.length === 0) throw new RangeError('Cannot pick from an empty list');
      return items[int(items.length)] as (typeof items)[number];
    },
    shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [copy[i], copy[j]] = [copy[j] as (typeof copy)[number], copy[i] as (typeof copy)[number]];
      }
      return copy;
    },
  };
}
