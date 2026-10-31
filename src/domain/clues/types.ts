import type { Rng } from '../../lib/prng.ts';
import type { EvolutionRef, PokemonDetails } from '../pokemon/types.ts';

/** How strongly a clue narrows things down. 3 = vague, 1 = strong. */
export type ClueDifficulty = 1 | 2 | 3;

/** A game never shows two clues from the same category, so clues never repeat each other. */
export type ClueCategory =
  | 'generation'
  | 'rarity'
  | 'types'
  | 'abilities'
  | 'evolution'
  | 'size'
  | 'stats'
  | 'color'
  | 'shape'
  | 'habitat'
  | 'eggGroup'
  | 'pokedex';

export interface Clue {
  /** The provider that produced it, e.g. "typeFull". */
  id: string;
  category: ClueCategory;
  difficulty: ClueDifficulty;
  title: string;
  body: string;
}

export interface ClueContext {
  rng: Rng;
  /** Display name for a related species (evolution relatives). */
  displayName(ref: EvolutionRef): string;
}

export interface ClueText {
  title: string;
  body: string;
}

/** One kind of clue. Add a new provider to the list and the engine picks it up. */
export interface ClueProvider {
  id: string;
  category: ClueCategory;
  difficulty: ClueDifficulty;
  /** False when the Pokémon lacks the data this clue needs. */
  applies(pokemon: PokemonDetails): boolean;
  build(pokemon: PokemonDetails, context: ClueContext): ClueText;
}
