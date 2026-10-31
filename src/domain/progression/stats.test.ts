import { describe, expect, it } from 'vitest';
import type { GameResult } from '../game/types.ts';
import type { DateKey } from '../../lib/utcDate.ts';
import {
  computeCollectionStats,
  computeDailyStats,
  computePracticeStats,
  distributionBuckets,
} from './stats.ts';
import type { DailyResults } from './streaks.ts';
import type { Discovery } from './types.ts';

const game = (over: Partial<GameResult>): GameResult => ({
  sessionId: 's',
  mode: 'daily',
  pokemonId: 1,
  status: 'won',
  score: 100,
  wrongGuesses: 0,
  revealsUsed: 0,
  completedAt: '2026-11-02T10:00:00.000Z',
  ...over,
});
const daily = (games: Partial<GameResult>[]): DailyResults =>
  Object.fromEntries(
    games.map((g, i) => {
      const key = `2026-11-${String(i + 1).padStart(2, '0')}` as DateKey;
      return [key, game({ ...g, dateKey: key, sessionId: key })];
    }),
  ) as DailyResults;

describe('computeDailyStats', () => {
  it('is all zeros with no games', () => {
    expect(computeDailyStats({})).toEqual({
      played: 0,
      won: 0,
      lost: 0,
      gaveUp: 0,
      winRate: 0,
      averageScore: 0,
      bestScore: 0,
      perfectGames: 0,
      solvedWithWrongGuesses: [0, 0, 0, 0, 0, 0],
      unsolved: 0,
    });
  });

  it('counts outcomes and works out the win rate', () => {
    const stats = computeDailyStats(
      daily([
        { status: 'won', score: 100, wrongGuesses: 0 },
        { status: 'won', score: 70, wrongGuesses: 2 },
        { status: 'lost', score: 0, wrongGuesses: 6 },
        { status: 'gave_up', score: 0, wrongGuesses: 1 },
      ]),
    );
    expect(stats).toMatchObject({
      played: 4,
      won: 2,
      lost: 1,
      gaveUp: 1,
      winRate: 0.5,
      unsolved: 2,
    });
  });

  it('averages every finished game, so losses pull the average down', () => {
    const stats = computeDailyStats(
      daily([
        { score: 100 },
        { score: 55, wrongGuesses: 3 },
        { status: 'lost', score: 0, wrongGuesses: 6 },
      ]),
    );
    expect(stats.averageScore).toBe(52); // (100 + 55 + 0) / 3 = 51.67
    expect(stats.bestScore).toBe(100);
  });

  it('counts perfect games only for wins with the full score', () => {
    const stats = computeDailyStats(
      daily([{ score: 100 }, { score: 100 }, { score: 85, wrongGuesses: 1 }]),
    );
    expect(stats.perfectGames).toBe(2);
  });

  it('builds the guess distribution from wins', () => {
    const stats = computeDailyStats(
      daily([
        { wrongGuesses: 0 },
        { wrongGuesses: 0 },
        { wrongGuesses: 1, score: 85 },
        { wrongGuesses: 5, score: 25 },
        { status: 'lost', wrongGuesses: 6, score: 0 },
      ]),
    );
    expect(stats.solvedWithWrongGuesses).toEqual([2, 1, 0, 0, 0, 1]);
    expect(stats.unsolved).toBe(1);
  });

  it('never reads a broken record past the last slot', () => {
    const stats = computeDailyStats(daily([{ wrongGuesses: 99, score: 0 }]));
    expect(stats.solvedWithWrongGuesses).toEqual([0, 0, 0, 0, 0, 1]);
  });
});

describe('computePracticeStats', () => {
  it('is zero with no games', () => {
    expect(computePracticeStats([])).toEqual({ played: 0, won: 0, winRate: 0, averageScore: 0 });
  });

  it('summarises practice games', () => {
    const stats = computePracticeStats([
      game({ mode: 'practice', score: 100 }),
      game({ mode: 'practice', score: 40, wrongGuesses: 4 }),
      game({ mode: 'practice', status: 'gave_up', score: 0 }),
      game({ mode: 'practice', status: 'lost', score: 0 }),
    ]);
    expect(stats).toEqual({ played: 4, won: 2, winRate: 0.5, averageScore: 35 });
  });
});

describe('computeCollectionStats', () => {
  const discovery = (id: number): Discovery => ({
    pokemonId: id,
    firstDiscoveredAt: 't',
    lastDiscoveredAt: 't',
    timesDiscovered: 1,
    modes: ['daily'],
  });

  it('counts unique Pokémon and the percentage', () => {
    const stats = computeCollectionStats(
      { 1: discovery(1), 25: discovery(25), 150: discovery(150) },
      1025,
    );
    expect(stats).toEqual({ discovered: 3, total: 1025, percent: 0.3 });
  });

  it('handles none and all', () => {
    expect(computeCollectionStats({}, 1025)).toEqual({ discovered: 0, total: 1025, percent: 0 });
    const all = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, discovery(i + 1)]));
    expect(computeCollectionStats(all, 10).percent).toBe(100);
  });

  it('copes with an empty catalogue', () => {
    expect(computeCollectionStats({}, 0).percent).toBe(0);
  });
});

describe('distributionBuckets', () => {
  it('has a bar for each number of wrong guesses plus one for unsolved games', () => {
    const stats = computeDailyStats(
      daily([
        { wrongGuesses: 0 },
        { wrongGuesses: 2, score: 70 },
        { status: 'gave_up', score: 0, wrongGuesses: 1 },
      ]),
    );
    const buckets = distributionBuckets(stats);
    expect(buckets.map((b) => b.label)).toEqual(['0', '1', '2', '3', '4', '5', '✕']);
    expect(buckets.map((b) => b.count)).toEqual([1, 0, 1, 0, 0, 0, 1]);
    expect(buckets.at(-1)).toMatchObject({
      unsolved: true,
      detail: 'Not solved (lost or gave up)',
    });
    expect(buckets[0]!.detail).toBe('Solved on the first guess');
    expect(buckets[1]!.detail).toBe('Solved after 1 wrong guess');
    expect(buckets[2]!.detail).toBe('Solved after 2 wrong guesses');
  });
});
