import { parseDateKey, toDateKey, type DateKey } from '../../lib/utcDate.ts';
import type { FinishedStatus } from '../game/types.ts';
import { countsForStreak, type DailyResults } from './streaks.ts';

export type DayStatus =
  | FinishedStatus // a finished game: won, lost, gave_up
  | 'missed' // a past day since you started, with no game
  | 'today' // today, not played yet
  | 'future'
  | 'before-start'; // before you started playing: neither done nor missed

export interface CalendarDay {
  dateKey: DateKey;
  /** Day of the month, 1–31. */
  day: number;
  status: DayStatus;
  score?: number;
  challengeNumber?: number;
}

export interface MonthCalendar {
  year: number;
  /** 1–12 */
  month: number;
  /** Weeks start on Monday. Cells outside the month are null. */
  weeks: (CalendarDay | null)[][];
}

export interface MonthRef {
  year: number;
  month: number;
}

export const monthOf = (key: DateKey): MonthRef => {
  const d = parseDateKey(key);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
};

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export const compareMonths = (a: MonthRef, b: MonthRef) =>
  a.year * 12 + a.month - (b.year * 12 + b.month);

/** The first day a player can be said to have missed: launch day, or the day they first arrived. */
export function calendarStart(
  launchDate: DateKey,
  playerCreatedAt: string,
  results: DailyResults,
): DateKey {
  const created = new Date(playerCreatedAt);
  let start = Number.isNaN(created.getTime()) ? launchDate : toDateKey(created);
  if (start < launchDate) start = launchDate;
  // Never start later than a day that already has a result.
  for (const key of Object.keys(results) as DateKey[]) if (key < start) start = key;
  return start;
}

export function buildMonthCalendar(options: {
  year: number;
  month: number;
  results: DailyResults;
  today: DateKey;
  startDate: DateKey;
}): MonthCalendar {
  const { year, month, results, today, startDate } = options;
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7; // Monday = 0

  const cells: (CalendarDay | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(new Date(Date.UTC(year, month - 1, day)));
    const result = results[dateKey];
    let status: DayStatus;
    if (result && countsForStreak(dateKey, result, today)) status = result.status;
    else if (dateKey > today) status = 'future';
    else if (dateKey === today) status = 'today';
    else if (dateKey < startDate) status = 'before-start';
    else status = 'missed';

    const cell: CalendarDay = { dateKey, day, status };
    if (status === 'won' || status === 'lost' || status === 'gave_up') {
      cell.score = result?.score;
      if (result?.challengeNumber !== undefined) cell.challengeNumber = result.challengeNumber;
    }
    cells.push(cell);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { year, month, weeks };
}

/** Counts of each status in the month, for a one-line summary. */
export function summariseMonth(calendar: MonthCalendar): Record<DayStatus, number> {
  const counts: Record<DayStatus, number> = {
    won: 0,
    lost: 0,
    gave_up: 0,
    missed: 0,
    today: 0,
    future: 0,
    'before-start': 0,
  };
  for (const week of calendar.weeks) for (const day of week) if (day) counts[day.status] += 1;
  return counts;
}
