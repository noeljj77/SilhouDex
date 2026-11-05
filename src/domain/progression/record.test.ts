import { describe, expect, it } from 'vitest';
import type { GameResult, GameSession } from '../game/types.ts';
import type { DateKey } from '../../lib/utcDate.ts';
import {
  PRACTICE_RESULTS_CAP,
  createEmptyProgress,
  recordGameEnd,
  setActiveSession,
} from './record.ts';

const T1 = '2026-11-02T10:00:00.000Z';
const T2 = '2026-11-03T10:00:00.000Z';
const empty = () => createEmptyProgress(T1, 'player-1');

const daily = (over: Partial<GameResult> = {}): GameResult => ({
  sessionId: 'd1',
  mode: 'daily',
  pokemonId: 25,
  status: 'won',
  score: 85,
  wrongGuesses: 1,
  revealsUsed: 1,
  completedAt: T1,
  dateKey: '2026-11-02' as DateKey,
  challengeNumber: 2,
  ...over,
});
const practice = (over: Partial<GameResult> = {}): GameResult => ({
  sessionId: 'p1',
  mode: 'practice',
  pokemonId: 25,
  status: 'won',
  score: 100,
  wrongGuesses: 0,
  revealsUsed: 0,
  completedAt: T1,
  ...over,
});
const session = (over: Partial<GameSession> = {}): GameSession => ({
  id: 's',
  mode: 'daily',
  pokemonId: 25,
  guesses: [],
  status: 'playing',
  startedAt: T1,
  ...over,
});

describe('createEmptyProgress', () => {
  it('starts empty, on the normal difficulty', () => {
    expect(empty()).toMatchObject({
      schemaVersion: 1,
      player: { id: 'player-1', createdAt: T1 },
      settings: { difficulty: 'normal', generations: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      daily: { results: {} },
      practice: { results: [] },
      discoveries: {},
      achievements: {},
    });
  });
});

describe('recordGameEnd: daily', () => {
  it('stores the result and a discovery for a win', () => {
    const out = recordGameEnd(empty(), daily());
    expect(out.recorded).toBe(true);
    expect(out.isNewDiscovery).toBe(true);
    expect(out.data.daily.results['2026-11-02' as DateKey]).toEqual(daily());
    expect(out.data.discoveries[25]).toEqual({
      pokemonId: 25,
      firstDiscoveredAt: T1,
      lastDiscoveredAt: T1,
      timesDiscovered: 1,
      modes: ['daily'],
    });
  });

  it('locks the date: a second result for the same date is ignored', () => {
    const first = recordGameEnd(empty(), daily({ score: 40 })).data;
    const second = recordGameEnd(first, daily({ sessionId: 'd2', score: 100 }));
    expect(second.recorded).toBe(false);
    expect(second.isNewDiscovery).toBe(false);
    expect(second.data.daily.results['2026-11-02' as DateKey]?.score).toBe(40);
    expect(second.data.discoveries[25]?.timesDiscovered).toBe(1);
  });

  it.each(['lost', 'gave_up'] as const)(
    '%s counts as played but never as a discovery',
    (status) => {
      const out = recordGameEnd(empty(), daily({ status, score: 0 }));
      expect(out.recorded).toBe(true);
      expect(out.isNewDiscovery).toBe(false);
      expect(out.data.discoveries).toEqual({});
      expect(Object.keys(out.data.daily.results)).toEqual(['2026-11-02']);
    },
  );

  it('clears the unfinished daily game', () => {
    const withActive = setActiveSession(empty(), 'daily', session());
    expect(withActive.daily.active).toBeDefined();
    expect(recordGameEnd(withActive, daily()).data.daily.active).toBeUndefined();
  });

  it('requires a dateKey', () => {
    expect(() => recordGameEnd(empty(), daily({ dateKey: undefined }))).toThrow(/dateKey/);
  });
});

describe('recordGameEnd: practice', () => {
  it('adds the result and a discovery', () => {
    const out = recordGameEnd(empty(), practice());
    expect(out.data.practice.results).toEqual([practice()]);
    expect(out.data.discoveries[25]?.modes).toEqual(['practice']);
    expect(out.data.daily.results).toEqual({});
  });

  it('is safe to call twice with the same session', () => {
    const once = recordGameEnd(empty(), practice()).data;
    const twice = recordGameEnd(once, practice());
    expect(twice.recorded).toBe(false);
    expect(twice.data.practice.results).toHaveLength(1);
    expect(twice.data.discoveries[25]?.timesDiscovered).toBe(1);
  });

  it('keeps only the most recent results', () => {
    let data = empty();
    for (let i = 0; i < PRACTICE_RESULTS_CAP + 5; i++) {
      data = recordGameEnd(
        data,
        practice({ sessionId: `p${i}`, pokemonId: 1, status: 'lost', score: 0 }),
      ).data;
    }
    expect(data.practice.results).toHaveLength(PRACTICE_RESULTS_CAP);
    expect(data.practice.results[0]?.sessionId).toBe('p5');
  });

  it('does not touch the daily game in progress', () => {
    const withDaily = setActiveSession(empty(), 'daily', session());
    expect(recordGameEnd(withDaily, practice()).data.daily.active).toBeDefined();
  });
});

describe('discoveries', () => {
  it('updates one record per Pokémon, keeping the first date', () => {
    let data = recordGameEnd(empty(), daily()).data;
    const out = recordGameEnd(data, practice({ completedAt: T2 }));
    data = out.data;
    expect(out.isNewDiscovery).toBe(false);
    expect(Object.keys(data.discoveries)).toEqual(['25']);
    expect(data.discoveries[25]).toEqual({
      pokemonId: 25,
      firstDiscoveredAt: T1,
      lastDiscoveredAt: T2,
      timesDiscovered: 2,
      modes: ['daily', 'practice'],
    });
  });

  it('does not repeat a mode', () => {
    let data = recordGameEnd(empty(), practice({ sessionId: 'a' })).data;
    data = recordGameEnd(data, practice({ sessionId: 'b' })).data;
    expect(data.discoveries[25]?.modes).toEqual(['practice']);
    expect(data.discoveries[25]?.timesDiscovered).toBe(2);
  });
});

describe('setActiveSession', () => {
  it('sets and clears each mode independently, without mutating', () => {
    const base = empty();
    const a = setActiveSession(base, 'daily', session());
    const b = setActiveSession(a, 'practice', session({ mode: 'practice', id: 'p' }));
    expect(base.daily.active).toBeUndefined();
    expect(b.daily.active?.id).toBe('s');
    expect(b.practice.active?.id).toBe('p');
    const c = setActiveSession(b, 'daily', undefined);
    expect(c.daily.active).toBeUndefined();
    expect(c.practice.active?.id).toBe('p');
    expect('active' in c.daily).toBe(false);
  });
});
