import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  isDateKey,
  msUntilNextUtcDay,
  parseDateKey,
  toDateKey,
  type DateKey,
} from './utcDate.ts';

const key = (s: string) => s as DateKey;

describe('toDateKey', () => {
  it('uses the UTC date, not the local one', () => {
    expect(toDateKey(new Date('2026-03-01T23:59:59.999Z'))).toBe('2026-03-01');
    expect(toDateKey(new Date('2026-03-02T00:00:00.000Z'))).toBe('2026-03-02');
    // 22:00 in New York is already the next day in UTC
    expect(toDateKey(new Date('2026-03-01T22:00:00-05:00'))).toBe('2026-03-02');
  });

  it('zero-pads', () => {
    expect(toDateKey(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-05');
  });
});

describe('parseDateKey / isDateKey', () => {
  it('accepts real dates, including leap days', () => {
    expect(parseDateKey('2028-02-29').toISOString()).toBe('2028-02-29T00:00:00.000Z');
    expect(isDateKey('2026-12-31')).toBe(true);
  });

  it.each(['2026-02-29', '2026-13-01', '2026-00-10', '2026-1-1', 'tomorrow', '', '2026-04-31'])(
    'rejects %s',
    (bad) => {
      expect(isDateKey(bad)).toBe(false);
      expect(() => parseDateKey(bad)).toThrow(RangeError);
    },
  );

  it('rejects non-strings', () => {
    expect(isDateKey(20260101)).toBe(false);
    expect(isDateKey(null)).toBe(false);
  });
});

describe('addDays / daysBetween', () => {
  it('crosses month, year and leap-year boundaries', () => {
    expect(addDays(key('2026-01-31'), 1)).toBe('2026-02-01');
    expect(addDays(key('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(key('2028-02-28'), 1)).toBe('2028-02-29');
    expect(addDays(key('2027-02-28'), 1)).toBe('2027-03-01');
    expect(addDays(key('2026-03-01'), -1)).toBe('2026-02-28');
  });

  it('counts whole days both ways', () => {
    expect(daysBetween(key('2026-01-01'), key('2026-01-01'))).toBe(0);
    expect(daysBetween(key('2026-01-01'), key('2027-01-01'))).toBe(365);
    expect(daysBetween(key('2028-01-01'), key('2029-01-01'))).toBe(366);
    expect(daysBetween(key('2026-03-10'), key('2026-03-01'))).toBe(-9);
  });
});

describe('msUntilNextUtcDay', () => {
  it('counts down to the next UTC midnight', () => {
    expect(msUntilNextUtcDay(new Date('2026-03-01T23:59:59.000Z'))).toBe(1000);
    expect(msUntilNextUtcDay(new Date('2026-03-01T00:00:00.000Z'))).toBe(86_400_000);
    expect(msUntilNextUtcDay(new Date('2026-03-01T12:00:00.000Z'))).toBe(43_200_000);
  });
});
