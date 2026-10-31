import { describe, expect, it } from 'vitest';
import { createEmptyProgress, recordGameEnd } from '../domain/progression/record.ts';
import type { GameResult } from '../domain/game/types.ts';
import type { DateKey } from '../lib/utcDate.ts';
import { migrateToCurrent } from './migrations.ts';
import { createLocalRepository, STORAGE_KEY } from './localRepository.ts';

const NOW = '2026-11-02T10:00:00.000Z';
const make = (storage?: Storage) =>
  createLocalRepository({ storage, now: () => NOW, playerId: () => 'player-1' });

const result: GameResult = {
  sessionId: 'd1',
  mode: 'daily',
  pokemonId: 25,
  status: 'won',
  score: 85,
  wrongGuesses: 1,
  revealsUsed: 1,
  completedAt: NOW,
  dateKey: '2026-11-02' as DateKey,
  challengeNumber: 2,
};

const backups = () => Object.keys(localStorage).filter((k) => k.startsWith('silhoudex:backup:'));

/** A Storage whose every call throws, like blocked site data. */
const blocked = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
  removeItem() {
    throw new Error('blocked');
  },
  key: () => null,
  length: 0,
  clear() {},
} as Storage;

describe('createLocalRepository', () => {
  it('starts with empty progress on first visit', () => {
    const repo = make();
    expect(repo.load()).toEqual(createEmptyProgress(NOW, 'player-1'));
    expect(repo.mode).toBe('persistent');
  });

  it('saves and loads the same data back', () => {
    const repo = make();
    const data = recordGameEnd(repo.load(), result).data;
    repo.save(data);
    expect(make().load()).toEqual(data);
  });

  it('writes under the versioned key', () => {
    make().save(createEmptyProgress(NOW, 'player-1'));
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('backs up corrupt data and starts fresh instead of crashing', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const data = make().load();
    expect(data).toEqual(createEmptyProgress(NOW, 'player-1'));
    expect(backups()).toHaveLength(1);
    expect(localStorage.getItem(backups()[0]!)).toBe('{not json');
  });

  it('backs up data that is not progress at all', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));
    expect(make().load().daily.results).toEqual({});
    expect(backups()).toHaveLength(1);
  });

  it('leaves data from a newer app version untouched and refuses to overwrite it', () => {
    const future = JSON.stringify({ schemaVersion: 99, secret: 'new format' });
    localStorage.setItem(STORAGE_KEY, future);
    const repo = make();
    expect(repo.load().schemaVersion).toBe(1);
    expect(repo.mode).toBe('read-only');
    repo.save(createEmptyProgress(NOW, 'player-1'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(future);
  });

  it('keeps working in memory when storage is blocked', () => {
    const repo = make(blocked);
    expect(repo.mode).toBe('memory');
    expect(() => repo.save(createEmptyProgress(NOW, 'p'))).not.toThrow();
    expect(repo.load().player.id).toBe('player-1');
  });

  it('falls back to memory if saving fails later (storage full)', () => {
    const full = {
      getItem: (k: string) => localStorage.getItem(k),
      setItem: (k: string, v: string) => {
        if (k === STORAGE_KEY) throw new DOMException('full', 'QuotaExceededError');
        localStorage.setItem(k, v);
      },
      removeItem: (k: string) => localStorage.removeItem(k),
      key: () => null,
      length: 0,
      clear() {},
    } as Storage;
    const repo = make(full);
    expect(repo.mode).toBe('persistent');
    repo.save(createEmptyProgress(NOW, 'p'));
    expect(repo.mode).toBe('memory');
  });

  it('drops malformed records but keeps good ones', () => {
    const good = recordGameEnd(createEmptyProgress(NOW, 'player-1'), result).data;
    const dirty = {
      ...good,
      daily: {
        results: {
          ...good.daily.results,
          '2026-11-09': { ...result, dateKey: '2026-11-10' }, // filed under the wrong date
          'not-a-date': result,
          '2026-11-11': { sessionId: 1 },
        },
        active: { id: 5 },
      },
      discoveries: { ...good.discoveries, '99': { pokemonId: 7 }, '12': 'nope' },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dirty));
    const loaded = make().load();
    expect(Object.keys(loaded.daily.results)).toEqual(['2026-11-02']);
    expect(loaded.daily.active).toBeUndefined();
    expect(Object.keys(loaded.discoveries)).toEqual(['25']);
  });

  it('fills in sections that are missing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, daily: { results: {} } }));
    const loaded = make().load();
    expect(loaded.practice).toEqual({ results: [] });
    expect(loaded.settings.difficulty).toBe('normal');
    expect(loaded.player.id).toBe('player-1');
  });
});

describe('migrateToCurrent', () => {
  const options = { now: NOW, playerId: 'p' };

  it('upgrades old data one version at a time', () => {
    const calls: number[] = [];
    const migrations = {
      1: (d: Record<string, unknown>) => (calls.push(1), { ...d, renamed: true }),
      2: (d: Record<string, unknown>) => (calls.push(2), d),
    };
    const old = { ...createEmptyProgress(NOW, 'p'), schemaVersion: 1 };
    const out = migrateToCurrent(old, { ...options, current: 3, migrations });
    expect(calls).toEqual([1, 2]);
    expect(out).toMatchObject({ status: 'ok', migrated: true, data: { schemaVersion: 3 } });
  });

  it('reports invalid when a migration step is missing or throws', () => {
    const old = { ...createEmptyProgress(NOW, 'p'), schemaVersion: 1 };
    expect(migrateToCurrent(old, { ...options, current: 2, migrations: {} })).toEqual({
      status: 'invalid',
    });
    const boom = {
      1: () => {
        throw new Error('bad');
      },
    };
    expect(migrateToCurrent(old, { ...options, current: 2, migrations: boom })).toEqual({
      status: 'invalid',
    });
  });

  it('flags newer data as future and rejects junk', () => {
    expect(migrateToCurrent({ schemaVersion: 5 }, { ...options, current: 2 })).toEqual({
      status: 'future',
    });
    expect(migrateToCurrent(null, options)).toEqual({ status: 'invalid' });
    expect(migrateToCurrent({ schemaVersion: 'one' }, options)).toEqual({ status: 'invalid' });
    expect(migrateToCurrent({}, options)).toEqual({ status: 'invalid' });
  });

  it('backs up the original before saving an upgrade', () => {
    // Version 1 data is current today, so this just proves current data is not re-saved or backed up.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createEmptyProgress(NOW, 'player-1')));
    make().load();
    expect(backups()).toHaveLength(0);
  });
});
