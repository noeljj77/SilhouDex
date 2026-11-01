import { motion } from 'motion/react';
import { SCORING } from '../../domain/game/config.ts';
import type { GameView } from '../../domain/game/types.ts';
import { AnimatedNumber } from './AnimatedNumber.tsx';

/** Score, a bar that drains with each miss, and a pip for each guess used. */
export function ScoreMeter({ view }: { view: GameView }) {
  const percent = Math.max(0, Math.min(100, (view.score / SCORING.startScore) * 100));
  const tone =
    percent > 60
      ? 'from-cyan-glow to-violet-glow'
      : percent > 30
        ? 'from-volt to-orange-400'
        : 'from-orange-400 to-red-500';

  return (
    <div
      role="group"
      aria-label="Score"
      className="rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/70">Score</p>
          <p className="text-4xl font-black leading-none text-white tabular-nums">
            <AnimatedNumber value={view.score} />
          </p>
        </div>
        <ul
          className="flex gap-1.5"
          aria-label={`${view.wrongGuesses} of ${SCORING.maxWrongGuesses} guesses used`}
        >
          {Array.from({ length: SCORING.maxWrongGuesses }, (_, i) => (
            <li
              key={i}
              className={`size-3 rounded-full ${i < view.wrongGuesses ? 'bg-red-400' : i === SCORING.maxWrongGuesses - 1 ? 'bg-volt/50' : 'bg-white/20'}`}
            />
          ))}
        </ul>
      </div>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={SCORING.startScore}
        aria-valuenow={view.score}
        aria-label="Points left"
      >
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${tone}`}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      {!view.isOver && (
        <p
          className={`mt-2 text-sm ${view.isFinalGuess ? 'font-bold text-volt' : 'text-violet-200/70'}`}
          aria-live="polite"
        >
          {view.isFinalGuess
            ? 'Final guess! Everything is revealed.'
            : `Each wrong guess costs ${SCORING.wrongGuessPenalty} points.`}
        </p>
      )}
    </div>
  );
}
