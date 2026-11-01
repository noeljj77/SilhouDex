import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';

// The real loaders need the network and a browser canvas; here they simply never finish.
vi.mock('../features/game/silhouette/processArtwork.ts', () => ({
  processArtwork: () => new Promise(() => {}),
}));
vi.mock('../data/defaultRepository.ts', () => ({
  pokemonRepository: { getDetails: () => new Promise(() => {}) },
}));

afterEach(() => {
  window.location.hash = '';
});

const go = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

describe('App', () => {
  it('shows the brand and the five main sections', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'SilhouDex' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const label of ['Daily', 'Practice', 'Pokédex', 'Awards', 'Profile']) {
      expect(nav).toHaveTextContent(label);
    }
  });

  it('opens on the Daily game and marks it as the current page', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: 'Daily' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Practice' })).not.toHaveAttribute('aria-current');
  });

  it('shows a loading silhouette while the artwork loads', () => {
    render(<App />);
    expect(screen.getByText('Loading silhouette…')).toBeInTheDocument();
  });

  it('switches pages when the address changes (pages load on demand)', async () => {
    render(<App />);
    go('#/practice');
    expect(await screen.findByRole('heading', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-current', 'page');
    go('#/pokedex');
    expect(await screen.findByRole('heading', { name: 'Pokédex' })).toBeInTheDocument();
  });

  it('shows a loading message while a page is on its way', () => {
    render(<App />);
    go('#/achievements');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('opens the Achievements page', async () => {
    window.location.hash = '#/achievements';
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Achievements' }),
    ).toBeInTheDocument();
  });

  it('opens the Profile page (loaded on demand)', { timeout: 20_000 }, async () => {
    window.location.hash = '#/profile';
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Profile' }, { timeout: 15_000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { name: 'Daily streak' })).toBeInTheDocument();
  });

  it('falls back to the Daily game for an unknown address', () => {
    window.location.hash = '#/nonsense';
    render(<App />);
    expect(screen.getByRole('link', { name: 'Daily' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the developer lab reachable but out of the menu', async () => {
    window.location.hash = '#/lab';
    render(<App />);
    expect(await screen.findByText(/Silhouette Lab/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).not.toHaveTextContent(/lab/i);
  });
});
