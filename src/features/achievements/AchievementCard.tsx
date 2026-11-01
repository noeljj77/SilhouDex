import { Check, Lock } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { AchievementView } from '../../domain/achievements/evaluator.ts';
import { AchievementIcon } from './AchievementIcon.tsx';

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
};

/** One achievement: locked, in progress (with a bar), or unlocked (with its date). */
export function AchievementCard({ view }: { view: AchievementView }) {
  const { definition: def, progress, status, unlockedAt, isNew } = view;
  const reduceMotion = useReducedMotion();
  const percent = Math.round((progress / def.target) * 100);
  const unlocked = status === 'unlocked';

  return (
    <motion.li
      // A freshly unlocked achievement pops in with a glow.
      initial={isNew && !reduceMotion ? { scale: 0.9, opacity: 0.4 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 14 }}
      data-status={status}
      className={`relative flex gap-3 rounded-2xl border-2 border-ink p-4 ${unlocked ? 'bg-[#fff4c2] shadow-[0_4px_0_var(--color-ink)]' : status === 'in-progress' ? 'bg-panel shadow-[0_4px_0_var(--color-ink)]' : 'border-dashed !border-line bg-panel/60'}`}
    >
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-xl border-2 ${unlocked ? 'border-ink bg-volt text-ink' : status === 'in-progress' ? 'border-ink bg-lens/20 text-lens-deep' : 'border-line bg-paper text-ink-soft'}`}
      >
        {status === 'locked' ? (
          <Lock size={20} aria-hidden />
        ) : (
          <AchievementIcon name={def.icon} size={24} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`font-display text-lg ${status === 'locked' ? 'text-ink-soft' : 'text-ink'}`}
          >
            {def.title}
          </h3>
          {isNew && (
            <span className="dex-chip bg-dex !px-2 !py-0 !text-[0.7rem] !text-white">New</span>
          )}
          {unlocked && !isNew && (
            <Check size={18} className="shrink-0 text-leaf" role="img" aria-label="Unlocked" />
          )}
        </div>
        <p className="text-sm text-ink-soft">{def.description}</p>

        {unlocked ? (
          <p className="mt-2 text-xs font-bold text-leaf">
            Unlocked{unlockedAt && formatDate(unlockedAt) ? ` ${formatDate(unlockedAt)}` : ''}
          </p>
        ) : (
          <div className="mt-2">
            <div
              role="progressbar"
              aria-label={`${def.title} progress`}
              aria-valuemin={0}
              aria-valuemax={def.target}
              aria-valuenow={progress}
              className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-paper"
            >
              <div
                className="h-full bg-lens transition-[width] duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-semibold tabular-nums text-ink-soft">
              {progress} / {def.target} {def.unit}
            </p>
          </div>
        )}
      </div>
    </motion.li>
  );
}
