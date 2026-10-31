import type { GameResult } from '../game/types.ts';
import { addDays, daysBetween, toDateKey, type DateKey } from '../../lib/utcDate.ts';

export type DailyResults = Readonly<Record<DateKey, GameResult>>;

export interface StreakSummary {
  /** Consecutive finished days ending today, or yesterday if today is not done yet. */
  current: number;
  longest: number;
  /** Daily challenges finished, ever. */
  totalCompleted: number;
  completedToday: boolean;
  /** A streak is running but today's challenge is still to be played. */
  atRisk: boolean;
  lastCompleted: DateKey | null;
}

/**
 * Whether a saved daily result counts toward streaks and the calendar.
 *  - Any finished game counts (win, loss or give-up): showing up keeps the streak going.
 *  - It must have been finished on the same UTC date as its challenge, so replaying an old
 *    challenge later can never repair a broken streak.
 *  - Dates in the future are ignored.
 */
export function countsForStreak(key: DateKey, result: GameResult, today: DateKey): boolean {
  if (result.mode !== 'daily' || result.dateKey !== key) return false;
  if (key > today) return false;
  const finished = new Date(result.completedAt);
  return !Number.isNaN(finished.getTime()) && toDateKey(finished) === key;
}

/** Counted dates, oldest first. */
export function countedDates(results: DailyResults, today: DateKey): DateKey[] {
  return (Object.entries(results) as [DateKey, GameResult][])
    .filter(([key, result]) => countsForStreak(key, result, today))
    .map(([key]) => key)
    .sort();
}

export function computeStreaks(results: DailyResults, today: DateKey): StreakSummary {
  const dates = countedDates(results, today);
  const set = new Set<DateKey>(dates);

  let longest = 0;
  let run = 0;
  dates.forEach((date, i) => {
    run = i > 0 && daysBetween(dates[i - 1]!, date) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  });

  const completedToday = set.has(today);
  // The streak stays alive through today: it only breaks once a whole day passes with no game.
  let cursor: DateKey | null = completedToday
    ? today
    : set.has(addDays(today, -1))
      ? addDays(today, -1)
      : null;
  let current = 0;
  while (cursor && set.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return {
    current,
    longest,
    totalCompleted: dates.length,
    completedToday,
    atRisk: current > 0 && !completedToday,
    lastCompleted: dates.at(-1) ?? null,
  };
}
