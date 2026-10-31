import { createRng } from '../../lib/prng.ts';
import { CLUES_PER_GAME } from '../game/config.ts';
import type { EvolutionRef, PokemonDetails } from '../pokemon/types.ts';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_PROFILES,
  fallbackOrder,
  type DifficultyLevel,
} from './difficulty.ts';
import { CLUE_PROVIDERS } from './providers.ts';
import { isClueSafe } from './safety.ts';
import type { Clue, ClueCategory, ClueDifficulty, ClueProvider } from './types.ts';

export interface GenerateCluesOptions {
  /** Same seed → same clues. Use the daily seed, or the practice session id. */
  seed: string;
  difficulty?: DifficultyLevel;
  /** Display name for evolution relatives (look it up in the Pokédex index). */
  displayName(ref: EvolutionRef): string;
  /** Override the provider list (used by tests and future modes). */
  providers?: readonly ClueProvider[];
}

/**
 * Picks five clues for a Pokémon, vague to strong. Rules:
 *  - one clue per category, so no two clues repeat the same fact;
 *  - a clue is skipped when the Pokémon lacks the data (no habitat, no evolution, …);
 *  - a clue is skipped when its text contains the Pokémon's name;
 *  - if a slot has nothing usable, it falls back to a nearby strength.
 */
export function generateClues(pokemon: PokemonDetails, options: GenerateCluesOptions): Clue[] {
  const rng = createRng(`${options.seed}|clues|${pokemon.id}`);
  const providers = options.providers ?? CLUE_PROVIDERS;
  const slots = DIFFICULTY_PROFILES[options.difficulty ?? DEFAULT_DIFFICULTY];
  const context = { rng, displayName: options.displayName };

  const usedCategories = new Set<ClueCategory>();
  const usedBodies = new Set<string>();
  const clues: Clue[] = [];

  const fill = (level: ClueDifficulty): Clue | null => {
    const candidates = providers.filter(
      (p) => p.difficulty === level && !usedCategories.has(p.category) && p.applies(pokemon),
    );
    while (candidates.length > 0) {
      const provider = candidates.splice(rng.int(candidates.length), 1)[0] as ClueProvider;
      const text = provider.build(pokemon, context);
      if (!isClueSafe(text, pokemon) || usedBodies.has(text.body)) continue;
      return {
        id: provider.id,
        category: provider.category,
        difficulty: provider.difficulty,
        ...text,
      };
    }
    return null;
  };

  for (const wanted of slots) {
    let clue: Clue | null = null;
    for (const level of fallbackOrder(wanted)) {
      clue = fill(level);
      if (clue) break;
    }
    if (!clue) continue;
    usedCategories.add(clue.category);
    usedBodies.add(clue.body);
    clues.push(clue);
  }

  if (clues.length < CLUES_PER_GAME) {
    throw new Error(`Only ${clues.length} usable clues for ${pokemon.slug}`);
  }
  return clues;
}
