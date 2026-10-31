import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../../app/ProgressProvider.tsx';
import { createProgressStore, type ProgressStore } from '../../app/progressStore.ts';
import { createEmptyProgress } from '../../domain/progression/record.ts';
import type { AchievementState } from '../../domain/progression/types.ts';
import type { ProgressRepository } from '../../persistence/localRepository.ts';
import { AchievementToaster, TOAST_MS } from './AchievementToaster.tsx';

afterEach(() => vi.useRealTimers());

function setup(achievements: Record<string, AchievementState>): ProgressStore {
  const data = { ...createEmptyProgress('2026-11-01T00:00:00.000Z', 'p'), achievements };
  const repo: ProgressRepository = { mode: 'persistent', load: () => data, save() {} };
  const store = createProgressStore(repo);
  render(
    <ProgressProvider store={store}>
      <AchievementToaster />
    </ProgressProvider>,
  );
  return store;
}

const unseen = (at = '2026-11-02T10:00:00.000Z'): AchievementState => ({
  unlockedAt: at,
  seen: false,
});
const seen = (): AchievementState => ({ unlockedAt: '2026-11-01T10:00:00.000Z', seen: true });

describe('AchievementToaster', () => {
  it('announces a newly unlocked achievement', () => {
    setup({ 'perfect-instinct': unseen() });
    expect(screen.getByText('Achievement unlocked')).toBeInTheDocument();
    expect(screen.getByText('Perfect Instinct')).toBeInTheDocument();
    expect(screen.getByText('Guess correctly without revealing a clue.')).toBeInTheDocument();
  });

  it('stays quiet when there is nothing new', () => {
    setup({ 'perfect-instinct': seen() });
    expect(screen.queryByText('Achievement unlocked')).not.toBeInTheDocument();
  });

  it('ignores ids it does not know', () => {
    setup({ 'from-a-future-version': unseen() });
    expect(screen.queryByText('Achievement unlocked')).not.toBeInTheDocument();
  });

  it('shows several at once, oldest first, up to three', () => {
    setup({
      'first-discovery': unseen('2026-11-02T10:00:03.000Z'),
      collector: unseen('2026-11-02T10:00:01.000Z'),
      'sharp-eyes': unseen('2026-11-02T10:00:02.000Z'),
      'on-fire': unseen('2026-11-02T10:00:04.000Z'),
    });
    expect(screen.getAllByText('Achievement unlocked')).toHaveLength(3);
    const titles = ['Collector', 'Sharp Eyes', 'First Discovery'].map((t) => screen.getByText(t));
    expect(titles).toHaveLength(3);
    expect(screen.queryByText('On Fire')).not.toBeInTheDocument();
  });

  it('marks it as seen when dismissed, and it goes away', async () => {
    const user = userEvent.setup();
    const store = setup({ collector: unseen() });
    await user.click(screen.getByRole('button', { name: 'Dismiss Collector' }));
    expect(store.getSnapshot().achievements['collector']?.seen).toBe(true);
    await waitFor(() => expect(screen.queryByText('Collector')).not.toBeInTheDocument(), {
      timeout: 5000,
    });
  });

  it('marks it as seen on its own after a few seconds', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const store = setup({ collector: unseen() });
    expect(store.getSnapshot().achievements['collector']?.seen).toBe(false);
    act(() => {
      vi.advanceTimersByTime(TOAST_MS - 100);
    });
    expect(store.getSnapshot().achievements['collector']?.seen).toBe(false);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(store.getSnapshot().achievements['collector']?.seen).toBe(true);
  });

  it('shows a late unlock after an earlier one has been dismissed', async () => {
    const user = userEvent.setup();
    const store = setup({ collector: unseen() });
    await user.click(screen.getByRole('button', { name: 'Dismiss Collector' }));
    act(() => {
      store.finishGame({
        id: 'practice-1',
        mode: 'practice',
        pokemonId: 25,
        guesses: [{ pokemonId: 25, correct: true, at: '2026-11-03T10:00:00.000Z' }],
        status: 'won',
        startedAt: '2026-11-03T09:59:00.000Z',
        endedAt: '2026-11-03T10:00:00.000Z',
      });
    });
    expect(await screen.findByText('First Discovery')).toBeInTheDocument();
    expect(screen.getByText('Perfect Instinct')).toBeInTheDocument();
  });
});
