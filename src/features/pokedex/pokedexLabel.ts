/**
 * The accessible name of a Pokédex tile and its details dialog. It starts with the number exactly as
 * the tile shows it (#0004), so people who control the page by voice can say what they see.
 * An undiscovered Pokémon is described as such and never named.
 */
export function pokedexLabel(id: number, discoveredName?: string): string {
  const number = `#${String(id).padStart(4, '0')}`;
  return `${number} ${discoveredName ?? 'undiscovered'}`;
}
