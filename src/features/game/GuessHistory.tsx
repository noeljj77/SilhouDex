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
        <li
          key={g.pokemonId}
          className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-sm text-red-200"
        >
          <X size={14} aria-hidden />
          {pokedexIndex.getById(g.pokemonId)?.name ?? `#${g.pokemonId}`}
        </li>
      ))}
    </ul>
  );
}
