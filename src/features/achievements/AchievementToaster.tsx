import { Trophy, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { useProgress, useProgressStore } from '../../app/progressStore.ts';
import { ACHIEVEMENT_BY_ID } from '../../domain/achievements/definitions.ts';
import { AchievementIcon } from './AchievementIcon.tsx';

/** How long a toast stays before it counts as seen. */
export const TOAST_MS = 6000;
const MAX_VISIBLE = 3;

/**
 * Pops up when an achievement is unlocked, wherever the player is. Showing one marks it as seen,
 * after which it disappears (and its "New" badge on the Achievements page goes with it).
 */
export function AchievementToaster() {
  const store = useProgressStore();
  const { achievements } = useProgress();
  const reduceMotion = useReducedMotion();

  const unseen = useMemo(
    () =>
      Object.entries(achievements)
        .filter(([id, state]) => state.unlockedAt && !state.seen && ACHIEVEMENT_BY_ID.has(id))
        .sort((a, b) => (a[1].unlockedAt ?? '').localeCompare(b[1].unlockedAt ?? ''))
        .map(([id]) => id),
    [achievements],
  );
  const visible = unseen.slice(0, MAX_VISIBLE);
  const key = visible.join('|');

  useEffect(() => {
    if (!key) return;
    const ids = key.split('|');
    const timer = setTimeout(() => store.markAchievementsSeen(ids), TOAST_MS);
    return () => clearTimeout(timer);
  }, [key, store]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-40 flex flex-col items-center gap-2 px-3 md:items-end md:pr-6"
    >
      <AnimatePresence>
        {visible.map((id) => {
          const def = ACHIEVEMENT_BY_ID.get(id)!;
          return (
            <motion.div
              key={id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: -30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-volt/60 bg-night-800 p-3 shadow-[0_0_40px_-8px_rgba(250,204,21,0.6)]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-volt text-night-950">
                <AchievementIcon name={def.icon} size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-volt">
                  <Trophy size={12} aria-hidden /> Achievement unlocked
                </p>
                <p className="truncate font-bold text-white">{def.title}</p>
                <p className="truncate text-xs text-violet-200/80">{def.description}</p>
              </div>
              <button
                type="button"
                aria-label={`Dismiss ${def.title}`}
                onClick={() => store.markAchievementsSeen([id])}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-glow"
              >
                <X size={16} aria-hidden />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
