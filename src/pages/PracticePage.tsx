import { useCallback, useState } from 'react';
import { useProgress, useProgressStore } from '../app/progressStore.ts';
import { hrefFor } from '../app/router.ts';
import { pokedexIndex } from '../data/pokedexIndex.ts';
import { getDailyChallenge } from '../domain/daily/schedule.ts';
import { createSession } from '../domain/game/engine.ts';
import type { GameSession } from '../domain/game/types.ts';
import type { Generation } from '../domain/pokemon/types.ts';
import {
  pickPracticePokemonId,
  practicePool,
  recentPracticeIds,
} from '../domain/practice/select.ts';
import { DifficultyPicker } from '../features/game/DifficultyPicker.tsx';
import { GenerationPicker } from '../features/game/GenerationPicker.tsx';
import { GameScreen } from '../features/game/GameScreen.tsx';
import { useGameController } from '../features/game/useGameController.ts';
import { newId } from '../lib/id.ts';
import { createRng } from '../lib/prng.ts';

/** Today's daily answer, which Practice must never pick (it would give the answer away). */
function todaysDailyAnswer(now: Date): number[] {
  try {
    return [getDailyChallenge(now).pokemonId];
  } catch {
    return []; // before launch there is no daily answer yet
  }
}

export function PracticePage() {
  // A new key starts a fresh round (new random Pokémon, new game).
  const [round, setRound] = useState(0);
  return <PracticeRound key={round} onNext={() => setRound((n) => n + 1)} />;
}

function PracticeRound({ onNext }: { onNext(): void }) {
  const store = useProgressStore();
  const progress = useProgress();

  // Decided once per round: continue the unfinished game, or pick a new Pokémon.
  const [round] = useState(() => {
    const snapshot = store.getSnapshot();
    const active = snapshot.practice.active;
    if (active && active.status === 'playing') {
      return { sessionId: active.id, pokemonId: active.pokemonId, resume: active };
    }
    const pokemonId = pickPracticePokemonId(
      createRng(newId()),
      practicePool(pokedexIndex.entries, snapshot.settings.generations),
      recentPracticeIds(snapshot.practice.results),
      todaysDailyAnswer(new Date()),
    );
    return { sessionId: newId(), pokemonId, resume: undefined as GameSession | undefined };
  });

  const start = useCallback(
    () =>
      createSession({
        id: round.sessionId,
        mode: 'practice',
        pokemonId: round.pokemonId,
        startedAt: new Date().toISOString(),
      }),
    [round],
  );
  const onProgress = useCallback((s: GameSession) => store.saveActive('practice', s), [store]);
  const onFinish = useCallback((s: GameSession) => store.finishGame(s), [store]);
  const game = useGameController({ start, resume: round.resume, onProgress, onFinish });

  const played = progress.practice.results.length;
  // Choosing generations is allowed until the first guess, and again from the next Pokémon.
  const started = game.session.guesses.length > 0 || game.view.isOver;
  const poolSize = practicePool(pokedexIndex.entries, progress.settings.generations).length;
  const changeGenerations = (next: Generation[]) => {
    store.setGenerations(next);
    // The mystery Pokémon was picked under the old choice, so an unstarted game picks again.
    if (!started) onNext();
  };
  return (
    <main className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-dex">Unlimited play</p>
          <h1 className="font-display text-4xl text-ink">Practice</h1>
          <p className="text-sm text-ink-soft">
            Never affects your daily streak or daily stats.
            {played > 0 && ` Games played: ${played}.`}
          </p>
        </div>
        <DifficultyPicker
          value={progress.settings.difficulty}
          onChange={store.setDifficulty}
          disabled={started}
        />
      </header>

      <GenerationPicker
        value={progress.settings.generations}
        onChange={changeGenerations}
        poolSize={poolSize}
        disabled={started}
      />

      <GameScreen
        pokemonId={round.pokemonId}
        seed={`practice:${round.sessionId}`}
        difficulty={progress.settings.difficulty}
        view={game.view}
        guesses={game.session.guesses}
        finished={game.finish}
        onGuess={game.guess}
        onGiveUp={game.giveUp}
        resultFooter={
          <div className="flex flex-wrap gap-2 border-t-2 border-line pt-4">
            <button type="button" onClick={onNext} className="dex-btn dex-btn-yellow">
              Next Pokémon
            </button>
            <a href={hrefFor('daily')} className="dex-btn">
              Daily challenge
            </a>
            <a href={hrefFor('pokedex')} className="dex-btn">
              View Pokédex
            </a>
          </div>
        }
      />
    </main>
  );
}
