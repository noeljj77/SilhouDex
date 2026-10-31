import {
  POKEMON_TYPES,
  STAT_NAMES,
  type EvolutionInfo,
  type Generation,
  type PokemonDetails,
  type PokemonIndexEntry,
  type PokemonType,
  type StatName,
} from '../../domain/pokemon/types.ts';
import type { RawChainLink, RawEvolutionChain, RawPokemon, RawSpecies } from './rawTypes.ts';

const ROMAN_GENERATIONS: Record<string, Generation> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
};

/** "generation-iii" → 3. Throws on anything unexpected rather than guessing. */
export function parseGeneration(slug: string): Generation {
  const roman = /^generation-([a-z]+)$/.exec(slug)?.[1];
  const generation = roman ? ROMAN_GENERATIONS[roman] : undefined;
  if (!generation) throw new Error(`Unrecognised generation "${slug}"`);
  return generation;
}

/** Extracts the numeric id from a PokéAPI resource URL like ".../pokemon-species/25/". */
export function idFromUrl(url: string): number {
  const id = Number(/\/(\d+)\/?$/.exec(url)?.[1]);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Cannot read an id from "${url}"`);
  return id;
}

function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function englishName(species: RawSpecies): string {
  const name = species.names.find((n) => n.language.name === 'en')?.name.trim();
  return name || titleCaseSlug(species.name);
}

function isPokemonType(value: string): value is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(value);
}

function mapTypes(pokemon: RawPokemon): PokemonType[] {
  const types = [...pokemon.types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name)
    .filter(isPokemonType);
  if (types.length < 1 || types.length > 2 || types.length !== pokemon.types.length) {
    throw new Error(`Unexpected types for ${pokemon.name}`);
  }
  return types;
}

/** Builds one bundled index record from the species and its default-form Pokémon. */
export function mapIndexEntry(species: RawSpecies, pokemon: RawPokemon): PokemonIndexEntry {
  const artworkUrl = pokemon.sprites.other?.['official-artwork']?.front_default;
  if (!artworkUrl) throw new Error(`No official artwork for ${species.name}`);
  return {
    id: species.id,
    slug: species.name,
    name: englishName(species),
    generation: parseGeneration(species.generation.name),
    types: mapTypes(pokemon),
    isLegendary: species.is_legendary,
    isMythical: species.is_mythical,
    artworkUrl,
  };
}

function mapStats(pokemon: RawPokemon): Record<StatName, number> {
  const stats = {} as Record<StatName, number>;
  for (const name of STAT_NAMES) {
    const found = pokemon.stats.find((s) => s.stat.name === name);
    if (!found) throw new Error(`Missing stat "${name}" for ${pokemon.name}`);
    stats[name] = found.base_stat;
  }
  return stats;
}

/** Cleans a Pokédex entry: form feeds, soft hyphens and newlines become single spaces. */
export function cleanFlavorText(text: string): string {
  return text
    .replace(/­/g, '')
    .replace(/\s+/g, ' ') // \s covers newlines, form feeds and vertical tabs
    .trim();
}

function mapFlavorTexts(species: RawSpecies): string[] {
  const seen = new Set<string>();
  const texts: string[] = [];
  for (const entry of species.flavor_text_entries) {
    if (entry.language.name !== 'en') continue;
    const text = cleanFlavorText(entry.flavor_text);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    texts.push(text);
  }
  return texts;
}

function chainDepth(link: RawChainLink): number {
  return 1 + Math.max(0, ...link.evolves_to.map(chainDepth));
}

/**
 * Finds a species in an evolution chain. Returns null when the species is not in the chain
 * (bad data) so callers fall back to "no evolution info" instead of guessing.
 */
export function mapEvolution(chain: RawEvolutionChain, speciesId: number): EvolutionInfo | null {
  const totalStages = chainDepth(chain.chain);
  const walk = (
    link: RawChainLink,
    parent: RawChainLink | null,
    stage: number,
  ): EvolutionInfo | null => {
    if (idFromUrl(link.species.url) === speciesId) {
      return {
        stage,
        totalStages,
        evolvesFrom: parent
          ? { id: idFromUrl(parent.species.url), slug: parent.species.name }
          : null,
        evolvesInto: link.evolves_to.map((next) => ({
          id: idFromUrl(next.species.url),
          slug: next.species.name,
        })),
      };
    }
    for (const next of link.evolves_to) {
      const found = walk(next, link, stage + 1);
      if (found) return found;
    }
    return null;
  };
  return walk(chain.chain, null, 1);
}

/** Builds full details. `chain` is null for species with no evolution chain data. */
export function mapDetails(
  species: RawSpecies,
  pokemon: RawPokemon,
  chain: RawEvolutionChain | null,
): PokemonDetails {
  return {
    ...mapIndexEntry(species, pokemon),
    heightDm: pokemon.height,
    weightHg: pokemon.weight,
    stats: mapStats(pokemon),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    evolution: chain ? mapEvolution(chain, species.id) : null,
    flavorTexts: mapFlavorTexts(species),
    habitat: species.habitat?.name ?? null,
    eggGroups: species.egg_groups.map((g) => g.name),
    color: species.color?.name ?? null,
    shape: species.shape?.name ?? null,
  };
}

/** The default-form Pokémon URL for a species. */
export function defaultVarietyUrl(species: RawSpecies): string {
  const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
  if (!variety) throw new Error(`No varieties for ${species.name}`);
  return variety.pokemon.url;
}
