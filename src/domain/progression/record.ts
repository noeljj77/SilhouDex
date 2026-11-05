import type { GameMode, GameResult, GameSession } from '../game/types.ts';
import { ALL_GENERATIONS } from '../pokemon/generations.ts';
import type { Discovery, ProgressData } from './types.ts';

export const SCHEMA_VERSION = 1;
/** Older practice results are dropped beyond this, keeping storage small. */
export const PRACTICE_RESULTS_CAP = 500;

export function createEmptyProgress(now: string, playerId: string): ProgressData {
  return {
    schemaVersion: SCHEMA_VERSION,
    player: { id: playerId, createdAt: now },
    settings: { difficulty: 'normal', generations: [...ALL_GENERATIONS] },
    daily: { results: {} },
    practice: { results: [] },
    discoveries: {},
    achievements: {},
  };
}

/** Saves (or clears, with undefined) the unfinished game for a mode. */
export function setActiveSession(
  data: ProgressData,
  mode: GameMode,
  session: GameSession | undefined,
): ProgressData {
  if (mode === 'daily') {
    const daily: ProgressData['daily'] = { results: data.daily.results };
    if (session) daily.active = session;
    return { ...data, daily };
  }
  const practice: ProgressData['practice'] = { results: data.practice.results };
  if (session) practice.active = session;
  return { ...data, practice };
}

export interface RecordOutcome {
  data: ProgressData;
  /** False when the result was ignored (a second result for the same daily date). */
  recorded: boolean;
  /** True when this win added a Pokémon to the collection for the first time. */
  isNewDiscovery: boolean;
}

function upsertDiscovery(existing: Discovery | undefined, result: GameResult): Discovery {
  if (!existing) {
    return {
      pokemonId: result.pokemonId,
      firstDiscoveredAt: result.completedAt,
      lastDiscoveredAt: result.completedAt,
      timesDiscovered: 1,
      modes: [result.mode],
    };
  }
  return {
    ...existing,
    lastDiscoveredAt: result.completedAt,
    timesDiscovered: existing.timesDiscovered + 1,
    modes: existing.modes.includes(result.mode) ? existing.modes : [...existing.modes, result.mode],
  };
}

/**
 * The one place a finished game is saved. It:
 *  - stores the result (a daily date can only ever have one, so refreshing cannot replay it);
 *  - adds a discovery for wins only (giving up or losing never counts);
 *  - clears the unfinished game for that mode.
 * Calling it twice with the same result changes nothing the second time.
 */
export function recordGameEnd(data: ProgressData, result: GameResult): RecordOutcome {
  let next = data;
  if (result.mode === 'daily') {
    if (!result.dateKey) throw new Error('A daily result needs a dateKey');
    if (data.daily.results[result.dateKey]) {
      return {
        data: setActiveSession(data, 'daily', undefined),
        recorded: false,
        isNewDiscovery: false,
      };
    }
    next = {
      ...next,
      daily: { ...next.daily, results: { ...next.daily.results, [result.dateKey]: result } },
    };
  } else {
    if (data.practice.results.some((r) => r.sessionId === result.sessionId)) {
      return {
        data: setActiveSession(data, 'practice', undefined),
        recorded: false,
        isNewDiscovery: false,
      };
    }
    const results = [...next.practice.results, result].slice(-PRACTICE_RESULTS_CAP);
    next = { ...next, practice: { ...next.practice, results } };
  }

  let isNewDiscovery = false;
  if (result.status === 'won') {
    const existing = next.discoveries[result.pokemonId];
    isNewDiscovery = !existing;
    next = {
      ...next,
      discoveries: { ...next.discoveries, [result.pokemonId]: upsertDiscovery(existing, result) },
    };
  }
  return { data: setActiveSession(next, result.mode, undefined), recorded: true, isNewDiscovery };
}
