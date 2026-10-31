import { toDateKey, type DateKey } from '../../lib/utcDate.ts';
import type { GameResult } from '../game/types.ts';
import type { PokemonIndexEntry, PokemonType } from '../pokemon/types.ts';
import { computeStreaks } from '../progression/streaks.ts';
import type { AchievementState, ProgressData } from '../progression/types.ts';
import {
  ACHIEVEMENTS,
  type AchievementContext,
  type AchievementDefinition,
} from './definitions.ts';

/** Reads everything achievements are measured from out of the player's progress. */
export function buildContext(
  data: ProgressData,
  catalogue: readonly PokemonIndexEntry[],
  today: DateKey,
): AchievementContext {
  const byId = new Map(catalogue.map((e) => [e.id, e]));
  const discovered = Object.values(data.discoveries)
    .map((d) => byId.get(d.pokemonId))
    .filter((e): e is PokemonIndexEntry => e !== undefined);

  const perType = new Map<PokemonType, number>();
  for (const e of discovered) for (const t of e.types) perType.set(t, (perType.get(t) ?? 0) + 1);

  const daily = Object.values(data.daily.results) as GameResult[];
  const everyGame = [...daily, ...data.practice.results];
  const wins = everyGame.filter((r) => r.status === 'won');

  return {
    uniqueDiscoveries: discovered.length,
    generation1Discoveries: discovered.filter((e) => e.generation === 1).length,
    sameTypeMax: Math.max(0, ...perType.values()),
    legendaryDiscoveries: discovered.filter((e) => e.isLegendary).length,
    mythicalDiscoveries: discovered.filter((e) => e.isMythical).length,
    longestStreak: computeStreaks(data.daily.results, today).longest,
    practiceGamesCompleted: data.practice.results.length,
    longestNoGiveUpRun: longestRunWithoutGivingUp(everyGame),
    perfectDailyGames: daily.filter((r) => r.status === 'won' && r.wrongGuesses === 0).length,
    winsWithoutReveal: wins.filter((r) => r.wrongGuesses === 0).length,
    winsAfterOneReveal: wins.filter((r) => r.wrongGuesses === 1).length,
  };
}

/** Longest stretch of finished games, oldest to newest, that contains no give-up. */
export function longestRunWithoutGivingUp(games: readonly GameResult[]): number {
  const ordered = [...games].sort(
    (a, b) => a.completedAt.localeCompare(b.completedAt) || a.sessionId.localeCompare(b.sessionId),
  );
  let best = 0;
  let run = 0;
  for (const game of ordered) {
    run = game.status === 'gave_up' ? 0 : run + 1;
    best = Math.max(best, run);
  }
  return best;
}

export interface UnlockOutcome {
  data: ProgressData;
  /** Ids unlocked by this call, in definition order. */
  newlyUnlocked: string[];
}

/**
 * Unlocks every achievement whose target has been reached and was not unlocked before.
 * An unlocked achievement stays unlocked and keeps its original date.
 *
 * @param at ISO time to record as the unlock time.
 * @param seen Whether the player has already seen the unlock. Real unlocks start unseen so the
 *             UI can celebrate them; catching up on old progress starts as seen.
 */
export function unlockAchievements(
  data: ProgressData,
  catalogue: readonly PokemonIndexEntry[],
  at: string,
  seen = false,
  definitions: readonly AchievementDefinition[] = ACHIEVEMENTS,
): UnlockOutcome {
  const parsed = new Date(at);
  const today = toDateKey(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
  const context = buildContext(data, catalogue, today);

  const newlyUnlocked: string[] = [];
  const achievements: Record<string, AchievementState> = { ...data.achievements };
  for (const def of definitions) {
    if (achievements[def.id]?.unlockedAt) continue;
    if (def.progress(context) >= def.target) {
      achievements[def.id] = { unlockedAt: at, seen };
      newlyUnlocked.push(def.id);
    }
  }
  return newlyUnlocked.length === 0
    ? { data, newlyUnlocked }
    : { data: { ...data, achievements }, newlyUnlocked };
}

/** Marks unlocked achievements as seen (after the player has been shown them). */
export function markSeen(data: ProgressData, ids: readonly string[]): ProgressData {
  let changed = false;
  const achievements = { ...data.achievements };
  for (const id of ids) {
    const state = achievements[id];
    if (state?.unlockedAt && !state.seen) {
      achievements[id] = { ...state, seen: true };
      changed = true;
    }
  }
  return changed ? { ...data, achievements } : data;
}

export type AchievementStatus = 'locked' | 'in-progress' | 'unlocked';

export interface AchievementView {
  definition: AchievementDefinition;
  /** Capped at the target. */
  progress: number;
  status: AchievementStatus;
  unlockedAt?: string;
  /** Unlocked but not yet shown to the player. */
  isNew: boolean;
}

/** Every achievement with its live progress, for display. */
export function viewAchievements(
  data: ProgressData,
  catalogue: readonly PokemonIndexEntry[],
  today: DateKey,
  definitions: readonly AchievementDefinition[] = ACHIEVEMENTS,
): AchievementView[] {
  const context = buildContext(data, catalogue, today);
  return definitions.map((definition) => {
    const state = data.achievements[definition.id];
    const unlocked = Boolean(state?.unlockedAt);
    const raw = unlocked ? definition.target : definition.progress(context);
    const progress = Math.min(raw, definition.target);
    const view: AchievementView = {
      definition,
      progress,
      status: unlocked ? 'unlocked' : progress > 0 ? 'in-progress' : 'locked',
      isNew: unlocked && state?.seen === false,
    };
    if (state?.unlockedAt) view.unlockedAt = state.unlockedAt;
    return view;
  });
}
