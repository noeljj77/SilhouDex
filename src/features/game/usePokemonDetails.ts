import { useCallback, useEffect, useState } from 'react';
import { pokemonRepository } from '../../data/defaultRepository.ts';
import type { PokemonDetails, SpeciesId } from '../../domain/pokemon/types.ts';

export type DetailsState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; details: PokemonDetails };

interface Settled {
  id: SpeciesId;
  attempt: number;
  result: { status: 'error' } | { status: 'ready'; details: PokemonDetails };
}

/** Loads the full data for a Pokémon (used for clues). `retry` tries again after an error. */
export function usePokemonDetails(id: SpeciesId): DetailsState & { retry(): void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    let cancelled = false;
    pokemonRepository.getDetails(id).then(
      (details) => !cancelled && setSettled({ id, attempt, result: { status: 'ready', details } }),
      () => !cancelled && setSettled({ id, attempt, result: { status: 'error' } }),
    );
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const current =
    settled && settled.id === id && settled.attempt === attempt ? settled.result : null;
  return { ...(current ?? { status: 'loading' as const }), retry };
}
