import { describe, expect, it } from 'vitest';
import type { DateKey } from '../../lib/utcDate.ts';
import {
  DAILY_POOL_V1_SIZE,
  getChallengeNumber,
  getDailyChallenge,
  getDailyPool,
  getPokemonIdForChallenge,
} from './schedule.ts';

const LAUNCH = '2026-11-01' as DateKey;

describe('daily pool v1 (frozen)', () => {
  it('is pinned: changing this reshuffles every future daily answer', () => {
    const pool = getDailyPool();
    expect(pool.slice(0, 10)).toEqual([595, 537, 232, 680, 752, 513, 516, 917, 33, 804]);
    expect(pool.slice(-3)).toEqual([202, 354, 947]);
  });

  it('contains every species 1..1025 exactly once', () => {
    const pool = getDailyPool();
    expect(pool).toHaveLength(DAILY_POOL_V1_SIZE);
    expect(new Set(pool).size).toBe(DAILY_POOL_V1_SIZE);
    expect(Math.min(...pool)).toBe(1);
    expect(Math.max(...pool)).toBe(1025);
  });
});

describe('getChallengeNumber', () => {
  it('is 1 on launch day and counts up daily', () => {
    expect(getChallengeNumber(LAUNCH, LAUNCH)).toBe(1);
    expect(getChallengeNumber('2026-11-02' as DateKey, LAUNCH)).toBe(2);
    expect(getChallengeNumber('2027-11-01' as DateKey, LAUNCH)).toBe(366);
  });

  it('throws before launch', () => {
    expect(() => getChallengeNumber('2026-10-31' as DateKey, LAUNCH)).toThrow(RangeError);
  });
});

describe('getPokemonIdForChallenge', () => {
  it('follows the pool order', () => {
    expect(getPokemonIdForChallenge(1)).toBe(595);
    expect(getPokemonIdForChallenge(2)).toBe(537);
  });

  it('never repeats within one full cycle', () => {
    const seen = new Set<number>();
    for (let n = 1; n <= DAILY_POOL_V1_SIZE; n++) seen.add(getPokemonIdForChallenge(n));
    expect(seen.size).toBe(DAILY_POOL_V1_SIZE);
  });

  it('starts a new cycle in the same order', () => {
    expect(getPokemonIdForChallenge(DAILY_POOL_V1_SIZE + 1)).toBe(getPokemonIdForChallenge(1));
  });

  it('rejects invalid numbers', () => {
    expect(() => getPokemonIdForChallenge(0)).toThrow(RangeError);
    expect(() => getPokemonIdForChallenge(-3)).toThrow(RangeError);
    expect(() => getPokemonIdForChallenge(1.5)).toThrow(RangeError);
  });
});

describe('getDailyChallenge', () => {
  it('gives every player the same challenge for the same UTC date', () => {
    const morning = getDailyChallenge(new Date('2026-11-03T00:00:01Z'), LAUNCH);
    const night = getDailyChallenge(new Date('2026-11-03T23:59:59Z'), LAUNCH);
    expect(morning.pokemonId).toBe(night.pokemonId);
    expect(morning.challengeNumber).toBe(3);
    expect(morning.dateKey).toBe('2026-11-03');
    expect(morning.seed).toBe('daily:#3');
  });

  it('changes at UTC midnight, whatever the local time zone', () => {
    const before = getDailyChallenge(new Date('2026-11-03T23:59:59.999Z'), LAUNCH);
    const after = getDailyChallenge(new Date('2026-11-04T00:00:00.000Z'), LAUNCH);
    expect(after.challengeNumber).toBe(before.challengeNumber + 1);
    expect(after.pokemonId).not.toBe(before.pokemonId);
  });

  it('reports the time left until the next challenge', () => {
    const c = getDailyChallenge(new Date('2026-11-03T23:00:00Z'), LAUNCH);
    expect(c.msUntilNext).toBe(3_600_000);
  });
});
