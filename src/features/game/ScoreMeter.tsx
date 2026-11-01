import { motion } from 'motion/react';
import { SCORING } from '../../domain/game/config.ts';
import type { GameView } from '../../domain/game/types.ts';
import { AnimatedNumber } from './AnimatedNumber.tsx';

/** Score, a bar that drains with each miss, and a pip for each guess used. */
export function ScoreMeter({ view }: { view: GameView }) {
  const percent = Math.max(0, Math.min(100, (view.score / SCORING.startScore) * 100));
  // Like a battle HP bar: green, then yellow, then red as points run out.
  const tone = percent > 50 ? 'bg-[#3dc26b]' : percent > 25 ? 'bg-volt' : 'bg-dex';

  return (
    <div role="group" aria-label="Score" className="dex-card p-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-soft">Score</p>
          <p className="font-display text-5xl leading-none text-ink tabular-nums">
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
              className={`size-3.5 rounded-full border-2 border-ink ${i < view.wrongGuesses ? 'bg-dex' : i === SCORING.maxWrongGuesses - 1 ? 'bg-volt' : 'bg-panel'}`}
            />
          ))}
        </ul>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-full border-2 border-ink bg-ink px-2.5 py-1">
        <span aria-hidden className="font-display text-xs leading-none text-volt">
          HP
        </span>
        <div
          className="h-3 flex-1 overflow-hidden rounded-full bg-white/20"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={SCORING.startScore}
          aria-valuenow={view.score}
          aria-label="Points left"
        >
          <motion.div
            className={`h-full rounded-full ${tone}`}
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>
      {!view.isOver && (
        <p
          className={`mt-2 text-sm ${view.isFinalGuess ? 'font-bold text-dex-dark' : 'text-ink-soft'}`}
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
