import { BookOpen, CalendarCheck, Flame, Medal, Percent, Target, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useProgress, useProgressStore } from '../app/progressStore.ts';
import { hrefFor } from '../app/router.ts';
import { pokedexIndex } from '../data/pokedexIndex.ts';
import { LAUNCH_DATE } from '../domain/daily/schedule.ts';
import { calendarStart } from '../domain/progression/calendar.ts';
import {
  computeCollectionStats,
  computeDailyStats,
  computePracticeStats,
} from '../domain/progression/stats.ts';
import { computeStreaks } from '../domain/progression/streaks.ts';
import { useUtcClock } from '../features/daily/useUtcClock.ts';
import { GuessDistributionChart } from '../features/profile/GuessDistributionChart.tsx';
import { MonthCalendarView } from '../features/profile/MonthCalendarView.tsx';
import { StatCard } from '../features/profile/StatCard.tsx';
import { toDateKey } from '../lib/utcDate.ts';

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

export function ProfilePage() {
  const store = useProgressStore();
  const progress = useProgress();
  const today = toDateKey(useUtcClock());

  const streaks = useMemo(
    () => computeStreaks(progress.daily.results, today),
    [progress.daily.results, today],
  );
  const daily = useMemo(() => computeDailyStats(progress.daily.results), [progress.daily.results]);
  const practice = useMemo(
    () => computePracticeStats(progress.practice.results),
    [progress.practice.results],
  );
  const collection = computeCollectionStats(progress.discoveries, pokedexIndex.entries.length);
  const startDate = calendarStart(LAUNCH_DATE, progress.player.createdAt, progress.daily.results);
  const todayResult = progress.daily.results[today];

  const since = new Date(progress.player.createdAt);
  const sinceText = Number.isNaN(since.getTime())
    ? null
    : since.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });

  return (
    <main className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-glow">
          Trainer profile
        </p>
        <h1 className="text-3xl font-black text-white">Profile</h1>
        {sinceText && <p className="text-sm text-violet-200/70">Playing since {sinceText}</p>}
      </header>

      {store.storageMode !== 'persistent' && (
        <p
          role="status"
          className="rounded-xl border border-volt/40 bg-volt/10 p-3 text-sm text-volt"
        >
          {store.storageMode === 'read-only'
            ? 'This browser holds progress from a newer version of SilhouDex, so nothing new is being saved.'
            : 'Your browser is blocking storage, so progress will be lost when you close this page.'}
        </p>
      )}

      <section aria-labelledby="streaks" className="flex flex-col gap-3">
        <h2 id="streaks" className="text-xl font-bold text-white">
          Daily streak
        </h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Current streak"
            icon={Flame}
            value={streaks.current}
            tone={streaks.current > 0 ? 'text-orange-300' : 'text-white'}
            hint={
              streaks.atRisk
                ? 'Play today to keep it going'
                : streaks.current > 0
                  ? 'Keep it up'
                  : 'Play today to start one'
            }
          />
          <StatCard label="Longest streak" icon={Trophy} value={streaks.longest} tone="text-volt" />
          <StatCard
            label="Completed"
            icon={CalendarCheck}
            value={streaks.totalCompleted}
            hint="Daily challenges"
          />
          <StatCard
            label="Today"
            icon={Target}
            value={todayResult ? todayResult.score : '—'}
            tone={todayResult ? 'text-cyan-glow' : 'text-white/60'}
            hint={
              todayResult ? (
                'Finished. Come back tomorrow.'
              ) : (
                <a
                  href={hrefFor('daily')}
                  className="font-semibold text-cyan-glow underline-offset-2 hover:underline"
                >
                  Not played yet. Play now
                </a>
              )
            }
          />
        </dl>
        <MonthCalendarView results={progress.daily.results} today={today} startDate={startDate} />
      </section>

      <section aria-labelledby="daily-stats" className="flex flex-col gap-3">
        <h2 id="daily-stats" className="text-xl font-bold text-white">
          Daily statistics
        </h2>
        {daily.played === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-violet-200/70">
            Finish your first daily challenge to see your statistics here.
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Played" value={daily.played} />
              <StatCard
                label="Win rate"
                icon={Percent}
                value={percent(daily.winRate)}
                hint={`${daily.won} won · ${daily.lost} lost · ${daily.gaveUp} gave up`}
              />
              <StatCard
                label="Average score"
                value={daily.averageScore}
                hint={`Best ${daily.bestScore}`}
                tone="text-volt"
              />
              <StatCard
                label="Perfect games"
                icon={Medal}
                value={daily.perfectGames}
                hint="Solved with no wrong guess"
              />
            </dl>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
              <GuessDistributionChart stats={daily} />
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="practice-stats" className="flex flex-col gap-3">
        <h2 id="practice-stats" className="text-xl font-bold text-white">
          Practice
        </h2>
        <p className="text-sm text-violet-200/70">
          Practice games are counted separately and never affect your daily statistics or streak.
        </p>
        <dl className="grid grid-cols-3 gap-3">
          <StatCard label="Played" value={practice.played} />
          <StatCard
            label="Win rate"
            value={practice.played === 0 ? '—' : percent(practice.winRate)}
          />
          <StatCard
            label="Average score"
            value={practice.played === 0 ? '—' : practice.averageScore}
            tone="text-volt"
          />
        </dl>
      </section>

      <section aria-labelledby="collection" className="flex flex-col gap-3">
        <h2 id="collection" className="text-xl font-bold text-white">
          Collection
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-white">
            <span className="text-3xl font-black tabular-nums text-cyan-glow">
              {collection.discovered}
            </span>
            <span className="text-violet-200/80">
              {' '}
              of {collection.total} Pokémon discovered ({collection.percent}%)
            </span>
          </p>
          <a
            href={hrefFor('pokedex')}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            <BookOpen size={16} aria-hidden /> Open Pokédex
          </a>
        </div>
      </section>
    </main>
  );
}
