import { useEffect, useState } from 'react';
import { msUntilNextUtcDay, toDateKey } from '../../lib/utcDate.ts';

/**
 * The current time, refreshed just after each UTC midnight. Anything that depends on "today"
 * (the daily challenge, streaks, the calendar) re-renders on its own when the date changes.
 */
export function useUtcClock(): Date {
  const [now, setNow] = useState(() => new Date());
  const dateKey = toDateKey(now);

  useEffect(() => {
    // setTimeout cannot exceed ~24.8 days; one day is always safe.
    const delay = Math.min(msUntilNextUtcDay(new Date()) + 250, 2 ** 31 - 1);
    const timer = setTimeout(() => setNow(new Date()), delay);
    return () => clearTimeout(timer);
  }, [dateKey]);

  return now;
}
