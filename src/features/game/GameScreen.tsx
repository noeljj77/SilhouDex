import { useMemo, useState, type ReactNode } from 'react';
import { pokedexIndex } from '../../data/pokedexIndex.ts';
import { DEFAULT_DIFFICULTY, type DifficultyLevel } from '../../domain/clues/difficulty.ts';
import { generateClues } from '../../domain/clues/engine.ts';
import type { GuessOutcome } from '../../domain/game/engine.ts';
import { CLUES_PER_GAME } from '../../domain/game/config.ts';
import type { GameResult, GameView, Guess } from '../../domain/game/types.ts';
import type { SpeciesId } from '../../domain/pokemon/types.ts';
import { computeRevealOrder } from '../../domain/reveal/mask.ts';
import { ClueList } from './ClueList.tsx';
import { GuessHistory } from './GuessHistory.tsx';
import { GuessInput } from './GuessInput.tsx';
import { ResultPanel } from './ResultPanel.tsx';
import { ScoreMeter } from './ScoreMeter.tsx';
import { SilhouetteStage } from './silhouette/SilhouetteStage.tsx';
import { useSilhouette } from './silhouette/useSilhouette.ts';
import { usePokemonDetails } from './usePokemonDetails.ts';

export interface GameScreenProps {
  pokemonId: SpeciesId;
  /** Fixes which clues and which reveal pattern this game uses. */
  seed: string;
  difficulty?: DifficultyLevel;
  view: GameView;
  guesses: readonly Guess[];
  /** Set once the game is over. */
  finished: { result: GameResult; isNewDiscovery: boolean } | null;
  onGuess(pokemonId: SpeciesId): GuessOutcome;
  onGiveUp(): void;
  /** Shown inside the result panel (countdown, links, …). */
  resultFooter?: ReactNode;
}

const displayName = (ref: { id: number; slug: string }) =>
  pokedexIndex.getById(ref.id)?.name ?? ref.slug;

/** The play area shared by Daily and Practice: silhouette, score, guess box, clues and result. */
export function GameScreen({
  pokemonId,
  seed,
  difficulty = DEFAULT_DIFFICULTY,
  view,
  guesses,
  finished,
  onGuess,
  onGiveUp,
  resultFooter,
}: GameScreenProps) {
  const entry = pokedexIndex.getById(pokemonId);
  if (!entry) throw new Error(`Unknown Pokémon #${pokemonId}`);

  const silhouette = useSilhouette(entry.artworkUrl);
  const details = usePokemonDetails(pokemonId);
  const artwork = silhouette.status === 'ready' ? silhouette.artwork : undefined;
  const order = useMemo(
    () =>
      artwork
        ? computeRevealOrder(
            { alpha: artwork.alpha, width: artwork.alphaWidth, height: artwork.alphaHeight },
            `${seed}|${pokemonId}`,
          )
        : undefined,
    [artwork, seed, pokemonId],
  );
  const clues = useMemo(() => {
    if (details.status !== 'ready') return [];
    try {
      return generateClues(details.details, { seed, difficulty, displayName });
    } catch {
      return []; // the game stays playable without clues
    }
  }, [details, seed, difficulty]);

  const status =
    silhouette.status === 'error' || details.status === 'error'
      ? 'error'
      : silhouette.status === 'ready' && details.status === 'ready'
        ? 'ready'
        : 'loading';
  const retry = () => {
    if (silhouette.status === 'error') silhouette.retry();
    if (details.status === 'error') details.retry();
  };
  const guessedIds = useMemo(() => new Set(guesses.map((g) => g.pokemonId)), [guesses]);

  return (
    // On phones everything is one column ordered: picture, guess box, score, clues, so the guess
    // box is never far below the picture. On large screens it becomes two columns.
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,28rem)_1fr] lg:gap-6">
      <div className="contents lg:flex lg:flex-col lg:gap-4">
        <div className="order-1 lg:order-none">
          <SilhouetteStage
            status={status}
            artwork={artwork}
            order={order}
            stage={view.revealStage}
            solved={view.isOver}
            onRetry={retry}
          />
        </div>
        <div className="order-3 lg:order-none">
          <ScoreMeter view={view} />
        </div>
      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-5">
        <div className="order-2 lg:order-none">
          {finished ? (
            <ResultPanel
              result={finished.result}
              entry={entry}
              isNewDiscovery={finished.isNewDiscovery}
            >
              {resultFooter}
            </ResultPanel>
          ) : (
            <section aria-label="Make a guess" className="flex flex-col gap-3">
              <GuessInput disabled={status !== 'ready'} guessedIds={guessedIds} onGuess={onGuess} />
              <GuessHistory guesses={guesses} />
              <GiveUp disabled={status !== 'ready'} onConfirm={onGiveUp} />
            </section>
          )}
        </div>
        <div className="order-4 flex flex-col gap-3 lg:order-none">
          <ClueList clues={clues} unlocked={view.isOver ? CLUES_PER_GAME : view.cluesUnlocked} />
          {details.status === 'ready' && clues.length === 0 && (
            <p className="text-sm text-violet-200/70">Clues are not available for this Pokémon.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function GiveUp({ disabled, onConfirm }: { disabled: boolean; onConfirm(): void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setConfirming(true)}
        className="w-fit text-sm text-white/50 underline-offset-4 hover:text-white hover:underline disabled:opacity-40"
      >
        Give up
      </button>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-label="Confirm giving up"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100"
    >
      <span>Give up? You score 0 and the answer is revealed.</span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-red-500 px-3 py-1.5 font-bold text-white hover:bg-red-400"
        >
          Yes, reveal it
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-white/20 px-3 py-1.5 text-white hover:bg-white/10"
        >
          Keep playing
        </button>
      </span>
    </div>
  );
}
