import { createPokemonRepository } from './pokemonRepository.ts';

/** The app-wide Pokémon details loader (memory → LocalStorage → PokéAPI). Tests mock this module. */
export const pokemonRepository = createPokemonRepository();
