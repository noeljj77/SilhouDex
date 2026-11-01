/** Badge colours per Pokémon type: a background and a text colour that stay readable together. */
const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  normal: { bg: '#a8a878', fg: '#1b2236' },
  fire: { bg: '#f08030', fg: '#1b2236' },
  water: { bg: '#6890f0', fg: '#1b2236' },
  electric: { bg: '#f8d030', fg: '#1b2236' },
  grass: { bg: '#78c850', fg: '#1b2236' },
  ice: { bg: '#98d8d8', fg: '#1b2236' },
  fighting: { bg: '#c03028', fg: '#ffffff' },
  poison: { bg: '#a040a0', fg: '#ffffff' },
  ground: { bg: '#e0c068', fg: '#1b2236' },
  flying: { bg: '#a890f0', fg: '#1b2236' },
  psychic: { bg: '#f85888', fg: '#1b2236' },
  bug: { bg: '#a8b820', fg: '#1b2236' },
  rock: { bg: '#b8a038', fg: '#1b2236' },
  ghost: { bg: '#705898', fg: '#ffffff' },
  dragon: { bg: '#7038f8', fg: '#ffffff' },
  dark: { bg: '#4a3a30', fg: '#ffffff' },
  steel: { bg: '#b8b8d0', fg: '#1b2236' },
  fairy: { bg: '#ee99ac', fg: '#1b2236' },
};

const FALLBACK = { bg: '#c5cfe0', fg: '#1b2236' };

export function typeStyle(type: string): { backgroundColor: string; color: string } {
  const { bg, fg } = TYPE_COLORS[type.toLowerCase()] ?? FALLBACK;
  return { backgroundColor: bg, color: fg };
}
