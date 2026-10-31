import { useEffect, useState } from 'react';
import {
  getDailyChallenge,
  LAUNCH_DATE,
  type DailyChallenge,
} from '../../domain/daily/schedule.ts';
import { msUntilNextUtcDay } from '../../lib/utcDate.ts';

export type DailyChallengeState =
  { kind: 'before-launch'; launchDate: string } | { kind: 'ready'; challenge: DailyChallenge };

function compute(now: Date): DailyChallengeState {
  try {
    return { kind: 'ready', challenge: getDailyChallenge(now) };
  } catch (error) {
    if (error instanceof RangeError) return { kind: 'before-launch', launchDate: LAUNCH_DATE };
    throw error;
  }
}

/**
 * Today's challenge (by UTC date). Switches to the next one on its own at UTC midnight.
 * Before the launch date there is no challenge yet.
 */
export function useDailyChallenge(): DailyChallengeState {
  const [now, setNow] = useState(() => new Date());
  const state = compute(now);
  const dateKey = state.kind === 'ready' ? state.challenge.dateKey : 'pre-launch';

  useEffect(() => {
    // Wake just after the next UTC midnight (setTimeout cannot exceed ~24.8 days; one day is safe).
    const delay = Math.min(msUntilNextUtcDay(new Date()) + 250, 2 ** 31 - 1);
    const timer = setTimeout(() => setNow(new Date()), delay);
    return () => clearTimeout(timer);
  }, [dateKey]);

  return state;
}
