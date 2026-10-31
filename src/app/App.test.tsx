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

  it('switches pages when the address changes', () => {
    render(<App />);
    go('#/practice');
    expect(screen.getByRole('heading', { name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-current', 'page');
    go('#/pokedex');
    expect(screen.getByRole('heading', { name: 'Pokédex' })).toBeInTheDocument();
  });

  it('falls back to the Daily game for an unknown address', () => {
    window.location.hash = '#/nonsense';
    render(<App />);
    expect(screen.getByRole('link', { name: 'Daily' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the developer lab reachable but out of the menu', () => {
    window.location.hash = '#/lab';
    render(<App />);
    expect(screen.getByText(/Silhouette Lab/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).not.toHaveTextContent(/lab/i);
  });
});
