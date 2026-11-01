import { Clock } from 'lucide-react';
import { Countdown } from '../game/Countdown.tsx';

/** Always-visible time left until the next daily challenge (UTC midnight). */
export function NextDayCountdown() {
  return (
    <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-violet-200/90">
      <Clock size={16} aria-hidden className="text-cyan-glow" />
      <span>
        New challenge in <Countdown className="font-bold text-white" />
      </span>
    </p>
  );
}
