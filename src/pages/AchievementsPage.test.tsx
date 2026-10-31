import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../app/ProgressProvider.tsx';
import { createProgressStore } from '../app/progressStore.ts';
import { createEmptyProgress } from '../domain/progression/record.ts';
import type { Discovery, ProgressData } from '../domain/progression/types.ts';
import type { ProgressRepository } from '../persistence/localRepository.ts';
import { AchievementsPage } from './AchievementsPage.tsx';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const found = (id: number): Discovery => ({
  pokemonId: id,
  firstDiscoveredAt: '2026-11-03T10:00:00.000Z',
  lastDiscoveredAt: '2026-11-03T10:00:00.000Z',
  timesDiscovered: 1,
  modes: ['daily'],
});

/**
 * 30 Generation I discoveries (ids 1-30, which include 10 Pokémon of one type): First Discovery,
 * Collector, Generation I Expert and Type Specialist are unlocked; Pokédex Pro is in progress.
 */
function seeded(): ProgressData {
  const data = createEmptyProgress('2026-11-01T00:00:00.000Z', 'p');
  data.discoveries = Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => [i + 1, found(i + 1)]),
  );
  data.achievements = {
    'first-discovery': { unlockedAt: '2026-11-02T10:00:00.000Z', seen: true },
    collector: { unlockedAt: '2026-11-03T10:00:00.000Z', seen: false },
    'generation-1-expert': { unlockedAt: '2026-11-03T10:00:00.000Z', seen: true },
    'type-specialist': { unlockedAt: '2026-11-03T10:00:00.000Z', seen: true },
  };
  return data;
}

function renderPage(data = createEmptyProgress('2026-11-01T00:00:00.000Z', 'p')) {
  const repo: ProgressRepository = { mode: 'persistent', load: () => data, save() {} };
  return render(
    <ProgressProvider store={createProgressStore(repo)}>
      <AchievementsPage />
    </ProgressProvider>,
  );
}

const card = (title: string) => screen.getByRole('heading', { name: title }).closest('li')!;

describe('AchievementsPage: a new player', () => {
  it('lists all fifteen achievements, all locked', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Achievements' })).toBeInTheDocument();
    expect(screen.getByText(/of 15 unlocked/)).toBeInTheDocument();
    const cards = screen.getAllByRole('heading', { level: 3 }).map((h) => h.closest('li')!);
    expect(cards).toHaveLength(15);
    expect(cards.every((c) => c.dataset.status === 'locked')).toBe(true);
  });

  it('shows how to earn each one', () => {
    renderPage();
    expect(
      within(card('Unstoppable')).getByText('Reach a thirty-day daily streak.'),
    ).toBeInTheDocument();
    expect(
      within(card('No Looking Back')).getByText(/five games in a row without giving up/i),
    ).toBeInTheDocument();
  });

  it('shows empty progress bars with their targets', () => {
    renderPage();
    const bar = within(card('Collector')).getByRole('progressbar', { name: 'Collector progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '25');
    expect(within(card('Collector')).getByText('0 / 25 Pokémon')).toBeInTheDocument();
  });
});

describe('AchievementsPage: progress', () => {
  it('shows unlocked, in-progress and locked achievements', () => {
    renderPage(seeded());
    expect(card('First Discovery').dataset.status).toBe('unlocked');
    expect(card('Collector').dataset.status).toBe('unlocked');
    expect(card('Pokédex Pro').dataset.status).toBe('in-progress');
    expect(card('On Fire').dataset.status).toBe('locked');
  });

  it('counts the unlocked ones', () => {
    renderPage(seeded());
    expect(screen.getByRole('progressbar', { name: 'Achievements unlocked' })).toHaveAttribute(
      'aria-valuenow',
      '4',
    );
    expect(screen.getByText(/of 15 unlocked/).previousElementSibling).toHaveTextContent('4');
  });

  it('shows the unlock date', () => {
    renderPage(seeded());
    expect(
      within(card('First Discovery')).getByText('Unlocked 2 November 2026'),
    ).toBeInTheDocument();
    expect(within(card('Collector')).getByText('Unlocked 3 November 2026')).toBeInTheDocument();
  });

  it('shows a partial progress bar for an achievement in progress', () => {
    renderPage(seeded());
    const pro = card('Pokédex Pro');
    expect(within(pro).getByRole('progressbar', { name: 'Pokédex Pro progress' })).toHaveAttribute(
      'aria-valuenow',
      '30',
    );
    expect(within(pro).getByText('30 / 100 Pokémon')).toBeInTheDocument();
  });

  it('does not show a progress bar once unlocked', () => {
    renderPage(seeded());
    expect(within(card('Collector')).queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('flags achievements the player has not been shown yet', () => {
    renderPage(seeded());
    expect(within(card('Collector')).getByText('New')).toBeInTheDocument();
    expect(within(card('First Discovery')).queryByText('New')).not.toBeInTheDocument();
  });
});

describe('AchievementsPage: categories', () => {
  it('groups achievements by category', () => {
    renderPage();
    const counts = Object.fromEntries(
      ['Discovery', 'Collection', 'Skill', 'Streak', 'Dedication'].map((name) => {
        const section = screen
          .getByRole('heading', { level: 2, name: new RegExp(`^${name}`) })
          .closest('section')!;
        return [name, within(section).getAllByRole('heading', { level: 3 }).length];
      }),
    );
    expect(counts).toEqual({ Discovery: 3, Collection: 4, Skill: 3, Streak: 3, Dedication: 2 });
  });

  it('filters to one category and back', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Streak' }));
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'On Fire',
      'Dedicated Trainer',
      'Unstoppable',
    ]);
    expect(screen.getByRole('button', { name: 'Streak' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(15);
  });

  it('shows how many of each category are unlocked', () => {
    renderPage(seeded());
    const collection = screen.getByRole('heading', { level: 2, name: /^Collection/ });
    expect(collection).toHaveTextContent('3/4'); // Collector, Generation I Expert, Type Specialist
  });
});
