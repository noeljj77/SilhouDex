import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../../app/ProgressProvider.tsx';
import { createProgressStore } from '../../app/progressStore.ts';
import { CloudProvider } from '../../cloud/CloudProvider.tsx';
import type { CloudController, CloudState } from '../../cloud/syncController.ts';
import { createEmptyProgress } from '../../domain/progression/record.ts';
import { AccountButton } from './AccountButton.tsx';
import { AccountSection } from './AccountSection.tsx';

const NOW = '2026-11-02T10:00:00.000Z';

function setup(state: Partial<CloudState> | null) {
  const store = createProgressStore(
    { mode: 'persistent', load: () => createEmptyProgress(NOW, 'p'), save: () => {} },
    { catalogue: [] },
  );
  const current: CloudState = {
    status: 'signed-out',
    user: null,
    message: '',
    lastSyncedAt: null,
    ...state,
  };
  const controller = {
    getState: () => current,
    subscribe: () => () => {},
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn(),
    dispose: vi.fn(),
  } satisfies CloudController;
  render(
    <ProgressProvider store={store}>
      <CloudProvider controller={state ? controller : undefined}>
        <AccountButton />
        <AccountSection />
      </CloudProvider>
    </ProgressProvider>,
  );
  return controller;
}

describe('sign-in controls', () => {
  it('show nothing when no Firebase project is set up', () => {
    setup(null);
    expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull();
    expect(screen.queryByText('Save your progress')).toBeNull();
  });

  it('offer Google sign-in when signed out, and start it on a click', async () => {
    const controller = setup({});
    expect(screen.getByText('Save your progress')).toBeInTheDocument();
    // One in the header and one on the Profile page.
    const buttons = screen.getAllByRole('button', { name: 'Sign in with Google' });
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[0]!);
    expect(controller.signIn).toHaveBeenCalledTimes(1);
  });

  it('show the player and let them sign out when signed in', async () => {
    const controller = setup({
      status: 'synced',
      user: { uid: 'u', name: 'Ash Ketchum', photoUrl: null },
      lastSyncedAt: NOW,
    });
    expect(screen.getByText('Ash Ketchum')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Progress saved to your account/);
    expect(screen.getByRole('link', { name: /Ash Ketchum, signed in/ })).toHaveAttribute(
      'href',
      '#/profile',
    );
    await userEvent.click(screen.getByRole('button', { name: /Sign out/ }));
    expect(controller.signOut).toHaveBeenCalledTimes(1);
  });

  it('explain a sync problem to a signed-in player', () => {
    setup({
      status: 'error',
      user: { uid: 'u', name: 'Ash', photoUrl: null },
      message: 'Could not reach the cloud. Your progress is still saved on this device.',
    });
    expect(screen.getByRole('status')).toHaveTextContent(/still saved on this device/);
  });
});
