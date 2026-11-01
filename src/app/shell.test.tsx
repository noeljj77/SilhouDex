import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

function Boom(): never {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  it('shows a friendly screen instead of a blank page when something crashes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveTextContent('Your progress is saved on this device');
    expect(screen.getByRole('link', { name: 'Back to the Daily game' })).toHaveAttribute(
      'href',
      '#/daily',
    );
    expect(screen.queryByText('kaboom')).not.toBeInTheDocument(); // no technical details for players
  });

  it('reloads the page on request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reload the page' }));
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('logs the error for developers', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(log.mock.calls.some((call) => String(call[0]).includes('unexpected error'))).toBe(true);
  });

  it('renders its children when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});

describe('AppShell', () => {
  it('recovers when you move to another page after a crash', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <AppShell route="daily">
        <Boom />
      </AppShell>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(
      <AppShell route="practice">
        <p>Practice page</p>
      </AppShell>,
    );
    expect(screen.getByText('Practice page')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the navigation working even when the page crashed', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AppShell route="daily">
        <Boom />
      </AppShell>,
    );
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  it('shows the fan-project disclaimer and credits PokéAPI', () => {
    render(
      <AppShell route="daily">
        <p>content</p>
      </AppShell>,
    );
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(/unofficial fan project/i);
    expect(footer).toHaveTextContent(/not affiliated with Nintendo/i);
    expect(screen.getByRole('link', { name: 'PokéAPI' })).toHaveAttribute(
      'href',
      'https://pokeapi.co/',
    );
    const source = screen.getByRole('link', { name: 'Source on GitHub' });
    expect(source).toHaveAttribute('href', 'https://github.com/noeljj77/SilhouDex');
    expect(source).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('says nothing while online', () => {
    render(
      <AppShell route="daily">
        <p>content</p>
      </AppShell>,
    );
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it('tells the player when they go offline, and clears the notice when they are back', () => {
    render(
      <AppShell route="daily">
        <p>content</p>
      </AppShell>,
    );
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(/You’re offline/);
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });
});
