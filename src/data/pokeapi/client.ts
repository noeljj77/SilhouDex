import type { SpeciesId } from '../../domain/pokemon/types.ts';
import { defaultVarietyUrl, idFromUrl } from './mappers.ts';
import type { RawEvolutionChain, RawPokemon, RawSpecies } from './rawTypes.ts';

export const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

export class PokeApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'PokeApiError';
  }
}

export interface PokeApiClientOptions {
  fetch?: typeof fetch;
  baseUrl?: string;
  /** Total attempts per request, including the first. */
  maxAttempts?: number;
  /** Base delay between attempts; grows with each retry. Tests set this to 0. */
  retryDelayMs?: number;
}

export interface RawPokemonBundle {
  species: RawSpecies;
  pokemon: RawPokemon;
  /** Null when the species has no evolution chain, or the chain could not be loaded. */
  chain: RawEvolutionChain | null;
}

export interface PokeApiClient {
  /** Fetches the three resources for one species: 2 requests in parallel, then the chain. */
  getBundle(id: SpeciesId): Promise<RawPokemonBundle>;
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

export function createPokeApiClient(options: PokeApiClientOptions = {}): PokeApiClient {
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const baseUrl = options.baseUrl ?? POKEAPI_BASE;
  const maxAttempts = options.maxAttempts ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 400;

  async function getJson<T>(url: string): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await doFetch(url);
        if (res.ok) return (await res.json()) as T;
        if (!RETRYABLE.has(res.status)) {
          throw new PokeApiError(`PokéAPI responded ${res.status} for ${url}`, res.status);
        }
        lastError = new PokeApiError(`PokéAPI responded ${res.status} for ${url}`, res.status);
      } catch (error) {
        // Non-retryable HTTP errors are final; network failures (TypeError) are retried.
        if (error instanceof PokeApiError && !RETRYABLE.has(error.status ?? 0)) throw error;
        lastError = error;
      }
      if (attempt < maxAttempts && retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
      }
    }
    throw lastError instanceof Error ? lastError : new PokeApiError(`Request failed: ${url}`);
  }

  return {
    async getBundle(id) {
      const species = await getJson<RawSpecies>(`${baseUrl}/pokemon-species/${id}`);
      const pokemonUrl = defaultVarietyUrl(species);
      // Only trust the URL's path, so a changed host in the payload cannot redirect requests.
      const pokemon = await getJson<RawPokemon>(`${baseUrl}/pokemon/${idFromUrl(pokemonUrl)}`);

      let chain: RawEvolutionChain | null = null;
      if (species.evolution_chain) {
        // A missing chain just means "no evolution info"; it must not block the game.
        chain = await getJson<RawEvolutionChain>(
          `${baseUrl}/evolution-chain/${idFromUrl(species.evolution_chain.url)}`,
        ).catch(() => null);
      }
      return { species, pokemon, chain };
    },
  };
}
