import { normalizeName } from '../../lib/normalize.ts';
import type { PokemonDetails } from '../pokemon/types.ts';
import type { ClueText } from './types.ts';

/** Placeholder shown where a Pokédex entry named the Pokémon. */
export const NAME_MASK = '▮▮▮▮▮';

/** Names a clue must never contain: the display name and the slug spelling. */
function forbiddenKeys(pokemon: PokemonDetails): string[] {
  return [...new Set([normalizeName(pokemon.name), normalizeName(pokemon.slug)])].filter(Boolean);
}

/**
 * True when a clue does not give away the name. Punctuation, accents and spacing are ignored,
 * so "F A R F E T C H ' D" or "farfetch’d" are caught too. It can reject a harmless clue when a
 * short name happens to sit inside another word; the engine then simply picks another clue.
 */
export function isClueSafe(clue: ClueText, pokemon: PokemonDetails): boolean {
  const haystack = normalizeName(`${clue.title} ${clue.body}`);
  return forbiddenKeys(pokemon).every((key) => !haystack.includes(key));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replaces the Pokémon's own name inside a Pokédex entry. */
export function maskName(text: string, pokemon: PokemonDetails): string {
  const variants = new Set([pokemon.name, pokemon.slug, pokemon.slug.replace(/-/g, ' ')]);
  const pattern = [...variants]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  // Accent-insensitive: also mask the accent-stripped spelling (Flabébé → Flabebe).
  const plain = pokemon.name.normalize('NFD').replace(/\p{M}/gu, '');
  const all = plain !== pokemon.name ? `${pattern}|${escapeRegExp(plain)}` : pattern;
  return text.replace(new RegExp(all, 'giu'), NAME_MASK);
}
