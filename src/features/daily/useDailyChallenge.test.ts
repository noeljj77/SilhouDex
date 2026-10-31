import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDailyPool, LAUNCH_DATE } from '../../domain/daily/schedule.ts';
import { addDays } from '../../lib/utcDate.ts';
import { useDailyChallenge } from './useDailyChallenge.ts';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDailyChallenge', () => {
  it('gives today’s challenge', () => {
    vi.setSystemTime(new Date(`${addDays(LAUNCH_DATE, 2)}T09:00:00Z`));
    const { result } = renderHook(() => useDailyChallenge());
    expect(result.current).toMatchObject({
      kind: 'ready',
      challenge: {
        challengeNumber: 3,
        dateKey: addDays(LAUNCH_DATE, 2),
        pokemonId: getDailyPool()[2],
      },
    });
  });

  it('moves on to the next challenge at UTC midnight without a refresh', () => {
    vi.setSystemTime(new Date(`${addDays(LAUNCH_DATE, 2)}T23:59:58.000Z`));
    const { result } = renderHook(() => useDailyChallenge());
    const before = result.current.kind === 'ready' ? result.current.challenge : null;
    expect(before?.challengeNumber).toBe(3);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    const after = result.current.kind === 'ready' ? result.current.challenge : null;
    expect(after?.challengeNumber).toBe(4);
    expect(after?.pokemonId).toBe(getDailyPool()[3]);
  });

  it('reports that the game has not launched yet', () => {
    vi.setSystemTime(new Date(`${addDays(LAUNCH_DATE, -3)}T12:00:00Z`));
    const { result } = renderHook(() => useDailyChallenge());
    expect(result.current).toEqual({ kind: 'before-launch', launchDate: LAUNCH_DATE });
  });

  it('starts the first challenge when launch day arrives', () => {
    vi.setSystemTime(new Date(`${addDays(LAUNCH_DATE, -1)}T23:59:59.000Z`));
    const { result } = renderHook(() => useDailyChallenge());
    expect(result.current.kind).toBe('before-launch');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toMatchObject({ kind: 'ready', challenge: { challengeNumber: 1 } });
  });
});
