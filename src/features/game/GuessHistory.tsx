import { X } from 'lucide-react';
import { pokedexIndex } from '../../data/pokedexIndex.ts';
import type { Guess } from '../../domain/game/types.ts';

/** The wrong guesses so far, as chips. */
export function GuessHistory({ guesses }: { guesses: readonly Guess[] }) {
  const wrong = guesses.filter((g) => !g.correct);
  if (wrong.length === 0) return null;
  return (
    <ul aria-label="Wrong guesses" className="flex flex-wrap gap-2">
      {wrong.map((g) => (
        <li key={g.pokemonId} className="dex-chip !border-dex bg-[#fff1f1] !text-dex-dark">
          <X size={14} aria-hidden />
          {pokedexIndex.getById(g.pokemonId)?.name ?? `#${g.pokemonId}`}
        </li>
      ))}
    </ul>
  );
}
