import type { SpeciesId } from '../domain/pokemon/types.ts';

/**
 * Small (~1 KB) front sprite. The Pokédex grid uses it, tinted black, for undiscovered Pokémon,
 * so 1,025 silhouettes cost about 1 MB rather than the 200 MB of full artwork.
 */
export const spriteUrl = (id: SpeciesId): string =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
