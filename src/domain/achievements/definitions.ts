/**
 * Every achievement, as plain data. To add one, add an entry here: the evaluator, the
 * Achievements page and the unlock toast all read this list, and no screen has its own rules.
 */

export const ACHIEVEMENT_CATEGORIES = [
  'discovery',
  'collection',
  'skill',
  'streak',
  'dedication',
] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  discovery: 'Discovery',
  collection: 'Collection',
  skill: 'Skill',
  streak: 'Streak',
  dedication: 'Dedication',
};

/** Facts about the player's progress. Every achievement is measured from these. */
export interface AchievementContext {
  /** Different Pokémon correctly identified. */
  uniqueDiscoveries: number;
  generation1Discoveries: number;
  /** Most Pokémon discovered that share one type. */
  sameTypeMax: number;
  legendaryDiscoveries: number;
  mythicalDiscoveries: number;
  /** Longest daily streak ever reached. */
  longestStreak: number;
  /** Practice games finished, however they ended. */
  practiceGamesCompleted: number;
  /** Longest run of finished games (Daily and Practice) with no give-up. */
  longestNoGiveUpRun: number;
  /** Daily challenges solved with no wrong guess (a score of 100). */
  perfectDailyGames: number;
  /** Games won with no wrong guess, so no clue unlocked. */
  winsWithoutReveal: number;
  /** Games won after exactly one reveal. */
  winsAfterOneReveal: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  /** A lucide icon name; the UI maps it to the real icon. */
  icon: string;
  /** Progress needed to unlock. */
  target: number;
  /** What the progress counts, e.g. "Pokémon". */
  unit: string;
  /** Progress so far. Only ever grows, so progress never goes backwards. */
  progress(context: AchievementContext): number;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first-discovery',
    title: 'First Discovery',
    description: 'Discover one Pokémon.',
    category: 'discovery',
    icon: 'Sparkles',
    target: 1,
    unit: 'Pokémon',
    progress: (c) => c.uniqueDiscoveries,
  },
  {
    id: 'collector',
    title: 'Collector',
    description: 'Discover 25 unique Pokémon.',
    category: 'collection',
    icon: 'Library',
    target: 25,
    unit: 'Pokémon',
    progress: (c) => c.uniqueDiscoveries,
  },
  {
    id: 'pokedex-pro',
    title: 'Pokédex Pro',
    description: 'Discover 100 unique Pokémon.',
    category: 'collection',
    icon: 'BookOpen',
    target: 100,
    unit: 'Pokémon',
    progress: (c) => c.uniqueDiscoveries,
  },
  {
    id: 'perfect-instinct',
    title: 'Perfect Instinct',
    description: 'Guess correctly without revealing a clue.',
    category: 'skill',
    icon: 'Zap',
    target: 1,
    unit: 'games',
    progress: (c) => c.winsWithoutReveal,
  },
  {
    id: 'sharp-eyes',
    title: 'Sharp Eyes',
    description: 'Guess correctly after exactly one reveal.',
    category: 'skill',
    icon: 'Eye',
    target: 1,
    unit: 'games',
    progress: (c) => c.winsAfterOneReveal,
  },
  {
    id: 'on-fire',
    title: 'On Fire',
    description: 'Reach a three-day daily streak.',
    category: 'streak',
    icon: 'Flame',
    target: 3,
    unit: 'days',
    progress: (c) => c.longestStreak,
  },
  {
    id: 'dedicated-trainer',
    title: 'Dedicated Trainer',
    description: 'Reach a seven-day daily streak.',
    category: 'streak',
    icon: 'CalendarCheck',
    target: 7,
    unit: 'days',
    progress: (c) => c.longestStreak,
  },
  {
    id: 'unstoppable',
    title: 'Unstoppable',
    description: 'Reach a thirty-day daily streak.',
    category: 'streak',
    icon: 'Rocket',
    target: 30,
    unit: 'days',
    progress: (c) => c.longestStreak,
  },
  {
    id: 'generation-1-expert',
    title: 'Generation I Expert',
    description: 'Discover 25 Generation I Pokémon.',
    category: 'collection',
    icon: 'Medal',
    target: 25,
    unit: 'Pokémon',
    progress: (c) => c.generation1Discoveries,
  },
  {
    id: 'type-specialist',
    title: 'Type Specialist',
    description: 'Discover 10 Pokémon of the same type.',
    category: 'collection',
    icon: 'Layers',
    target: 10,
    unit: 'Pokémon',
    progress: (c) => c.sameTypeMax,
  },
  {
    id: 'legendary-hunter',
    title: 'Legendary Hunter',
    description: 'Discover a legendary Pokémon.',
    category: 'discovery',
    icon: 'Crown',
    target: 1,
    unit: 'Pokémon',
    progress: (c) => c.legendaryDiscoveries,
  },
  {
    id: 'mythical-encounter',
    title: 'Mythical Encounter',
    description: 'Discover a mythical Pokémon.',
    category: 'discovery',
    icon: 'Star',
    target: 1,
    unit: 'Pokémon',
    progress: (c) => c.mythicalDiscoveries,
  },
  {
    id: 'practice-makes-perfect',
    title: 'Practice Makes Perfect',
    description: 'Finish 20 practice games.',
    category: 'dedication',
    icon: 'Repeat',
    target: 20,
    unit: 'games',
    progress: (c) => c.practiceGamesCompleted,
  },
  {
    id: 'no-looking-back',
    title: 'No Looking Back',
    description: 'Finish five games in a row without giving up.',
    category: 'dedication',
    icon: 'ShieldCheck',
    target: 5,
    unit: 'games in a row',
    progress: (c) => c.longestNoGiveUpRun,
  },
  {
    id: 'master-detective',
    title: 'Master Detective',
    description: 'Score 100 in five daily challenges.',
    category: 'skill',
    icon: 'Search',
    target: 5,
    unit: 'daily challenges',
    progress: (c) => c.perfectDailyGames,
  },
];

export const ACHIEVEMENT_BY_ID: ReadonlyMap<string, AchievementDefinition> = new Map(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
