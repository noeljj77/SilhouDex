import { describe, expect, it } from 'vitest';
import type { GameResult, GameSession } from '../game/types.ts';
import type { DateKey } from '../../lib/utcDate.ts';
import { mergeProgress } from './merge.ts';
import { PRACTICE_RESULTS_CAP, createEmptyProgress } from './record.ts';
import type { ProgressData } from './types.ts';

const T1 = '2026-11-02T10:00:00.000Z';
const T2 = '2026-11-03T10:00:00.000Z';
const empty = (createdAt = T1, id = 'p') => createEmptyProgress(createdAt, id);

const daily = (date: string, over: Partial<GameResult> = {}): GameResult => ({
  sessionId: `d-${date}`,
  mode: 'daily',
  pokemonId: 25,
  status: 'won',
  score: 85,
  wrongGuesses: 1,
  revealsUsed: 1,
  completedAt: T1,
  dateKey: date as DateKey,
  challengeNumber: 2,
  ...over,
});
const practice = (id: string, completedAt = T1): GameResult => ({
  sessionId: id,
  mode: 'practice',
  pokemonId: 4,
  status: 'won',
  score: 100,
  wrongGuesses: 0,
  revealsUsed: 0,
  completedAt,
});
const active = (over: Partial<GameSession> = {}): GameSession => ({
  id: 's1',
  mode: 'daily',
  pokemonId: 25,
  dateKey: '2026-11-04' as DateKey,
  guesses: [],
  status: 'playing',
  startedAt: T1,
  ...over,
});

const withDaily = (data: ProgressData, ...results: GameResult[]): ProgressData => ({
  ...data,
  daily: {
    ...data.daily,
    results: Object.fromEntries(
      results.map((r) => [r.dateKey, r]),
    ) as ProgressData['daily']['results'],
  },
});

describe('mergeProgress', () => {
  it('joins daily results from both sides', () => {
    const local = withDaily(empty(), daily('2026-11-02'));
    const remote = withDaily(empty(), daily('2026-11-03'));
    expect(Object.keys(mergeProgress(local, remote).daily.results).sort()).toEqual([
      '2026-11-02',
      '2026-11-03',
    ]);
  });

  it('keeps the result that was finished first when both sides played the same day', () => {
    const first = daily('2026-11-02', { score: 100, completedAt: T1 });
    const second = daily('2026-11-02', { score: 40, completedAt: T2 });
    expect(
      mergeProgress(withDaily(empty(), second), withDaily(empty(), first)).daily.results[
        '2026-11-02' as DateKey
      ],
    ).toEqual(first);
    expect(
      mergeProgress(withDaily(empty(), first), withDaily(empty(), second)).daily.results[
        '2026-11-02' as DateKey
      ],
    ).toEqual(first);
  });

  it('joins practice games by id and keeps them in order', () => {
    const local = { ...empty(), practice: { results: [practice('a', T2), practice('b', T2)] } };
    const remote = { ...empty(), practice: { results: [practice('a', T2), practice('c', T1)] } };
    expect(mergeProgress(local, remote).practice.results.map((r) => r.sessionId)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('keeps only the newest practice games past the cap', () => {
    const many = Array.from({ length: PRACTICE_RESULTS_CAP }, (_, i) =>
      practice(`r${i}`, new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString()),
    );
    const local = { ...empty(), practice: { results: many } };
    const remote = {
      ...empty(),
      practice: { results: [practice('old', '2026-01-01T00:00:00.000Z')] },
    };
    const merged = mergeProgress(local, remote).practice.results;
    expect(merged).toHaveLength(PRACTICE_RESULTS_CAP);
    expect(merged.some((r) => r.sessionId === 'old')).toBe(false);
  });

  it('merges a discovery found on both sides without double counting', () => {
    const base = {
      pokemonId: 25,
      firstDiscoveredAt: T2,
      lastDiscoveredAt: T2,
      timesDiscovered: 2,
      modes: ['daily' as const],
    };
    const local = { ...empty(), discoveries: { 25: base } };
    const remote = {
      ...empty(),
      discoveries: {
        25: { ...base, firstDiscoveredAt: T1, timesDiscovered: 3, modes: ['practice' as const] },
        1: { ...base, pokemonId: 1 },
      },
    };
    const merged = mergeProgress(local, remote).discoveries;
    expect(merged[25]).toEqual({
      pokemonId: 25,
      firstDiscoveredAt: T1,
      lastDiscoveredAt: T2,
      timesDiscovered: 3,
      modes: ['daily', 'practice'],
    });
    expect(merged[1]).toBeDefined();
  });

  it('keeps the earliest unlock date and any "seen" flag for achievements', () => {
    const local = {
      ...empty(),
      achievements: { a: { unlockedAt: T2, seen: true }, b: { seen: false } },
    };
    const remote = {
      ...empty(),
      achievements: { a: { unlockedAt: T1, seen: false }, b: { unlockedAt: T1, seen: false } },
    };
    const merged = mergeProgress(local, remote).achievements;
    expect(merged.a).toEqual({ unlockedAt: T1, seen: true });
    expect(merged.b).toEqual({ unlockedAt: T1, seen: false });
  });

  it('keeps the earliest player and this device settings', () => {
    const local = { ...empty(T2, 'new'), settings: { difficulty: 'hard' as const } };
    const remote = { ...empty(T1, 'old'), settings: { difficulty: 'easy' as const } };
    const merged = mergeProgress(local, remote);
    expect(merged.player).toEqual({ id: 'old', createdAt: T1 });
    expect(merged.settings.difficulty).toBe('hard');
  });

  it('drops an unfinished daily game once that day has a result', () => {
    const local = { ...empty(), daily: { results: {}, active: active() } };
    const remote = withDaily(empty(), daily('2026-11-04'));
    expect(mergeProgress(local, remote).daily.active).toBeUndefined();
    expect(mergeProgress(local, empty()).daily.active).toEqual(active());
  });

  it('is the same when applied twice', () => {
    const local = withDaily(empty(), daily('2026-11-02'));
    const remote = {
      ...withDaily(empty(), daily('2026-11-03')),
      practice: { results: [practice('a')] },
    };
    const once = mergeProgress(local, remote);
    expect(mergeProgress(once, remote)).toEqual(once);
  });
});
