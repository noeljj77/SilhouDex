import type { PokemonDetails, SpeciesId } from '../domain/pokemon/types.ts';
import { createDetailsCache, type DetailsCache } from './pokeapi/cache.ts';
import { createPokeApiClient, type PokeApiClient } from './pokeapi/client.ts';
import { mapDetails } from './pokeapi/mappers.ts';

export interface PokemonRepository {
  /** Memory → LocalStorage → network. Concurrent calls for one id share a single request. */
  getDetails(id: SpeciesId): Promise<PokemonDetails>;
}

export interface PokemonRepositoryDeps {
  client?: PokeApiClient;
  cache?: DetailsCache;
}

export function createPokemonRepository(deps: PokemonRepositoryDeps = {}): PokemonRepository {
  const client = deps.client ?? createPokeApiClient();
  const cache = deps.cache ?? createDetailsCache();
  const memory = new Map<SpeciesId, PokemonDetails>();
  const inFlight = new Map<SpeciesId, Promise<PokemonDetails>>();

  return {
    async getDetails(id) {
      const hit = memory.get(id) ?? cache.get(id);
      if (hit) {
        memory.set(id, hit);
        return hit;
      }

      let pending = inFlight.get(id);
      if (!pending) {
        pending = client
          .getBundle(id)
          .then(({ species, pokemon, chain }) => {
            const details = mapDetails(species, pokemon, chain);
            memory.set(id, details);
            cache.set(id, details);
            return details;
          })
          .finally(() => inFlight.delete(id));
        inFlight.set(id, pending);
      }
      return pending;
    },
  };
}
