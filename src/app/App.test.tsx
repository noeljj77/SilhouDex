import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App.tsx';

describe('App', () => {
  it('renders the SilhouDex brand and tagline', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'SilhouDex' })).toBeInTheDocument();
    expect(screen.getByText('Every shadow has a story.')).toBeInTheDocument();
  });
});
