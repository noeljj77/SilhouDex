import { useMemo, useState } from 'react';
import { useProgress } from '../app/progressStore.ts';
import { pokedexIndex } from '../data/pokedexIndex.ts';
import {
  ACHIEVEMENT_CATEGORIES,
  CATEGORY_LABELS,
  type AchievementCategory,
} from '../domain/achievements/definitions.ts';
import { viewAchievements } from '../domain/achievements/evaluator.ts';
import { AchievementCard } from '../features/achievements/AchievementCard.tsx';
import { useUtcClock } from '../features/daily/useUtcClock.ts';
import { toDateKey } from '../lib/utcDate.ts';

export function AchievementsPage() {
  const progress = useProgress();
  const today = toDateKey(useUtcClock());
  const [category, setCategory] = useState<AchievementCategory | 'all'>('all');

  const views = useMemo(
    () => viewAchievements(progress, pokedexIndex.entries, today),
    [progress, today],
  );
  const unlockedCount = views.filter((v) => v.status === 'unlocked').length;
  const percent = Math.round((unlockedCount / views.length) * 100);
  const groups = ACHIEVEMENT_CATEGORIES.filter((c) => category === 'all' || c === category)
    .map((c) => ({ category: c, items: views.filter((v) => v.definition.category === c) }))
    .filter((g) => g.items.length > 0);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-glow">
            Goals to chase
          </p>
          <h1 className="text-3xl font-black text-white">Achievements</h1>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-white">
            <span className="text-3xl font-black tabular-nums text-volt">{unlockedCount}</span>
            <span className="text-violet-200/80"> of {views.length} unlocked</span>
          </p>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Achievements unlocked"
            aria-valuemin={0}
            aria-valuemax={views.length}
            aria-valuenow={unlockedCount}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-volt to-orange-400 transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <ul
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
          aria-label="Categories"
        >
          {(['all', ...ACHIEVEMENT_CATEGORIES] as const).map((c) => (
            <li key={c} className="shrink-0">
              <button
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`min-h-9 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-cyan-glow ${category === c ? 'border-cyan-glow bg-cyan-glow/20 text-cyan-glow' : 'border-white/15 text-white/70 hover:bg-white/10'}`}
              >
                {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
              </button>
            </li>
          ))}
        </ul>
      </header>

      {groups.map(({ category: c, items }) => (
        <section key={c} aria-labelledby={`cat-${c}`} className="flex flex-col gap-3">
          <h2 id={`cat-${c}`} className="text-lg font-bold text-white">
            {CATEGORY_LABELS[c]}
            <span className="ml-2 text-sm font-medium text-violet-200/60">
              {items.filter((i) => i.status === 'unlocked').length}/{items.length}
            </span>
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map((view) => (
              <AchievementCard key={view.definition.id} view={view} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
