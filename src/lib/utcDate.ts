/** A UTC calendar date as "YYYY-MM-DD". Daily challenges, streaks and results are keyed by it. */
export type DateKey = `${number}-${number}-${number}`;

const MS_PER_DAY = 86_400_000;
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a DateKey into UTC midnight. Throws on malformed or impossible dates (e.g. 2026-02-30). */
export function parseDateKey(key: string): Date {
  const match = DATE_KEY.exec(key);
  if (!match) throw new RangeError(`Not a date key: "${key}"`);
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new RangeError(`Not a real date: "${key}"`);
  }
  return date;
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string') return false;
  try {
    parseDateKey(value);
    return true;
  } catch {
    return false;
  }
}

/** The UTC calendar date of an instant, regardless of the device's time zone. */
export function toDateKey(date: Date): DateKey {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}` as DateKey;
}

export function addDays(key: DateKey, days: number): DateKey {
  return toDateKey(new Date(parseDateKey(key).getTime() + days * MS_PER_DAY));
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / MS_PER_DAY);
}

/** Milliseconds until the next UTC midnight (always > 0). */
export function msUntilNextUtcDay(now: Date): number {
  const next = parseDateKey(toDateKey(now)).getTime() + MS_PER_DAY;
  return next - now.getTime();
}
