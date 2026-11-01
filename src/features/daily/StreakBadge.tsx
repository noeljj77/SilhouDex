import { Flame } from 'lucide-react';
import type { StreakSummary } from '../../domain/progression/streaks.ts';

/** Current streak, with a nudge when it is still waiting on today's game. */
export function StreakBadge({ streak }: { streak: StreakSummary }) {
  const { current, atRisk } = streak;
  const lit = current > 0;
  const text = lit ? `${current}-day streak` : 'Start your streak';
  return (
    <p
      className={`dex-chip w-fit !px-3.5 !py-1.5 !text-sm ${lit ? 'bg-[#ffd9b0]' : 'text-ink-soft'}`}
    >
      <Flame size={18} aria-hidden className={lit ? 'text-[#e8590c]' : 'text-ink-soft'} />
      <span>{text}</span>
      {atRisk && <span className="font-medium">· play today to keep it</span>}
    </p>
  );
}
