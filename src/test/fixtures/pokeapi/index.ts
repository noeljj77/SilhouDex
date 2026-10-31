import type { RawEvolutionChain, RawPokemon, RawSpecies } from '../../../data/pokeapi/rawTypes.ts';
import bulbasaur from './bulbasaur.json';
import ditto from './ditto.json';
import eevee from './eevee.json';
import ivysaur from './ivysaur.json';
import mew from './mew.json';
import sprigatito from './sprigatito.json';

export interface Fixture {
  species: RawSpecies;
  pokemon: RawPokemon;
  chain: RawEvolutionChain | null;
}

const as = (data: unknown) => data as Fixture;

/** Real PokéAPI responses, trimmed to the fields SilhouDex reads. */
export const fixtures = {
  /** Dual type, hidden ability, first of a 3-stage line. */
  bulbasaur: as(bulbasaur),
  /** Middle of a 3-stage line. */
  ivysaur: as(ivysaur),
  /** Does not evolve. */
  ditto: as(ditto),
  /** Branching evolution (8 branches). */
  eevee: as(eevee),
  /** Mythical. */
  mew: as(mew),
  /** Generation 9: no habitat data. */
  sprigatito: as(sprigatito),
};
