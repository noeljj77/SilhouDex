/** National Pokédex number of a species (1–1025). Key for discoveries and daily selection. */
export type SpeciesId = number;

export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;
export type PokemonType = (typeof POKEMON_TYPES)[number];

export const STAT_NAMES = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const;
export type StatName = (typeof STAT_NAMES)[number];

/** Generations I–IX. */
export type Generation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Compact record bundled with the app. Powers search, Pokédex filters and daily selection. */
export interface PokemonIndexEntry {
  id: SpeciesId;
  /** Lowercase PokéAPI species name, e.g. "mr-mime". */
  slug: string;
  /** English display name, e.g. "Mr. Mime". */
  name: string;
  generation: Generation;
  /** One or two types of the default form. */
  types: PokemonType[];
  isLegendary: boolean;
  isMythical: boolean;
  artworkUrl: string;
}

export interface PokemonAbility {
  name: string;
  hidden: boolean;
}

export interface EvolutionRef {
  id: SpeciesId;
  /** Lowercase PokéAPI species slug. Look up the display name in the Pokédex index. */
  slug: string;
}

/** Where a species sits in its evolution chain. Null on PokemonDetails when there is no chain data. */
export interface EvolutionInfo {
  /** 1 = basic stage, 2 = first evolution, … */
  stage: number;
  /** Longest path length in the chain (1 = the species does not evolve). */
  totalStages: number;
  evolvesFrom: EvolutionRef | null;
  evolvesInto: EvolutionRef[];
}

/** Full data for one species, fetched at runtime for the current challenge, then cached. */
export interface PokemonDetails extends PokemonIndexEntry {
  /** Decimetres, as PokéAPI reports it. */
  heightDm: number;
  /** Hectograms, as PokéAPI reports it. */
  weightHg: number;
  stats: Record<StatName, number>;
  abilities: PokemonAbility[];
  evolution: EvolutionInfo | null;
  /** English Pokédex entries, de-duplicated and whitespace-cleaned. May be empty. */
  flavorTexts: string[];
  habitat: string | null;
  eggGroups: string[];
  color: string | null;
  shape: string | null;
}
