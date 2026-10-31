import { Flame } from 'lucide-react';
import type { StreakSummary } from '../../domain/progression/streaks.ts';

/** Current streak, with a nudge when it is still waiting on today's game. */
export function StreakBadge({ streak }: { streak: StreakSummary }) {
  const { current, atRisk } = streak;
  const lit = current > 0;
  const text = lit ? `${current}-day streak` : 'Start your streak';
  return (
    <p
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold ${lit ? 'border-orange-400/50 bg-orange-400/15 text-orange-200' : 'border-white/15 bg-white/5 text-white/70'}`}
    >
      <Flame size={18} aria-hidden className={lit ? 'text-orange-400' : 'text-white/40'} />
      <span>{text}</span>
      {atRisk && <span className="font-medium text-orange-200/80">· play today to keep it</span>}
    </p>
  );
}
