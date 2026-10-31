import { describe, expect, it } from 'vitest';
import type { GameResult } from '../game/types.ts';
import type { DateKey } from '../../lib/utcDate.ts';
import {
  buildMonthCalendar,
  calendarStart,
  compareMonths,
  monthOf,
  shiftMonth,
  summariseMonth,
} from './calendar.ts';
import type { DailyResults } from './streaks.ts';

const D = (s: string) => s as DateKey;
const result = (key: string, over: Partial<GameResult> = {}): GameResult => ({
  sessionId: `daily-${key}`,
  mode: 'daily',
  pokemonId: 25,
  status: 'won',
  score: 85,
  wrongGuesses: 1,
  revealsUsed: 1,
  completedAt: `${key}T12:00:00.000Z`,
  dateKey: D(key),
  challengeNumber: 4,
  ...over,
});
const resultsFor = (entries: [string, Partial<GameResult>?][]): DailyResults =>
  Object.fromEntries(entries.map(([k, o]) => [k, result(k, o)])) as DailyResults;

const build = (year: number, month: number, results: DailyResults, today: string, start: string) =>
  buildMonthCalendar({ year, month, results, today: D(today), startDate: D(start) });
const flat = (c: ReturnType<typeof build>) => c.weeks.flat().filter((d) => d !== null);

describe('buildMonthCalendar: layout', () => {
  it('starts weeks on Monday and pads with empty cells', () => {
    // 1 Nov 2026 is a Sunday: six empty cells before it.
    const c = build(2026, 11, {}, '2026-11-15', '2026-11-01');
    expect(c.weeks[0]!.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(c.weeks[0]![6]).toMatchObject({ day: 1, dateKey: '2026-11-01' });
    expect(c.weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('has the right number of days, including February in a leap year', () => {
    expect(flat(build(2026, 11, {}, '2026-11-15', '2026-11-01'))).toHaveLength(30);
    expect(flat(build(2028, 2, {}, '2028-02-10', '2028-02-01'))).toHaveLength(29);
    expect(flat(build(2027, 2, {}, '2027-02-10', '2027-02-01'))).toHaveLength(28);
  });

  it('starts on the first column when the month begins on a Monday', () => {
    // 1 Jun 2026 is a Monday.
    expect(build(2026, 6, {}, '2026-06-05', '2026-06-01').weeks[0]![0]).toMatchObject({ day: 1 });
  });

  it('numbers days in order', () => {
    expect(flat(build(2026, 11, {}, '2026-11-15', '2026-11-01')).map((d) => d!.day)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
  });
});

describe('buildMonthCalendar: day status', () => {
  const results = resultsFor([
    ['2026-11-02', { status: 'won', score: 100 }],
    ['2026-11-03', { status: 'lost', score: 0 }],
    ['2026-11-04', { status: 'gave_up', score: 0 }],
    // the 5th and 6th are missed
    ['2026-11-07', { status: 'won', score: 55 }],
  ]);
  const days = Object.fromEntries(
    flat(build(2026, 11, results, '2026-11-09', '2026-11-02')).map((d) => [d!.day, d!]),
  );

  it('marks finished games by how they ended, with their score', () => {
    expect(days[2]).toMatchObject({ status: 'won', score: 100, challengeNumber: 4 });
    expect(days[3]).toMatchObject({ status: 'lost', score: 0 });
    expect(days[4]).toMatchObject({ status: 'gave_up', score: 0 });
    expect(days[7]).toMatchObject({ status: 'won', score: 55 });
  });

  it('marks past days with no game as missed', () => {
    expect(days[5]!.status).toBe('missed');
    expect(days[6]!.status).toBe('missed');
    expect(days[8]!.status).toBe('missed');
  });

  it('marks today as pending and later days as future', () => {
    expect(days[9]!.status).toBe('today');
    expect(days[10]!.status).toBe('future');
    expect(days[30]!.status).toBe('future');
  });

  it('does not call days before you started "missed"', () => {
    expect(days[1]!.status).toBe('before-start');
  });

  it('shows today as done once it has a result', () => {
    const done = resultsFor([['2026-11-09', { status: 'won' }]]);
    const day = flat(build(2026, 11, done, '2026-11-09', '2026-11-02')).find((d) => d!.day === 9);
    expect(day).toMatchObject({ status: 'won' });
  });

  it('a late replay shows as missed (it never counted)', () => {
    const late = resultsFor([['2026-11-05', { completedAt: '2026-11-08T09:00:00.000Z' }]]);
    const day = flat(build(2026, 11, late, '2026-11-09', '2026-11-02')).find((d) => d!.day === 5);
    expect(day!.status).toBe('missed');
  });

  it('shows a whole past month: every unplayed day missed, none pending', () => {
    const c = build(2026, 11, {}, '2026-12-20', '2026-11-01');
    expect(summariseMonth(c)).toMatchObject({ missed: 30, today: 0, future: 0 });
  });

  it('shows a future month as entirely future', () => {
    const c = build(2027, 1, {}, '2026-12-20', '2026-11-01');
    expect(summariseMonth(c)).toMatchObject({ future: 31, missed: 0 });
  });
});

describe('summariseMonth', () => {
  it('counts each status', () => {
    const results = resultsFor([
      ['2026-11-02', { status: 'won' }],
      ['2026-11-03', { status: 'lost' }],
    ]);
    expect(summariseMonth(build(2026, 11, results, '2026-11-05', '2026-11-02'))).toEqual({
      won: 1,
      lost: 1,
      gave_up: 0,
      missed: 1, // the 4th
      today: 1,
      future: 25,
      'before-start': 1,
    });
  });
});

describe('calendarStart', () => {
  const launch = D('2026-11-01');

  it('is launch day for someone who joined before launch', () => {
    expect(calendarStart(launch, '2026-10-01T00:00:00.000Z', {})).toBe('2026-11-01');
  });

  it('is the day a player first arrived, if later than launch', () => {
    expect(calendarStart(launch, '2026-11-20T08:00:00.000Z', {})).toBe('2026-11-20');
  });

  it('reaches back to the earliest result', () => {
    expect(calendarStart(launch, '2026-11-20T08:00:00.000Z', resultsFor([['2026-11-12']]))).toBe(
      '2026-11-12',
    );
  });

  it('falls back to launch for an unreadable date', () => {
    expect(calendarStart(launch, 'garbage', {})).toBe('2026-11-01');
  });
});

describe('month helpers', () => {
  it('reads the month of a date', () => {
    expect(monthOf(D('2026-11-30'))).toEqual({ year: 2026, month: 11 });
  });

  it('moves across year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 6 }, 0)).toEqual({ year: 2026, month: 6 });
    expect(shiftMonth({ year: 2026, month: 1 }, -13)).toEqual({ year: 2024, month: 12 });
  });

  it('compares months', () => {
    expect(compareMonths({ year: 2026, month: 3 }, { year: 2026, month: 11 })).toBeLessThan(0);
    expect(compareMonths({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBeGreaterThan(0);
    expect(compareMonths({ year: 2026, month: 5 }, { year: 2026, month: 5 })).toBe(0);
  });
});
