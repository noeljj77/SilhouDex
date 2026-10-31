import { POKEMON_TYPES, type PokemonIndexEntry } from '../domain/pokemon/types.ts';
import { normalizeName } from '../lib/normalize.ts';

/** Returns a list of human-readable problems. An empty list means the index is valid. */
export function validateIndex(entries: readonly PokemonIndexEntry[]): string[] {
  const problems: string[] = [];
  if (entries.length === 0) return ['Index is empty'];

  const slugs = new Set<string>();
  const normalizedNames = new Map<string, number>();

  entries.forEach((entry, i) => {
    const label = `#${entry.id} ${entry.slug}`;
    if (entry.id !== i + 1)
      problems.push(`${label}: expected id ${i + 1} (ids must be 1..N in order)`);
    if (!entry.slug) problems.push(`${label}: empty slug`);
    if (slugs.has(entry.slug)) problems.push(`${label}: duplicate slug`);
    slugs.add(entry.slug);

    if (!entry.name.trim()) problems.push(`${label}: empty name`);
    const key = normalizeName(entry.name);
    if (!key) problems.push(`${label}: name normalises to an empty string`);
    const clash = normalizedNames.get(key);
    if (clash !== undefined)
      problems.push(`${label}: name clashes with #${clash} after normalising`);
    normalizedNames.set(key, entry.id);

    if (!Number.isInteger(entry.generation) || entry.generation < 1 || entry.generation > 9) {
      problems.push(`${label}: invalid generation ${entry.generation}`);
    }
    if (entry.types.length < 1 || entry.types.length > 2) {
      problems.push(`${label}: must have 1 or 2 types`);
    }
    if (new Set(entry.types).size !== entry.types.length) problems.push(`${label}: repeated type`);
    for (const type of entry.types) {
      if (!(POKEMON_TYPES as readonly string[]).includes(type)) {
        problems.push(`${label}: unknown type "${type}"`);
      }
    }
    if (entry.isLegendary && entry.isMythical)
      problems.push(`${label}: both legendary and mythical`);
    if (!/^https:\/\/.+\.png$/.test(entry.artworkUrl)) {
      problems.push(`${label}: artwork URL is not an https .png`);
    }
  });

  return problems;
}
