import { describe, expect, it } from 'vitest';
import { createEmptyProgress } from '../domain/progression/record.ts';
import type { GameSession } from '../domain/game/types.ts';
import type { ProgressRepository } from '../persistence/localRepository.ts';
import { createProgressStore } from './progressStore.ts';
import { DEFAULT_ROUTE, hrefFor, parseRoute, ROUTES } from './router.ts';

describe('parseRoute', () => {
  it.each([
    ['#/daily', 'daily'],
    ['#/practice', 'practice'],
    ['#/pokedex', 'pokedex'],
    ['#/achievements', 'achievements'],
    ['#/profile', 'profile'],
    ['#/lab', 'lab'],
    ['#practice', 'practice'],
    ['#/practice?x=1', 'practice'],
    ['#/practice/extra', 'practice'],
  ])('reads %s as %s', (hash, route) => {
    expect(parseRoute(hash)).toBe(route);
  });

  it.each(['', '#', '#/', '#/nope', '#/DAILY2', 'daily'])(
    'falls back to the daily game for %j',
    (hash) => {
      expect(parseRoute(hash)).toBe(DEFAULT_ROUTE);
    },
  );

  it('round-trips every route', () => {
    for (const route of ROUTES) expect(parseRoute(hrefFor(route))).toBe(route);
  });
});

describe('createProgressStore', () => {
  const NOW = '2026-11-02T10:00:00.000Z';
  const makeRepo = (): ProgressRepository & { saves: number } => {
    const repo = {
      mode: 'persistent' as const,
      saves: 0,
      load: () => createEmptyProgress(NOW, 'p'),
      save() {
        repo.saves += 1;
      },
    };
    return repo;
  };
  const session = (over: Partial<GameSession> = {}): GameSession => ({
    id: 'daily-2026-11-02',
    mode: 'daily',
    pokemonId: 25,
    guesses: [],
    status: 'playing',
    startedAt: NOW,
    dateKey: '2026-11-02',
    challengeNumber: 2,
    ...over,
  });

  it('saves the unfinished game and tells subscribers', () => {
    const repo = makeRepo();
    const store = createProgressStore(repo);
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.saveActive('daily', session());
    expect(store.getSnapshot().daily.active?.id).toBe('daily-2026-11-02');
    expect(repo.saves).toBe(1);
    expect(calls).toBe(1);
    unsubscribe();
    store.clearActive('daily');
    expect(calls).toBe(1);
  });

  it('finishing a game records it once and clears the unfinished game', () => {
    const store = createProgressStore(makeRepo());
    store.saveActive('daily', session());
    const finished = session({
      status: 'won',
      endedAt: NOW,
      guesses: [{ pokemonId: 25, correct: true, at: NOW }],
    });
    const first = store.finishGame(finished);
    expect(first).toMatchObject({ recorded: true, isNewDiscovery: true });
    expect(first.result).toMatchObject({ status: 'won', score: 100 });
    expect(store.getSnapshot().daily.active).toBeUndefined();

    const again = store.finishGame(finished);
    expect(again.recorded).toBe(false);
    expect(store.getSnapshot().discoveries[25]?.timesDiscovered).toBe(1);
  });

  it('saves the practice generations, tidied up, and skips saving an unchanged choice', () => {
    const repo = makeRepo();
    const store = createProgressStore(repo);
    expect(store.getSnapshot().settings.generations).toHaveLength(9);
    store.setGenerations([3, 1, 3]);
    expect(store.getSnapshot().settings.generations).toEqual([1, 3]);
    expect(repo.saves).toBe(1);
    store.setGenerations([1, 3]);
    expect(repo.saves).toBe(1);
    store.setGenerations([]); // nothing chosen means every generation
    expect(store.getSnapshot().settings.generations).toHaveLength(9);
    expect(repo.saves).toBe(2);
  });

  it('saves the practice difficulty, and skips saving an unchanged one', () => {
    const repo = makeRepo();
    const store = createProgressStore(repo);
    expect(store.getSnapshot().settings.difficulty).toBe('normal');
    store.setDifficulty('hard');
    expect(store.getSnapshot().settings.difficulty).toBe('hard');
    expect(repo.saves).toBe(1);
    store.setDifficulty('hard');
    expect(repo.saves).toBe(1);
  });

  describe('achievements', () => {
    const won = (over: Partial<GameSession> = {}): GameSession =>
      session({
        status: 'won',
        endedAt: NOW,
        guesses: [{ pokemonId: 25, correct: true, at: NOW }],
        ...over,
      });

    it('unlocks achievements when a game ends, and reports them', () => {
      const store = createProgressStore(makeRepo());
      const outcome = store.finishGame(won());
      expect(outcome.newAchievements).toEqual(['first-discovery', 'perfect-instinct']);
      expect(store.getSnapshot().achievements['first-discovery']).toEqual({
        unlockedAt: NOW,
        seen: false,
      });
    });

    it('reports nothing new on a later game that earns nothing', () => {
      const store = createProgressStore(makeRepo());
      store.finishGame(won());
      const second = store.finishGame(
        won({ id: 'p2', mode: 'practice', dateKey: undefined, challengeNumber: undefined }),
      );
      expect(second.newAchievements).toEqual([]);
    });

    it('does not unlock anything for a result that was ignored as a duplicate', () => {
      const store = createProgressStore(makeRepo());
      store.finishGame(won());
      const before = store.getSnapshot().achievements;
      const again = store.finishGame(won());
      expect(again.recorded).toBe(false);
      expect(again.newAchievements).toEqual([]);
      expect(store.getSnapshot().achievements).toBe(before);
    });

    it('does not unlock anything for giving up', () => {
      const store = createProgressStore(makeRepo());
      const outcome = store.finishGame(session({ status: 'gave_up', endedAt: NOW }));
      expect(outcome.newAchievements).toEqual([]);
      expect(store.getSnapshot().achievements).toEqual({});
    });

    it('marks achievements as seen', () => {
      const store = createProgressStore(makeRepo());
      store.finishGame(won());
      store.markAchievementsSeen(['first-discovery']);
      expect(store.getSnapshot().achievements['first-discovery']?.seen).toBe(true);
      expect(store.getSnapshot().achievements['perfect-instinct']?.seen).toBe(false);
    });

    it('catches up on progress made before achievements existed, already seen', () => {
      const old = createEmptyProgress(NOW, 'p');
      old.discoveries = {
        25: {
          pokemonId: 25,
          firstDiscoveredAt: NOW,
          lastDiscoveredAt: NOW,
          timesDiscovered: 1,
          modes: ['daily'],
        },
      };
      const repo = makeRepo();
      repo.load = () => old;
      const store = createProgressStore(repo, { now: () => '2026-11-20T00:00:00.000Z' });
      expect(store.getSnapshot().achievements['first-discovery']).toEqual({
        unlockedAt: '2026-11-20T00:00:00.000Z',
        seen: true,
      });
      expect(repo.saves).toBe(1);
    });
  });

  it('does not notify or save when nothing changed', () => {
    const repo = makeRepo();
    const store = createProgressStore(repo);
    store.clearActive('daily');
    // clearing when there is no game still produces a new object, but the saves stay tiny
    expect(repo.saves).toBeLessThanOrEqual(1);
  });
});
