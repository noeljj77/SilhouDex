import { describe, expect, it } from 'vitest';
import { pokedexIndex } from '../../data/pokedexIndex.ts';
import { addDays, type DateKey } from '../../lib/utcDate.ts';
import type { GameResult } from '../game/types.ts';
import { createEmptyProgress } from '../progression/record.ts';
import type { Discovery, ProgressData } from '../progression/types.ts';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, ACHIEVEMENT_CATEGORIES } from './definitions.ts';
import {
  buildContext,
  longestRunWithoutGivingUp,
  markSeen,
  unlockAchievements,
  viewAchievements,
} from './evaluator.ts';

const entries = pokedexIndex.entries;
const AT = '2026-11-10T12:00:00.000Z';
const TODAY = '2026-11-10' as DateKey;

const idsWhere = (test: (e: (typeof entries)[number]) => boolean) =>
  entries.filter(test).map((e) => e.id);
const gen1 = idsWhere((e) => e.generation === 1);
const water = idsWhere((e) => e.types.includes('water'));
const fire = idsWhere((e) => e.types.includes('fire'));
const legendary = idsWhere((e) => e.isLegendary);
const mythical = idsWhere((e) => e.isMythical);

const discovery = (id: number): Discovery => ({
  pokemonId: id,
  firstDiscoveredAt: AT,
  lastDiscoveredAt: AT,
  timesDiscovered: 1,
  modes: ['practice'],
});
const game = (over: Partial<GameResult>): GameResult => ({
  sessionId: 's',
  mode: 'practice',
  pokemonId: 1,
  status: 'won',
  score: 100,
  wrongGuesses: 0,
  revealsUsed: 0,
  completedAt: AT,
  ...over,
});
const dailyOn = (key: string, over: Partial<GameResult> = {}): GameResult =>
  game({
    mode: 'daily',
    dateKey: key as DateKey,
    sessionId: `daily-${key}`,
    completedAt: `${key}T09:00:00.000Z`,
    ...over,
  });

function player(
  opts: { discover?: readonly number[]; daily?: GameResult[]; practice?: GameResult[] } = {},
): ProgressData {
  const data = createEmptyProgress('2026-10-01T00:00:00.000Z', 'p');
  data.discoveries = Object.fromEntries((opts.discover ?? []).map((id) => [id, discovery(id)]));
  data.daily.results = Object.fromEntries((opts.daily ?? []).map((r) => [r.dateKey!, r]));
  data.practice.results = opts.practice ?? [];
  return data;
}
const unlockedBy = (data: ProgressData) => unlockAchievements(data, entries, AT).newlyUnlocked;
const practiceGames = (n: number, over: Partial<GameResult> = {}) =>
  Array.from({ length: n }, (_, i) =>
    game({ sessionId: `p${i}`, completedAt: `2026-11-0${(i % 9) + 1}T10:00:00.000Z`, ...over }),
  );
const streakOf = (days: number) =>
  Array.from({ length: days }, (_, i) =>
    dailyOn(addDays('2026-10-01' as DateKey, i), { score: 40, wrongGuesses: 4 }),
  );

describe('the achievement list', () => {
  it('has the fifteen achievements from the brief', () => {
    expect(ACHIEVEMENTS.map((a) => a.title)).toEqual([
      'First Discovery',
      'Collector',
      'Pokédex Pro',
      'Perfect Instinct',
      'Sharp Eyes',
      'On Fire',
      'Dedicated Trainer',
      'Unstoppable',
      'Generation I Expert',
      'Type Specialist',
      'Legendary Hunter',
      'Mythical Encounter',
      'Practice Makes Perfect',
      'No Looking Back',
      'Master Detective',
    ]);
  });

  it('is well formed', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(15);
    for (const a of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_CATEGORIES).toContain(a.category);
      expect(a.target).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(5);
      expect(ACHIEVEMENT_BY_ID.get(a.id)).toBe(a);
    }
    for (const category of ACHIEVEMENT_CATEGORIES) {
      expect(ACHIEVEMENTS.some((a) => a.category === category)).toBe(true);
    }
  });

  it('has enough catalogue data to be earnable', () => {
    expect(water.length).toBeGreaterThanOrEqual(10);
    expect(gen1.length).toBeGreaterThanOrEqual(25);
    expect(legendary.length).toBeGreaterThan(0);
    expect(mythical.length).toBeGreaterThan(0);
  });
});

describe('a new player', () => {
  it('has nothing unlocked', () => {
    expect(unlockedBy(player())).toEqual([]);
    expect(viewAchievements(player(), entries, TODAY).every((v) => v.status === 'locked')).toBe(
      true,
    );
  });
});

describe('discovery and collection', () => {
  it('First Discovery: one Pokémon', () => {
    expect(unlockedBy(player({ discover: [] }))).not.toContain('first-discovery');
    expect(unlockedBy(player({ discover: [25] }))).toContain('first-discovery');
  });

  it.each([
    ['collector', 25],
    ['pokedex-pro', 100],
  ])('%s unlocks at exactly %i unique Pokémon, not one fewer', (id, target) => {
    const ids = entries.map((e) => e.id);
    expect(unlockedBy(player({ discover: ids.slice(0, target - 1) }))).not.toContain(id);
    expect(unlockedBy(player({ discover: ids.slice(0, target) }))).toContain(id);
  });

  it('Pokédex Pro does not unlock from Collector’s 25', () => {
    expect(unlockedBy(player({ discover: gen1.slice(0, 25) }))).not.toContain('pokedex-pro');
  });

  it('Generation I Expert: 25 Generation I Pokémon, other generations do not count', () => {
    const gen2 = idsWhere((e) => e.generation === 2).slice(0, 30);
    expect(unlockedBy(player({ discover: [...gen1.slice(0, 24), ...gen2] }))).not.toContain(
      'generation-1-expert',
    );
    expect(unlockedBy(player({ discover: gen1.slice(0, 25) }))).toContain('generation-1-expert');
  });

  it('Type Specialist: 10 Pokémon of one type', () => {
    expect(unlockedBy(player({ discover: water.slice(0, 9) }))).not.toContain('type-specialist');
    expect(unlockedBy(player({ discover: water.slice(0, 10) }))).toContain('type-specialist');
  });

  it('Type Specialist: ten Pokémon spread over different types is not enough', () => {
    const mixed = [...water.slice(0, 5), ...fire.filter((id) => !water.includes(id)).slice(0, 5)];
    expect(mixed).toHaveLength(10);
    expect(buildContext(player({ discover: mixed }), entries, TODAY).sameTypeMax).toBeLessThan(10);
    expect(unlockedBy(player({ discover: mixed }))).not.toContain('type-specialist');
  });

  it('Type Specialist: a dual-type Pokémon counts toward both of its types', () => {
    const dual = entries.find((e) => e.types.length === 2)!;
    const ctx = buildContext(player({ discover: [dual.id] }), entries, TODAY);
    expect(ctx.sameTypeMax).toBe(1);
    const sameAsSecond = idsWhere((e) => e.types.includes(dual.types[1]!)).slice(0, 10);
    expect(buildContext(player({ discover: sameAsSecond }), entries, TODAY).sameTypeMax).toBe(10);
  });

  it('Legendary Hunter and Mythical Encounter are separate', () => {
    expect(unlockedBy(player({ discover: [legendary[0]!] }))).toContain('legendary-hunter');
    expect(unlockedBy(player({ discover: [legendary[0]!] }))).not.toContain('mythical-encounter');
    expect(unlockedBy(player({ discover: [mythical[0]!] }))).toContain('mythical-encounter');
    expect(unlockedBy(player({ discover: [mythical[0]!] }))).not.toContain('legendary-hunter');
  });

  it('ignores a discovery of a Pokémon that is not in the catalogue', () => {
    expect(unlockedBy(player({ discover: [99999] }))).toEqual([]);
  });
});

describe('skill', () => {
  it('Perfect Instinct: a win with no wrong guess, in either mode', () => {
    expect(unlockedBy(player({ practice: [game({})] }))).toContain('perfect-instinct');
    expect(unlockedBy(player({ daily: [dailyOn('2026-11-09')] }))).toContain('perfect-instinct');
  });

  it('Perfect Instinct: not for a win after a miss, or for giving up before guessing', () => {
    expect(unlockedBy(player({ practice: [game({ wrongGuesses: 1, score: 85 })] }))).not.toContain(
      'perfect-instinct',
    );
    expect(
      unlockedBy(player({ practice: [game({ status: 'gave_up', score: 0, wrongGuesses: 0 })] })),
    ).not.toContain('perfect-instinct');
  });

  it('Sharp Eyes: a win after exactly one reveal', () => {
    expect(
      unlockedBy(player({ practice: [game({ wrongGuesses: 1, revealsUsed: 1, score: 85 })] })),
    ).toContain('sharp-eyes');
    expect(unlockedBy(player({ practice: [game({ wrongGuesses: 0 })] }))).not.toContain(
      'sharp-eyes',
    );
    expect(unlockedBy(player({ practice: [game({ wrongGuesses: 2, score: 70 })] }))).not.toContain(
      'sharp-eyes',
    );
    expect(
      unlockedBy(player({ practice: [game({ status: 'lost', wrongGuesses: 1, score: 0 })] })),
    ).not.toContain('sharp-eyes');
  });

  it('Master Detective: five perfect daily challenges', () => {
    const perfect = (n: number) =>
      Array.from({ length: n }, (_, i) => dailyOn(addDays('2026-11-01' as DateKey, i)));
    expect(unlockedBy(player({ daily: perfect(4) }))).not.toContain('master-detective');
    expect(unlockedBy(player({ daily: perfect(5) }))).toContain('master-detective');
  });

  it('Master Detective: practice games and imperfect dailies do not count', () => {
    const daily = [
      ...Array.from({ length: 4 }, (_, i) => dailyOn(addDays('2026-11-01' as DateKey, i))),
      dailyOn('2026-11-08', { wrongGuesses: 1, score: 85 }),
    ];
    expect(unlockedBy(player({ daily, practice: practiceGames(10) }))).not.toContain(
      'master-detective',
    );
  });
});

describe('streaks', () => {
  it.each([
    ['on-fire', 3],
    ['dedicated-trainer', 7],
    ['unstoppable', 30],
  ])('%s unlocks at a %i-day streak, not one day fewer', (id, days) => {
    expect(unlockedBy(player({ daily: streakOf(days - 1) }))).not.toContain(id);
    expect(unlockedBy(player({ daily: streakOf(days) }))).toContain(id);
  });

  it('a streak reached once counts even after it breaks', () => {
    // A 3-day run, a gap, then a fresh 1-day run: the longest streak is still 3.
    const daily = [...streakOf(3), dailyOn('2026-10-20')];
    expect(unlockedBy(player({ daily }))).toContain('on-fire');
  });

  it('a gap stops days from adding up', () => {
    const daily = [dailyOn('2026-10-01'), dailyOn('2026-10-02'), dailyOn('2026-10-04')];
    expect(unlockedBy(player({ daily }))).not.toContain('on-fire');
  });

  it('losses and give-ups still count toward the streak', () => {
    const daily = [
      dailyOn('2026-10-01', { status: 'lost', score: 0 }),
      dailyOn('2026-10-02', { status: 'gave_up', score: 0 }),
      dailyOn('2026-10-03', { status: 'won' }),
    ];
    expect(unlockedBy(player({ daily }))).toContain('on-fire');
  });

  it('practice never counts toward streaks', () => {
    expect(unlockedBy(player({ practice: practiceGames(9) }))).not.toContain('on-fire');
  });
});

describe('dedication', () => {
  it('Practice Makes Perfect: 20 finished practice games, however they ended', () => {
    expect(unlockedBy(player({ practice: practiceGames(19) }))).not.toContain(
      'practice-makes-perfect',
    );
    const mixed = [
      ...practiceGames(10),
      ...practiceGames(5, { status: 'lost', score: 0 }),
      ...practiceGames(5, { status: 'gave_up', score: 0 }),
    ].map((g, i) => ({ ...g, sessionId: `m${i}` }));
    expect(unlockedBy(player({ practice: mixed }))).toContain('practice-makes-perfect');
  });

  it('Practice Makes Perfect: daily games do not count', () => {
    expect(unlockedBy(player({ daily: streakOf(25) }))).not.toContain('practice-makes-perfect');
  });

  it('No Looking Back: five finished games in a row', () => {
    const games = (n: number) =>
      practiceGames(n).map((g, i) => ({
        ...g,
        completedAt: `2026-11-0${i + 1}T10:00:00.000Z`,
        sessionId: `g${i}`,
      }));
    expect(unlockedBy(player({ practice: games(4) }))).not.toContain('no-looking-back');
    expect(unlockedBy(player({ practice: games(5) }))).toContain('no-looking-back');
  });

  it('No Looking Back: a give-up resets the run', () => {
    const at = (day: number, status: GameResult['status'] = 'won') =>
      game({
        sessionId: `g${day}`,
        status,
        score: status === 'won' ? 100 : 0,
        completedAt: `2026-11-${String(day).padStart(2, '0')}T10:00:00.000Z`,
      });
    const broken = [at(1), at(2), at(3, 'gave_up'), at(4), at(5), at(6), at(7)];
    expect(unlockedBy(player({ practice: broken }))).not.toContain('no-looking-back');
    expect(unlockedBy(player({ practice: [...broken, at(8)] }))).toContain('no-looking-back');
  });

  it('No Looking Back: losses are not give-ups, and Daily and Practice add together in time order', () => {
    const games = [
      dailyOn('2026-11-01', { status: 'lost', score: 0 }),
      game({ sessionId: 'a', completedAt: '2026-11-01T12:00:00.000Z' }),
      dailyOn('2026-11-02'),
      game({ sessionId: 'b', status: 'lost', score: 0, completedAt: '2026-11-02T12:00:00.000Z' }),
      game({ sessionId: 'c', completedAt: '2026-11-03T12:00:00.000Z' }),
    ];
    const daily = games.filter((g) => g.mode === 'daily');
    const practice = games.filter((g) => g.mode === 'practice');
    expect(unlockedBy(player({ daily, practice }))).toContain('no-looking-back');
  });
});

describe('longestRunWithoutGivingUp', () => {
  const at = (n: number, status: GameResult['status']) =>
    game({
      sessionId: `g${n}`,
      status,
      completedAt: `2026-11-01T10:00:${String(n).padStart(2, '0')}.000Z`,
    });

  it('is zero with no games and counts the best run', () => {
    expect(longestRunWithoutGivingUp([])).toBe(0);
    expect(
      longestRunWithoutGivingUp([
        at(1, 'won'),
        at(2, 'won'),
        at(3, 'gave_up'),
        at(4, 'won'),
        at(5, 'lost'),
        at(6, 'won'),
      ]),
    ).toBe(3);
  });

  it('orders by time, not by the order given', () => {
    expect(
      longestRunWithoutGivingUp([at(3, 'gave_up'), at(1, 'won'), at(2, 'won'), at(4, 'won')]),
    ).toBe(2);
  });
});

describe('unlockAchievements', () => {
  it('records the unlock time, unseen, in definition order', () => {
    const out = unlockAchievements(
      player({ discover: gen1.slice(0, 25), practice: [game({})] }),
      entries,
      AT,
    );
    expect(out.newlyUnlocked).toEqual([
      'first-discovery',
      'collector',
      'perfect-instinct',
      'generation-1-expert',
    ]);
    expect(out.data.achievements['collector']).toEqual({ unlockedAt: AT, seen: false });
  });

  it('never unlocks twice, and keeps the original date', () => {
    const first = unlockAchievements(
      player({ discover: [25] }),
      entries,
      '2026-11-01T00:00:00.000Z',
    ).data;
    const again = unlockAchievements(first, entries, AT);
    expect(again.newlyUnlocked).toEqual([]);
    expect(again.data).toBe(first); // nothing changed, so the very same object comes back
    expect(again.data.achievements['first-discovery']?.unlockedAt).toBe('2026-11-01T00:00:00.000Z');
  });

  it('keeps an achievement unlocked even if its progress later shrinks', () => {
    const unlocked = unlockAchievements(player({ discover: [25] }), entries, AT).data;
    const shrunk = { ...unlocked, discoveries: {} };
    expect(
      unlockAchievements(shrunk, entries, AT).data.achievements['first-discovery']?.unlockedAt,
    ).toBe(AT);
  });

  it('can start unlocks as already seen (catching up on old progress)', () => {
    const out = unlockAchievements(player({ discover: [25] }), entries, AT, true);
    expect(out.data.achievements['first-discovery']).toEqual({ unlockedAt: AT, seen: true });
  });

  it('does not change the data it is given', () => {
    const data = player({ discover: [25] });
    unlockAchievements(data, entries, AT);
    expect(data.achievements).toEqual({});
  });

  it('can be driven by a custom list (the evaluator has no built-in rules)', () => {
    const custom = [
      {
        id: 'x',
        title: 'X',
        description: 'Two Pokémon',
        category: 'discovery' as const,
        icon: 'Star',
        target: 2,
        unit: 'Pokémon',
        progress: (c: { uniqueDiscoveries: number }) => c.uniqueDiscoveries,
      },
    ];
    expect(
      unlockAchievements(player({ discover: [1] }), entries, AT, false, custom as never)
        .newlyUnlocked,
    ).toEqual([]);
    expect(
      unlockAchievements(player({ discover: [1, 2] }), entries, AT, false, custom as never)
        .newlyUnlocked,
    ).toEqual(['x']);
  });
});

describe('viewAchievements', () => {
  it('reports locked, in-progress and unlocked, with progress capped at the target', () => {
    const data = unlockAchievements(player({ discover: gen1.slice(0, 30) }), entries, AT).data;
    const views = new Map(viewAchievements(data, entries, TODAY).map((v) => [v.definition.id, v]));
    expect(views.get('first-discovery')).toMatchObject({
      status: 'unlocked',
      progress: 1,
      unlockedAt: AT,
      isNew: true,
    });
    expect(views.get('collector')).toMatchObject({ status: 'unlocked', progress: 25 });
    expect(views.get('pokedex-pro')).toMatchObject({ status: 'in-progress', progress: 30 });
    expect(views.get('on-fire')).toMatchObject({ status: 'locked', progress: 0 });
  });

  it('lists all fifteen, in order', () => {
    expect(viewAchievements(player(), entries, TODAY).map((v) => v.definition.id)).toEqual(
      ACHIEVEMENTS.map((a) => a.id),
    );
  });

  it('shows an unlocked achievement as complete even if live progress has dropped', () => {
    const data = unlockAchievements(player({ discover: [25] }), entries, AT).data;
    const view = viewAchievements({ ...data, discoveries: {} }, entries, TODAY).find(
      (v) => v.definition.id === 'first-discovery',
    );
    expect(view).toMatchObject({ status: 'unlocked', progress: 1 });
  });
});

describe('markSeen', () => {
  it('marks only unlocked, unseen achievements', () => {
    const data = unlockAchievements(player({ discover: [25] }), entries, AT).data;
    const seen = markSeen(data, ['first-discovery', 'collector']);
    expect(seen.achievements['first-discovery']?.seen).toBe(true);
    expect(seen.achievements['collector']).toBeUndefined();
    expect(viewAchievements(seen, entries, TODAY)[0]!.isNew).toBe(false);
  });

  it('returns the same object when nothing changes', () => {
    const data = unlockAchievements(player({ discover: [25] }), entries, AT, true).data;
    expect(markSeen(data, ['first-discovery'])).toBe(data);
  });
});
