import { useCallback, useMemo, useState } from 'react';
import type { FinishOutcome } from '../../app/progressStore.ts';
import { getGameView, giveUp as giveUpSession, submitGuess } from '../../domain/game/engine.ts';
import type { GameSession, GameView } from '../../domain/game/types.ts';
import type { GuessOutcome } from '../../domain/game/engine.ts';
import type { SpeciesId } from '../../domain/pokemon/types.ts';

export interface GameControllerOptions {
  /** Starts a fresh game when there is nothing to resume. Called once, on mount. */
  start(): GameSession;
  /** An unfinished game to continue (for example after a page refresh). */
  resume?: GameSession;
  /** Called after every guess that leaves the game running, so a refresh can resume it. */
  onProgress(session: GameSession): void;
  /** Called once when the game ends. Locks in the result. */
  onFinish(session: GameSession): FinishOutcome;
}

export interface GameController {
  session: GameSession;
  view: GameView;
  /** Set once the game has ended. */
  finish: FinishOutcome | null;
  guess(pokemonId: SpeciesId): GuessOutcome;
  giveUp(): void;
}

/**
 * Runs one game. All rules live in the pure engine; this only wires them to React and to saving.
 * Mount it with a `key` per challenge so a new day starts a new controller.
 */
export function useGameController(options: GameControllerOptions): GameController {
  const { onProgress, onFinish } = options;
  const [session, setSession] = useState<GameSession>(() => options.resume ?? options.start());
  const [finish, setFinish] = useState<FinishOutcome | null>(null);

  const apply = useCallback(
    (next: GameSession) => {
      setSession(next);
      if (next.status === 'playing') onProgress(next);
      else setFinish(onFinish(next));
    },
    [onProgress, onFinish],
  );

  const guess = useCallback(
    (pokemonId: SpeciesId): GuessOutcome => {
      const { session: next, outcome } = submitGuess(session, pokemonId, new Date().toISOString());
      if (next !== session) apply(next);
      return outcome;
    },
    [session, apply],
  );

  const giveUp = useCallback(() => {
    const next = giveUpSession(session, new Date().toISOString());
    if (next !== session) apply(next);
  }, [session, apply]);

  const view = useMemo(() => getGameView(session), [session]);
  return { session, view, finish, guess, giveUp };
}
