import type { PokemonDetails, StatName } from '../pokemon/types.ts';
import { maskName } from './safety.ts';
import type { ClueProvider } from './types.ts';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'] as const;

const STAT_LABELS: Record<StatName, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Special Attack',
  'special-defense': 'Special Defense',
  speed: 'Speed',
};

const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
/** "waters-edge" → "Waters Edge". */
const label = (slug: string) => slug.split('-').map(cap).join(' ');

const metres = (dm: number) => `${(dm / 10).toFixed(1)} m`;
const kilograms = (hg: number) => `${(hg / 10).toFixed(1)} kg`;

const baseStatTotal = (p: PokemonDetails) => Object.values(p.stats).reduce((a, b) => a + b, 0);

function band(
  value: number,
  edges: number[],
  format: (lo: number | null, hi: number | null) => string,
) {
  const i = edges.findIndex((edge) => value < edge);
  if (i === -1) return format(edges[edges.length - 1] ?? null, null);
  return format(i === 0 ? null : (edges[i - 1] ?? null), edges[i] ?? null);
}

function describeBand(lo: number | null, hi: number | null, unit: string): string {
  if (lo === null) return `under ${hi} ${unit}`;
  if (hi === null) return `over ${lo} ${unit}`;
  return `between ${lo} and ${hi} ${unit}`;
}

function topStats(p: PokemonDetails): { names: string[]; max: number } {
  const entries = Object.entries(p.stats) as [StatName, number][];
  const max = Math.max(...entries.map(([, v]) => v));
  return { max, names: entries.filter(([, v]) => v === max).map(([k]) => STAT_LABELS[k]) };
}

const hasEvolution = (p: PokemonDetails) => p.evolution !== null;

/**
 * Every clue the game can show. Each builds only from the Pokémon's own data.
 * Difficulty: 3 = vague, 2 = helpful, 1 = strong.
 */
export const CLUE_PROVIDERS: readonly ClueProvider[] = [
  // ── Difficulty 3: vague ──────────────────────────────────────────────
  {
    id: 'generation',
    category: 'generation',
    difficulty: 3,
    applies: () => true,
    build: (p) => ({
      title: 'Debut',
      body: `First appeared in Generation ${ROMAN[p.generation - 1]}.`,
    }),
  },
  {
    id: 'rarityOrdinary',
    category: 'rarity',
    difficulty: 3,
    applies: (p) => !p.isLegendary && !p.isMythical,
    build: () => ({ title: 'Rarity', body: 'Neither a legendary nor a mythical Pokémon.' }),
  },
  {
    id: 'typeCount',
    category: 'types',
    difficulty: 3,
    applies: () => true,
    build: (p) => ({
      title: 'Typing',
      body: p.types.length === 1 ? 'It has a single type.' : 'It has two types.',
    }),
  },
  {
    id: 'abilityCount',
    category: 'abilities',
    difficulty: 3,
    applies: (p) => p.abilities.length > 0,
    build: (p) => {
      const n = p.abilities.length;
      const hidden = p.abilities.some((a) => a.hidden);
      return {
        title: 'Abilities',
        body: `It can have ${n === 1 ? 'one possible ability' : `${n} possible abilities`}${hidden ? ', one of them hidden' : ''}.`,
      };
    },
  },
  {
    id: 'evolutionLine',
    category: 'evolution',
    difficulty: 3,
    applies: hasEvolution,
    build: (p) => {
      const total = p.evolution?.totalStages ?? 1;
      return {
        title: 'Evolution',
        body:
          total === 1 ? 'It does not evolve.' : `Part of an evolution line with ${total} stages.`,
      };
    },
  },
  {
    id: 'sizeBand',
    category: 'size',
    difficulty: 3,
    applies: () => true,
    build: (p, { rng }) => {
      if (rng.int(2) === 0) {
        const height = band(p.heightDm / 10, [0.5, 1, 2, 4], (lo, hi) => describeBand(lo, hi, 'm'));
        return { title: 'Height', body: `Stands ${height} tall.` };
      }
      const weight = band(p.weightHg / 10, [5, 25, 100, 300], (lo, hi) =>
        describeBand(lo, hi, 'kg'),
      );
      return { title: 'Weight', body: `Weighs ${weight}.` };
    },
  },
  {
    id: 'statTotalBand',
    category: 'stats',
    difficulty: 3,
    applies: () => true,
    build: (p) => {
      const hundreds = Math.floor(baseStatTotal(p) / 100) * 100;
      return { title: 'Power', body: `Its base stats add up to somewhere in the ${hundreds}s.` };
    },
  },
  {
    id: 'color',
    category: 'color',
    difficulty: 3,
    applies: (p) => p.color !== null,
    build: (p) => ({ title: 'Colour', body: `The Pokédex lists its colour as ${p.color}.` }),
  },

  // ── Difficulty 2: helpful ────────────────────────────────────────────
  {
    id: 'rarityLegendary',
    category: 'rarity',
    difficulty: 2,
    applies: (p) => p.isLegendary || p.isMythical,
    build: (p) => ({
      title: 'Rarity',
      body: p.isMythical ? 'It is a mythical Pokémon.' : 'It is a legendary Pokémon.',
    }),
  },
  {
    id: 'typePrimary',
    category: 'types',
    difficulty: 2,
    applies: () => true,
    build: (p, { rng }) => ({
      title: 'Typing',
      body:
        p.types.length === 1
          ? `Its type is ${cap(p.types[0] as string)}.`
          : `One of its types is ${cap(rng.pick(p.types))}.`,
    }),
  },
  {
    id: 'abilityOne',
    category: 'abilities',
    difficulty: 2,
    applies: (p) => p.abilities.some((a) => !a.hidden),
    build: (p, { rng }) => ({
      title: 'Ability',
      body: `One of its abilities is ${label(rng.pick(p.abilities.filter((a) => !a.hidden)).name)}.`,
    }),
  },
  {
    id: 'evolutionPosition',
    category: 'evolution',
    difficulty: 2,
    applies: (p) => p.evolution !== null && p.evolution.totalStages > 1,
    build: (p) => {
      const evo = p.evolution;
      if (evo && !evo.evolvesFrom)
        return { title: 'Evolution', body: 'It is the first stage of its evolution line.' };
      if (evo && evo.evolvesInto.length === 0)
        return { title: 'Evolution', body: 'It is the final stage of its evolution line.' };
      return { title: 'Evolution', body: 'It is a middle stage of its evolution line.' };
    },
  },
  {
    id: 'topStat',
    category: 'stats',
    difficulty: 2,
    // A tie between three or more stats says nothing useful, so skip it.
    applies: (p) => topStats(p).names.length <= 2,
    build: (p) => {
      const { names, max } = topStats(p);
      return {
        title: 'Strength',
        body: `Its highest base stat is ${names.join(' and ')} (${max}).`,
      };
    },
  },
  {
    id: 'shape',
    category: 'shape',
    difficulty: 2,
    applies: (p) => p.shape !== null,
    build: (p) => ({
      title: 'Body shape',
      body: `The Pokédex classes its body shape as ${label(p.shape ?? '')}.`,
    }),
  },
  {
    id: 'habitat',
    category: 'habitat',
    difficulty: 2,
    applies: (p) => p.habitat !== null,
    build: (p) => ({ title: 'Habitat', body: `Its Pokédex habitat is ${label(p.habitat ?? '')}.` }),
  },
  {
    id: 'eggGroup',
    category: 'eggGroup',
    difficulty: 2,
    applies: (p) => p.eggGroups.length > 0,
    build: (p) => {
      const groups = p.eggGroups.map((g) => (g === 'no-eggs' ? 'Undiscovered' : label(g)));
      return {
        title: 'Egg groups',
        body: `Egg group${groups.length > 1 ? 's' : ''}: ${groups.join(' and ')}.`,
      };
    },
  },

  // ── Difficulty 1: strong ─────────────────────────────────────────────
  {
    id: 'typeFull',
    category: 'types',
    difficulty: 1,
    applies: () => true,
    build: (p) => ({ title: 'Typing', body: `Type: ${p.types.map(cap).join(' / ')}.` }),
  },
  {
    id: 'abilityHidden',
    category: 'abilities',
    difficulty: 1,
    applies: (p) => p.abilities.some((a) => a.hidden),
    build: (p) => ({
      title: 'Hidden ability',
      body: `Its hidden ability is ${label(p.abilities.find((a) => a.hidden)?.name ?? '')}.`,
    }),
  },
  {
    id: 'evolutionRelatives',
    category: 'evolution',
    difficulty: 1,
    applies: (p) =>
      p.evolution !== null &&
      (p.evolution.evolvesFrom !== null || p.evolution.evolvesInto.length > 0),
    build: (p, { displayName }) => {
      const evo = p.evolution;
      const parts: string[] = [];
      if (evo?.evolvesFrom) parts.push(`It evolves from ${displayName(evo.evolvesFrom)}.`);
      const into = evo?.evolvesInto ?? [];
      if (into.length > 3) parts.push(`It can evolve into ${into.length} different Pokémon.`);
      else if (into.length > 0) {
        const names = into.map(displayName);
        const list =
          names.length > 1
            ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
            : (names[0] ?? '');
        parts.push(`It evolves into ${list}.`);
      }
      return { title: 'Evolution', body: parts.join(' ') };
    },
  },
  {
    id: 'sizeExact',
    category: 'size',
    difficulty: 1,
    applies: () => true,
    build: (p) => ({
      title: 'Size',
      body: `Height ${metres(p.heightDm)}, weight ${kilograms(p.weightHg)}.`,
    }),
  },
  {
    id: 'statSpread',
    category: 'stats',
    difficulty: 1,
    applies: () => true,
    build: (p) => ({
      title: 'Base stats',
      body:
        (Object.entries(p.stats) as [StatName, number][])
          .map(([k, v]) => `${STAT_LABELS[k]} ${v}`)
          .join(', ') + '.',
    }),
  },
  {
    id: 'pokedexEntry',
    category: 'pokedex',
    difficulty: 1,
    applies: (p) => p.flavorTexts.length > 0,
    build: (p, { rng }) => ({ title: 'Pokédex entry', body: maskName(rng.pick(p.flavorTexts), p) }),
  },
];
