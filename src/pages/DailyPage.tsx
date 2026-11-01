import { CalendarClock } from 'lucide-react';
import { useCallback, useState } from 'react';
import { hrefFor } from '../app/router.ts';
import { useProgress, useProgressStore } from '../app/progressStore.ts';
import { computeStreaks } from '../domain/progression/streaks.ts';
import { NextDayCountdown } from '../features/daily/NextDayCountdown.tsx';
import { StreakBadge } from '../features/daily/StreakBadge.tsx';
import { ShareResult } from '../features/share/ShareResult.tsx';
import { pokedexIndex } from '../data/pokedexIndex.ts';
import { DEFAULT_DIFFICULTY } from '../domain/clues/difficulty.ts';
import type { DailyChallenge } from '../domain/daily/schedule.ts';
import { createSession, viewFromResult } from '../domain/game/engine.ts';
import type { GameResult, GameSession } from '../domain/game/types.ts';
import { useDailyChallenge } from '../features/daily/useDailyChallenge.ts';
import { GameScreen } from '../features/game/GameScreen.tsx';
import { useGameController } from '../features/game/useGameController.ts';
import { parseDateKey } from '../lib/utcDate.ts';

export function DailyPage() {
  const state = useDailyChallenge();

  if (state.kind === 'before-launch') {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <CalendarClock size={40} className="text-violet-glow" aria-hidden />
        <h1 className="text-3xl font-black text-white">The first challenge is coming</h1>
        <p className="text-violet-200/80">
          Daily Silhouette starts on {state.launchDate}. Try Practice in the meantime.
        </p>
      </main>
    );
  }
  // A new key per day gives each challenge a fresh game.
  return <DailyChallengeView key={state.challenge.dateKey} challenge={state.challenge} />;
}

function formatDate(dateKey: DailyChallenge['dateKey']): string {
  return parseDateKey(dateKey).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

function DailyChallengeView({ challenge }: { challenge: DailyChallenge }) {
  const store = useProgressStore();
  // Decided once, on arrival: today's result is already saved, so the day is locked.
  const [saved] = useState<GameResult | undefined>(
    () => store.getSnapshot().daily.results[challenge.dateKey],
  );

  const streak = computeStreaks(useProgress().daily.results, challenge.dateKey);

  return (
    <main className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-glow">
            Daily Silhouette
          </p>
          <h1 className="text-3xl font-black text-white">
            Challenge #{challenge.challengeNumber}
            <span className="block text-base font-medium text-violet-200/70 sm:ml-3 sm:inline">
              {formatDate(challenge.dateKey)}
            </span>
          </h1>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <StreakBadge streak={streak} />
          <NextDayCountdown />
        </div>
      </header>
      {saved ? (
        <LockedDaily challenge={challenge} result={saved} />
      ) : (
        <PlayableDaily challenge={challenge} />
      )}
    </main>
  );
}

/** Under a finished daily: share it, or play on elsewhere. */
function DailyFooter({ result }: { result: GameResult }) {
  const entry = pokedexIndex.getById(result.pokemonId);
  return (
    <div className="flex flex-col gap-4">
      {entry && <ShareResult result={result} entry={entry} />}
      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <a
          href={hrefFor('practice')}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          Play Practice
        </a>
        <a
          href={hrefFor('pokedex')}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          View Pokédex
        </a>
      </div>
    </div>
  );
}

/** Today's result is saved: show it, with no way to play again. */
function LockedDaily({ challenge, result }: { challenge: DailyChallenge; result: GameResult }) {
  return (
    <GameScreen
      pokemonId={challenge.pokemonId}
      seed={challenge.seed}
      view={viewFromResult(result)}
      guesses={[]}
      finished={{ result, isNewDiscovery: false }}
      onGuess={() => 'ignored'}
      onGiveUp={() => {}}
      resultFooter={<DailyFooter result={result} />}
    />
  );
}

function PlayableDaily({ challenge }: { challenge: DailyChallenge }) {
  const store = useProgressStore();

  // An unfinished game from earlier today resumes; one from another day is ignored.
  const [resume] = useState<GameSession | undefined>(() => {
    const active = store.getSnapshot().daily.active;
    return active?.dateKey === challenge.dateKey && active.status === 'playing'
      ? active
      : undefined;
  });

  const start = useCallback(
    () =>
      createSession({
        id: `daily-${challenge.dateKey}`,
        mode: 'daily',
        pokemonId: challenge.pokemonId,
        challengeNumber: challenge.challengeNumber,
        dateKey: challenge.dateKey,
        startedAt: new Date().toISOString(),
      }),
    [challenge],
  );
  const onProgress = useCallback((s: GameSession) => store.saveActive('daily', s), [store]);
  const onFinish = useCallback((s: GameSession) => store.finishGame(s), [store]);
  const game = useGameController({ start, resume, onProgress, onFinish });

  return (
    <GameScreen
      pokemonId={challenge.pokemonId}
      seed={challenge.seed}
      // Everyone gets the same clues on the same day, so the player's Practice setting is not used.
      difficulty={DEFAULT_DIFFICULTY}
      view={game.view}
      guesses={game.session.guesses}
      finished={game.finish}
      onGuess={game.guess}
      onGiveUp={game.giveUp}
      resultFooter={game.finish ? <DailyFooter result={game.finish.result} /> : null}
    />
  );
}
