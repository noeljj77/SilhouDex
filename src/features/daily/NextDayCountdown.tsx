import { Clock } from 'lucide-react';
import { Countdown } from '../game/Countdown.tsx';

/** Always-visible time left until the next daily challenge (UTC midnight). */
export function NextDayCountdown() {
  return (
    <p className="dex-chip w-fit !px-3.5 !py-1.5 !text-sm">
      <Clock size={16} aria-hidden className="text-lens-deep" />
      <span>
        New challenge in <Countdown className="font-bold tabular-nums" />
      </span>
    </p>
  );
}
