/**
 * Normalises a Pokémon name or a player's typed guess for comparison and search.
 * "Flabébé" → "flabebe", "Farfetch'd" → "farfetchd", "Nidoran♀" → "nidoranf",
 * "Mr. Mime" → "mrmime", "type-null" → "typenull".
 */
export function normalizeName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // strip accents
    .replace(/♀/g, 'f')
    .replace(/♂/g, 'm')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
