/** Minimal subsets of the PokéAPI v2 responses SilhouDex reads. */

export interface NamedRef {
  name: string;
  url: string;
}

export interface RawSpeciesList {
  count: number;
  results: NamedRef[];
}

export interface RawSpecies {
  id: number;
  name: string;
  is_legendary: boolean;
  is_mythical: boolean;
  generation: NamedRef;
  names: { name: string; language: { name: string } }[];
  varieties: { is_default: boolean; pokemon: NamedRef }[];
  habitat: { name: string } | null;
  egg_groups: { name: string }[];
  color: { name: string } | null;
  shape: { name: string } | null;
  evolution_chain: { url: string } | null;
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
}

export interface RawPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  abilities: { is_hidden: boolean; slot: number; ability: { name: string } }[];
  sprites: {
    other?: {
      'official-artwork'?: { front_default: string | null };
    };
  };
}

export interface RawChainLink {
  species: NamedRef;
  evolves_to: RawChainLink[];
}

export interface RawEvolutionChain {
  id: number;
  chain: RawChainLink;
}
