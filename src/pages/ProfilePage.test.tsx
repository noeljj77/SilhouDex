import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../app/ProgressProvider.tsx';
import { createProgressStore } from '../app/progressStore.ts';
import type { GameResult } from '../domain/game/types.ts';
import { createEmptyProgress } from '../domain/progression/record.ts';
import type { ProgressData } from '../domain/progression/types.ts';
import type { ProgressRepository, StorageMode } from '../persistence/localRepository.ts';
import type { DateKey } from '../lib/utcDate.ts';
import { ProfilePage } from './ProfilePage.tsx';

const TODAY = '2026-11-10';
const JOINED = '2026-10-31T10:00:00.000Z';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
});
afterEach(() => vi.useRealTimers());

const daily = (
  key: string,
  status: GameResult['status'],
  score: number,
  wrong: number,
): GameResult => ({
  sessionId: `daily-${key}`,
  mode: 'daily',
  pokemonId: 25,
  status,
  score,
  wrongGuesses: wrong,
  revealsUsed: Math.min(wrong, 5),
  completedAt: `${key}T09:00:00.000Z`,
  dateKey: key as DateKey,
  challengeNumber: 1,
});
const practice = (id: string, status: GameResult['status'], score: number): GameResult => ({
  sessionId: id,
  mode: 'practice',
  pokemonId: 4,
  status,
  score,
  wrongGuesses: 0,
  revealsUsed: 0,
  completedAt: `${TODAY}T08:00:00.000Z`,
});

function seeded(): ProgressData {
  const data = createEmptyProgress(JOINED, 'p');
  const results = [
    daily('2026-10-31', 'won', 100, 0),
    daily('2026-11-01', 'won', 85, 1),
    daily('2026-11-02', 'won', 70, 2),
    daily('2026-11-03', 'gave_up', 0, 0),
    daily('2026-11-04', 'won', 100, 0),
    // 5th, 6th and 7th missed
    daily('2026-11-08', 'won', 100, 0),
    daily('2026-11-09', 'lost', 0, 6),
    daily('2026-11-10', 'won', 85, 1),
  ];
  data.daily.results = Object.fromEntries(results.map((r) => [r.dateKey!, r]));
  data.practice.results = [
    practice('a', 'won', 100),
    practice('b', 'won', 40),
    practice('c', 'gave_up', 0),
    practice('d', 'lost', 0),
  ];
  data.discoveries = {
    25: {
      pokemonId: 25,
      firstDiscoveredAt: JOINED,
      lastDiscoveredAt: JOINED,
      timesDiscovered: 1,
      modes: ['daily'],
    },
    4: {
      pokemonId: 4,
      firstDiscoveredAt: JOINED,
      lastDiscoveredAt: JOINED,
      timesDiscovered: 1,
      modes: ['practice'],
    },
  };
  return data;
}

function renderProfile(
  data: ProgressData = createEmptyProgress(JOINED, 'p'),
  mode: StorageMode = 'persistent',
) {
  const repo: ProgressRepository = { mode, load: () => data, save() {} };
  return render(
    <ProgressProvider store={createProgressStore(repo)}>
      <ProfilePage />
    </ProgressProvider>,
  );
}

const card = (label: string) => screen.getByText(label, { selector: 'dt' }).closest('div')!;
const dailyStats = () => screen.getByRole('region', { name: 'Daily statistics' });
const inDaily = (label: string) =>
  within(dailyStats()).getByText(label, { selector: 'dt' }).closest('div')!;

describe('ProfilePage: a new player', () => {
  it('shows empty streaks and invites the first game', () => {
    renderProfile();
    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();
    expect(within(card('Current streak')).getByText('0')).toBeInTheDocument();
    expect(within(card('Longest streak')).getByText('0')).toBeInTheDocument();
    expect(within(card('Completed')).getByText('0')).toBeInTheDocument();
    expect(within(card('Today')).getByRole('link', { name: /Not played yet/ })).toHaveAttribute(
      'href',
      '#/daily',
    );
    expect(screen.getByText(/Finish your first daily challenge/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Guess distribution/ })).not.toBeInTheDocument();
  });

  it('shows the current month in the calendar, with nowhere earlier to go before launch month', () => {
    renderProfile();
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  it('shows practice and collection placeholders', () => {
    renderProfile();
    expect(screen.getByText('0', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/of 1025 Pokémon discovered \(0%\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Pokédex/ })).toHaveAttribute('href', '#/pokedex');
  });
});

describe('ProfilePage: an active player', () => {
  it('shows current streak, longest streak and total completed', () => {
    renderProfile(seeded());
    expect(within(card('Current streak')).getByText('3')).toBeInTheDocument(); // 8th, 9th, 10th
    expect(within(card('Longest streak')).getByText('5')).toBeInTheDocument(); // 31 Oct – 4 Nov
    expect(within(card('Completed')).getByText('8')).toBeInTheDocument();
  });

  it('shows today’s result instead of a prompt once played', () => {
    renderProfile(seeded());
    const today = card('Today');
    expect(within(today).getByText('85')).toBeInTheDocument();
    expect(within(today).queryByRole('link')).not.toBeInTheDocument();
  });

  it('marks each calendar day by how it went', () => {
    renderProfile(seeded());
    const day = (label: string) => screen.getByRole('img', { name: label });
    expect(day('1 November: Won, 85 points')).toBeInTheDocument();
    expect(day('3 November: Gave up, 0 points')).toBeInTheDocument();
    expect(day('9 November: Lost, 0 points')).toBeInTheDocument();
    expect(day('10 November: Won, 85 points')).toBeInTheDocument();
    expect(day('6 November: Missed')).toBeInTheDocument();
    expect(day('11 November: Upcoming')).toBeInTheDocument();
  });

  it('shows daily statistics counted only from daily games', () => {
    renderProfile(seeded());
    expect(within(inDaily('Played')).getByText('8')).toBeInTheDocument();
    expect(within(inDaily('Win rate')).getByText('75%')).toBeInTheDocument(); // 6 of 8
    expect(inDaily('Win rate')).toHaveTextContent('6 won · 1 lost · 1 gave up');
    expect(within(inDaily('Perfect games')).getByText('3')).toBeInTheDocument();
  });

  it('describes the guess distribution for screen readers', () => {
    renderProfile(seeded());
    const chart = screen.getByRole('img', { name: /Guess distribution/ });
    expect(chart).toHaveAccessibleName(/Solved on the first guess: 3/);
    expect(chart).toHaveAccessibleName(/Solved after 1 wrong guess: 2/);
    expect(chart).toHaveAccessibleName(/Not solved \(lost or gave up\): 2/);
    const table = screen.getByRole('table', { name: 'Wrong guesses before solving' });
    expect(
      within(table).getByRole('row', { name: /Solved after 2 wrong guesses 1/ }),
    ).toBeInTheDocument();
  });

  it('keeps practice games out of the daily numbers', () => {
    renderProfile(seeded());
    const practiceSection = screen.getByRole('region', { name: 'Practice' });
    expect(within(practiceSection).getByText('4')).toBeInTheDocument(); // played
    expect(within(practiceSection).getByText('50%')).toBeInTheDocument(); // 2 of 4
    expect(within(card('Completed')).getByText('8')).toBeInTheDocument(); // unchanged by practice
  });

  it('counts discoveries from both modes', () => {
    renderProfile(seeded());
    expect(screen.getByText(/of 1025 Pokémon discovered \(0\.2%\)/)).toBeInTheDocument();
  });
});

describe('ProfilePage: calendar navigation', () => {
  it('moves back to a month you played in, and forward again', async () => {
    const user = userEvent.setup();
    renderProfile(seeded());
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '31 October: Won, 100 points' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '30 October: Before you started' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
  });

  it('lists the weekdays starting on Monday', () => {
    renderProfile(seeded());
    const calendar = screen.getByRole('table', { name: /Daily challenge results for/ });
    const heads = within(calendar)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(heads).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });
});

describe('ProfilePage: storage warnings', () => {
  it('warns when the browser blocks storage', () => {
    renderProfile(undefined, 'memory');
    expect(screen.getByRole('status')).toHaveTextContent(/blocking storage/);
  });

  it('warns when data comes from a newer version', () => {
    renderProfile(undefined, 'read-only');
    expect(screen.getByRole('status')).toHaveTextContent(/newer version/);
  });

  it('shows no warning when storage works', () => {
    renderProfile();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
