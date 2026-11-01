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
      className={`relative flex gap-3 rounded-2xl border p-4 ${unlocked ? 'border-volt/50 bg-gradient-to-br from-volt/15 to-violet-glow/10 shadow-[0_0_30px_-12px_rgba(250,204,21,0.7)]' : status === 'in-progress' ? 'border-cyan-glow/30 bg-white/5' : 'border-white/10 bg-night-900/50'}`}
    >
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-xl ${unlocked ? 'bg-volt text-night-950' : status === 'in-progress' ? 'bg-cyan-glow/15 text-cyan-glow' : 'bg-white/5 text-white/30'}`}
      >
        {status === 'locked' ? (
          <Lock size={20} aria-hidden />
        ) : (
          <AchievementIcon name={def.icon} size={24} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-bold ${status === 'locked' ? 'text-white/60' : 'text-white'}`}>
            {def.title}
          </h3>
          {isNew && (
            <span className="rounded-full bg-volt px-2 py-0.5 text-[0.65rem] font-black uppercase text-night-950">
              New
            </span>
          )}
          {unlocked && !isNew && (
            <Check size={18} className="shrink-0 text-volt" role="img" aria-label="Unlocked" />
          )}
        </div>
        <p className={`text-sm ${status === 'locked' ? 'text-white/60' : 'text-violet-200/80'}`}>
          {def.description}
        </p>

        {unlocked ? (
          <p className="mt-2 text-xs font-semibold text-volt">
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
              className="h-2 overflow-hidden rounded-full bg-white/10"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-glow to-violet-glow transition-[width] duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1 text-xs tabular-nums text-violet-200/60">
              {progress} / {def.target} {def.unit}
            </p>
          </div>
        )}
      </div>
    </motion.li>
  );
}
