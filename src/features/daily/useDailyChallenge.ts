import {
  getDailyChallenge,
  LAUNCH_DATE,
  type DailyChallenge,
} from '../../domain/daily/schedule.ts';
import { useUtcClock } from './useUtcClock.ts';

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
  return compute(useUtcClock());
}
