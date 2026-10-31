import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';

// The real processor needs a browser canvas; here the artwork simply never finishes loading.
vi.mock('../features/game/silhouette/processArtwork.ts', () => ({
  processArtwork: () => new Promise(() => {}),
}));

describe('App', () => {
  it('renders the SilhouDex brand and tagline', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'SilhouDex' })).toBeInTheDocument();
    expect(screen.getByText('Every shadow has a story.')).toBeInTheDocument();
  });

  it('shows the silhouette stage while artwork loads', () => {
    render(<App />);
    expect(screen.getByText('Loading silhouette…')).toBeInTheDocument();
  });
});
