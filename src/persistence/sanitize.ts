import { SCHEMA_VERSION, createEmptyProgress } from '../domain/progression/record.ts';
import type { AchievementState, Discovery, ProgressData } from '../domain/progression/types.ts';
import type { GameResult, GameSession } from '../domain/game/types.ts';
import { isDateKey, type DateKey } from '../lib/utcDate.ts';
import { DIFFICULTY_PROFILES, type DifficultyLevel } from '../domain/clues/difficulty.ts';
import { normalizeGenerations } from '../domain/pokemon/generations.ts';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const FINISHED = ['won', 'lost', 'gave_up'];

function isResult(v: unknown): v is GameResult {
  return (
    isRecord(v) &&
    isString(v.sessionId) &&
    (v.mode === 'daily' || v.mode === 'practice') &&
    isCount(v.pokemonId) &&
    FINISHED.includes(v.status as string) &&
    isCount(v.score) &&
    isCount(v.wrongGuesses) &&
    isCount(v.revealsUsed) &&
    isString(v.completedAt)
  );
}

function isSession(v: unknown): v is GameSession {
  return (
    isRecord(v) &&
    isString(v.id) &&
    (v.mode === 'daily' || v.mode === 'practice') &&
    isCount(v.pokemonId) &&
    Array.isArray(v.guesses) &&
    v.guesses.every((g) => isRecord(g) && isCount(g.pokemonId) && typeof g.correct === 'boolean') &&
    ['playing', 'won', 'lost', 'gave_up'].includes(v.status as string) &&
    isString(v.startedAt)
  );
}

function isDiscovery(key: string, v: unknown): v is Discovery {
  return (
    isRecord(v) &&
    isCount(v.pokemonId) &&
    String(v.pokemonId) === key &&
    isString(v.firstDiscoveredAt) &&
    isString(v.lastDiscoveredAt) &&
    isCount(v.timesDiscovered) &&
    Array.isArray(v.modes) &&
    v.modes.every((m) => m === 'daily' || m === 'practice')
  );
}

/**
 * Turns whatever was stored into valid ProgressData: keeps every well-formed record, drops
 * malformed ones, and fills in missing sections. Returns null only if it is not an object.
 */
export function normalizeProgress(
  raw: unknown,
  now: string,
  playerId: string,
  schemaVersion: number = SCHEMA_VERSION,
): ProgressData | null {
  if (!isRecord(raw)) return null;
  const base = createEmptyProgress(now, playerId);

  const player =
    isRecord(raw.player) && isString(raw.player.id) && isString(raw.player.createdAt)
      ? { id: raw.player.id, createdAt: raw.player.createdAt }
      : base.player;

  const difficulty =
    isRecord(raw.settings) &&
    typeof raw.settings.difficulty === 'string' &&
    raw.settings.difficulty in DIFFICULTY_PROFILES
      ? (raw.settings.difficulty as DifficultyLevel)
      : base.settings.difficulty;

  // Saves from before this setting existed have none, which means every generation.
  const generations = normalizeGenerations(
    isRecord(raw.settings) ? raw.settings.generations : undefined,
  );

  const dailyRaw = isRecord(raw.daily) ? raw.daily : {};
  const dailyResults: Record<DateKey, GameResult> = {};
  if (isRecord(dailyRaw.results)) {
    for (const [key, result] of Object.entries(dailyRaw.results)) {
      // A daily result must be filed under its own date.
      if (isDateKey(key) && isResult(result) && result.mode === 'daily' && result.dateKey === key) {
        dailyResults[key] = result;
      }
    }
  }

  const practiceRaw = isRecord(raw.practice) ? raw.practice : {};
  const practiceResults = Array.isArray(practiceRaw.results)
    ? practiceRaw.results.filter((r): r is GameResult => isResult(r) && r.mode === 'practice')
    : [];

  const discoveries: ProgressData['discoveries'] = {};
  if (isRecord(raw.discoveries)) {
    for (const [key, d] of Object.entries(raw.discoveries)) {
      if (isDiscovery(key, d)) discoveries[Number(key)] = d;
    }
  }

  const achievements: Record<string, AchievementState> = {};
  if (isRecord(raw.achievements)) {
    for (const [id, a] of Object.entries(raw.achievements)) {
      if (
        isRecord(a) &&
        typeof a.seen === 'boolean' &&
        (a.unlockedAt === undefined || isString(a.unlockedAt))
      ) {
        achievements[id] = a.unlockedAt
          ? { unlockedAt: a.unlockedAt, seen: a.seen }
          : { seen: a.seen };
      }
    }
  }

  const data: ProgressData = {
    schemaVersion,
    player,
    settings: { difficulty, generations },
    daily: { results: dailyResults },
    practice: { results: practiceResults },
    discoveries,
    achievements,
  };
  if (isSession(dailyRaw.active) && dailyRaw.active.mode === 'daily')
    data.daily.active = dailyRaw.active;
  if (isSession(practiceRaw.active) && practiceRaw.active.mode === 'practice') {
    data.practice.active = practiceRaw.active;
  }
  return data;
}
