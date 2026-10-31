import { describe, expect, it } from 'vitest';
import type { GameResult } from '../game/types.ts';
import { addDays, type DateKey } from '../../lib/utcDate.ts';
import { computeStreaks, countedDates, countsForStreak, type DailyResults } from './streaks.ts';

const D = (s: string) => s as DateKey;
const TODAY = D('2026-11-10');

/** A finished daily result for `key`, completed at midday UTC on that date by default. */
const result = (key: DateKey, over: Partial<GameResult> = {}): GameResult => ({
  sessionId: `daily-${key}`,
  mode: 'daily',
  pokemonId: 25,
  status: 'won',
  score: 100,
  wrongGuesses: 0,
  revealsUsed: 0,
  completedAt: `${key}T12:00:00.000Z`,
  dateKey: key,
  challengeNumber: 1,
  ...over,
});
const resultsFor = (...keys: string[]): DailyResults =>
  Object.fromEntries(keys.map((k) => [k, result(D(k))])) as DailyResults;

describe('computeStreaks: basics', () => {
  it('is empty with no results', () => {
    expect(computeStreaks({}, TODAY)).toEqual({
      current: 0,
      longest: 0,
      totalCompleted: 0,
      completedToday: false,
      atRisk: false,
      lastCompleted: null,
    });
  });

  it('counts a first game today as a one-day streak', () => {
    expect(computeStreaks(resultsFor('2026-11-10'), TODAY)).toMatchObject({
      current: 1,
      longest: 1,
      totalCompleted: 1,
      completedToday: true,
      atRisk: false,
    });
  });

  it('consecutive days extend the streak', () => {
    const r = resultsFor('2026-11-08', '2026-11-09', '2026-11-10');
    expect(computeStreaks(r, TODAY)).toMatchObject({ current: 3, longest: 3, totalCompleted: 3 });
  });

  it('stays alive through today: yesterday done, today still to play', () => {
    const r = resultsFor('2026-11-08', '2026-11-09');
    expect(computeStreaks(r, TODAY)).toMatchObject({
      current: 2,
      completedToday: false,
      atRisk: true,
      lastCompleted: '2026-11-09',
    });
  });

  it('breaks after a whole missed day', () => {
    const r = resultsFor('2026-11-07', '2026-11-08'); // nothing on the 9th, today is the 10th
    expect(computeStreaks(r, TODAY)).toMatchObject({ current: 0, longest: 2, atRisk: false });
  });
});

describe('computeStreaks: gaps and records', () => {
  it('a gap resets the current streak but keeps the longest', () => {
    const r = resultsFor(
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
    );
    expect(computeStreaks(r, TODAY)).toMatchObject({ current: 3, longest: 4, totalCompleted: 7 });
  });

  it('handles several separate runs', () => {
    const r = resultsFor('2026-10-01', '2026-10-02', '2026-10-10', '2026-10-11', '2026-10-12');
    expect(computeStreaks(r, TODAY).longest).toBe(3);
  });

  it('crosses month and year boundaries', () => {
    const r = resultsFor('2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02');
    expect(computeStreaks(r, D('2027-01-02'))).toMatchObject({ current: 4, longest: 4 });
  });

  it('crosses a leap day', () => {
    const r = resultsFor('2028-02-28', '2028-02-29', '2028-03-01');
    expect(computeStreaks(r, D('2028-03-01'))).toMatchObject({ current: 3 });
  });

  it('is unaffected by the order results were saved in', () => {
    const forwards = computeStreaks(resultsFor('2026-11-08', '2026-11-09', '2026-11-10'), TODAY);
    const backwards = computeStreaks(resultsFor('2026-11-10', '2026-11-09', '2026-11-08'), TODAY);
    expect(backwards).toEqual(forwards);
  });
});

describe('computeStreaks: what counts', () => {
  it.each(['won', 'lost', 'gave_up'] as const)('a %s keeps the streak going', (status) => {
    const r: DailyResults = {
      [D('2026-11-09')]: result(D('2026-11-09'), { status }),
      [D('2026-11-10')]: result(D('2026-11-10'), { status, score: 0 }),
    };
    expect(computeStreaks(r, TODAY)).toMatchObject({ current: 2, totalCompleted: 2 });
  });

  it('ignores a result finished on a later date than its challenge (a late replay)', () => {
    // The 9th was played on the 10th: it must not repair the streak.
    const r: DailyResults = {
      [D('2026-11-08')]: result(D('2026-11-08')),
      [D('2026-11-09')]: result(D('2026-11-09'), { completedAt: '2026-11-10T08:00:00.000Z' }),
      [D('2026-11-10')]: result(D('2026-11-10')),
    };
    expect(computeStreaks(r, TODAY)).toMatchObject({ current: 1, longest: 1, totalCompleted: 2 });
  });

  it('uses the UTC date, not the local one', () => {
    // 23:30 UTC on the 10th is already the 11th in Tokyo, but it still counts for the 10th.
    const r: DailyResults = {
      [D('2026-11-10')]: result(D('2026-11-10'), { completedAt: '2026-11-10T23:30:00.000Z' }),
    };
    expect(computeStreaks(r, TODAY).completedToday).toBe(true);
  });

  it('ignores practice results and mismatched keys', () => {
    const r = {
      [D('2026-11-10')]: result(D('2026-11-10'), { mode: 'practice' }),
      [D('2026-11-09')]: result(D('2026-11-08')), // filed under the wrong date
    } as DailyResults;
    expect(computeStreaks(r, TODAY)).toMatchObject({ current: 0, totalCompleted: 0 });
  });

  it('ignores dates in the future and unreadable timestamps', () => {
    const r: DailyResults = {
      [D('2026-11-12')]: result(D('2026-11-12')),
      [D('2026-11-10')]: result(D('2026-11-10'), { completedAt: 'garbage' }),
    };
    expect(computeStreaks(r, TODAY).totalCompleted).toBe(0);
  });

  it('a streak is not extended by skipping one day and catching up', () => {
    const r = resultsFor('2026-11-08', '2026-11-10'); // the 9th was missed
    expect(computeStreaks(r, TODAY)).toMatchObject({ current: 1, longest: 1 });
  });
});

describe('streak moves with the date', () => {
  it('stays at 3 on day 3, becomes at-risk next morning, and resets the day after', () => {
    const r = resultsFor('2026-11-08', '2026-11-09', '2026-11-10');
    expect(computeStreaks(r, D('2026-11-10'))).toMatchObject({ current: 3, atRisk: false });
    expect(computeStreaks(r, D('2026-11-11'))).toMatchObject({ current: 3, atRisk: true });
    expect(computeStreaks(r, D('2026-11-12'))).toMatchObject({
      current: 0,
      atRisk: false,
      longest: 3,
    });
  });

  it('addDays helper agrees with the rules', () => {
    expect(addDays(TODAY, -1)).toBe('2026-11-09');
  });
});

describe('countsForStreak / countedDates', () => {
  it('lists counted dates oldest first', () => {
    expect(countedDates(resultsFor('2026-11-09', '2026-11-03', '2026-11-05'), TODAY)).toEqual([
      '2026-11-03',
      '2026-11-05',
      '2026-11-09',
    ]);
  });

  it('accepts a normal result', () => {
    expect(countsForStreak(D('2026-11-10'), result(D('2026-11-10')), TODAY)).toBe(true);
  });
});
