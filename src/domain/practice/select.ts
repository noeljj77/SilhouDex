import type { Rng } from '../../lib/prng.ts';
import type { GameResult } from '../game/types.ts';
import type { Generation, PokemonIndexEntry, SpeciesId } from '../pokemon/types.ts';

/** How many of the most recent practice Pokémon are skipped, so rounds do not repeat quickly. */
export const RECENT_PRACTICE_MEMORY = 20;

/** Pokémon from the last few practice rounds, newest last. */
export function recentPracticeIds(results: readonly GameResult[]): SpeciesId[] {
  return results.slice(-RECENT_PRACTICE_MEMORY).map((r) => r.pokemonId);
}

/** The ids Practice may pick from: Pokémon of the chosen generations only. */
export function practicePool(
  entries: readonly PokemonIndexEntry[],
  generations: readonly Generation[],
): SpeciesId[] {
  const wanted = new Set<Generation>(generations);
  return entries.filter((e) => wanted.has(e.generation)).map((e) => e.id);
}

/**
 * Picks the next practice Pokémon at random.
 *  - `excluded` is never picked (use it for today's daily answer, so practice cannot reveal it);
 *  - `recent` is avoided while anything else is left.
 */
export function pickPracticePokemonId(
  rng: Rng,
  allIds: readonly SpeciesId[],
  recent: readonly SpeciesId[] = [],
  excluded: readonly SpeciesId[] = [],
): SpeciesId {
  const blocked = new Set(excluded);
  const eligible = allIds.filter((id) => !blocked.has(id));
  if (eligible.length === 0) throw new RangeError('There are no Pokémon to practise with');
  const avoid = new Set(recent);
  const fresh = eligible.filter((id) => !avoid.has(id));
  return rng.pick(fresh.length > 0 ? fresh : eligible);
}
