import { useEffect, useState } from 'react';
import { formatCountdown } from '../../lib/format.ts';
import { msUntilNextUtcDay } from '../../lib/utcDate.ts';

/** Time left until the next daily challenge (UTC midnight). */
export function Countdown({ className }: { className?: string }) {
  const [ms, setMs] = useState(() => msUntilNextUtcDay(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setMs(msUntilNextUtcDay(new Date())), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <time
      role="timer"
      aria-live="off"
      className={`tabular-nums ${className ?? ''}`}
      aria-label="Time until the next challenge"
    >
      {formatCountdown(ms)}
    </time>
  );
}
