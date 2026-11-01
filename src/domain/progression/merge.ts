import type { GameResult } from '../game/types.ts';
import { PRACTICE_RESULTS_CAP } from './record.ts';
import type { AchievementState, Discovery, ProgressData } from './types.ts';

const earlier = (a: string, b: string) => (a <= b ? a : b);
const later = (a: string, b: string) => (a >= b ? a : b);

function mergeDiscovery(a: Discovery, b: Discovery): Discovery {
  return {
    pokemonId: a.pokemonId,
    firstDiscoveredAt: earlier(a.firstDiscoveredAt, b.firstDiscoveredAt),
    lastDiscoveredAt: later(a.lastDiscoveredAt, b.lastDiscoveredAt),
    // Both sides may already include the same games, so adding would double count.
    timesDiscovered: Math.max(a.timesDiscovered, b.timesDiscovered),
    modes: [...new Set([...a.modes, ...b.modes])],
  };
}

function mergeAchievement(a: AchievementState, b: AchievementState): AchievementState {
  if (a.unlockedAt && b.unlockedAt) {
    return { unlockedAt: earlier(a.unlockedAt, b.unlockedAt), seen: a.seen || b.seen };
  }
  const unlocked = a.unlockedAt ? a : b.unlockedAt ? b : undefined;
  return unlocked ?? { seen: a.seen || b.seen };
}

/**
 * Combines progress from this device with progress saved in the cloud, without losing either.
 *  - A daily date keeps the result that was finished first (days stay locked).
 *  - Practice games are joined by game id, newest {@link PRACTICE_RESULTS_CAP} kept.
 *  - Discoveries and achievements keep the earliest dates and the highest counts.
 *  - Settings come from the cloud copy, so a new device picks up the player's saved choices
 *    instead of overwriting them with its defaults. Unfinished games come from `local`.
 * Merging the same data twice gives the same result.
 */
export function mergeProgress(local: ProgressData, remote: ProgressData): ProgressData {
  const dailyResults: ProgressData['daily']['results'] = { ...remote.daily.results };
  for (const [date, result] of Object.entries(local.daily.results)) {
    const other = dailyResults[date as keyof typeof dailyResults];
    dailyResults[date as keyof typeof dailyResults] =
      other && other.completedAt < result.completedAt ? other : result;
  }

  const practiceById = new Map<string, GameResult>();
  for (const r of [...remote.practice.results, ...local.practice.results]) {
    if (!practiceById.has(r.sessionId)) practiceById.set(r.sessionId, r);
  }
  const practiceResults = [...practiceById.values()]
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .slice(-PRACTICE_RESULTS_CAP);

  const discoveries: ProgressData['discoveries'] = { ...remote.discoveries };
  for (const [id, d] of Object.entries(local.discoveries)) {
    const other = discoveries[Number(id)];
    discoveries[Number(id)] = other ? mergeDiscovery(d, other) : d;
  }

  const achievements: ProgressData['achievements'] = { ...remote.achievements };
  for (const [id, a] of Object.entries(local.achievements)) {
    const other = achievements[id];
    achievements[id] = other ? mergeAchievement(a, other) : a;
  }

  const player = remote.player.createdAt < local.player.createdAt ? remote.player : local.player;

  const merged: ProgressData = {
    schemaVersion: local.schemaVersion,
    player,
    settings: remote.settings,
    daily: { results: dailyResults },
    practice: { results: practiceResults },
    discoveries,
    achievements,
  };

  // An unfinished game is dropped once that day (or that practice round) has a saved result.
  const dailyActive = local.daily.active ?? remote.daily.active;
  if (dailyActive && !(dailyActive.dateKey && dailyResults[dailyActive.dateKey])) {
    merged.daily.active = dailyActive;
  }
  const practiceActive = local.practice.active ?? remote.practice.active;
  if (practiceActive && !practiceById.has(practiceActive.id)) {
    merged.practice.active = practiceActive;
  }
  return merged;
}
