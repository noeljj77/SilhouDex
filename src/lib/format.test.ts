import { describe, expect, it } from 'vitest';
import { formatCountdown } from './format.ts';

describe('formatCountdown', () => {
  it.each([
    [0, '00:00:00'],
    [1, '00:00:01'],
    [999, '00:00:01'],
    [1000, '00:00:01'],
    [61_000, '00:01:01'],
    [3_725_000, '01:02:05'],
    [86_399_000, '23:59:59'],
    [86_400_000, '24:00:00'],
    [-500, '00:00:00'],
  ])('formats %i ms as %s', (ms, text) => {
    expect(formatCountdown(ms)).toBe(text);
  });
});
