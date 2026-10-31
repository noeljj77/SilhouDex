import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { planReveal } from '../../../domain/reveal/tiles.ts';
import type { ProcessedArtwork } from './processArtwork.ts';
import { SilhouetteStage } from './SilhouetteStage.tsx';

const artwork: ProcessedArtwork = {
  silhouetteUrl: 'blob:silhouette',
  colorUrl: 'blob:color',
  grid: { cols: 4, rows: 3, coverage: Array.from({ length: 12 }, () => 1) },
  width: 400,
  height: 300,
};
const plan = planReveal(artwork.grid, 'daily:#1');

const tilesIn = (container: HTMLElement) => container.querySelectorAll('[data-tile]');

describe('SilhouetteStage', () => {
  it('shows only the tiles of the current stage', () => {
    for (const stage of [0, 1, 2, 3, 4, 5]) {
      const { container, unmount } = render(
        <SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={stage} />,
      );
      expect(tilesIn(container)).toHaveLength(plan.stageCounts[stage]!);
      unmount();
    }
  });

  it('shows the same tiles, in the same order, for the same plan', () => {
    const a = render(<SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={2} />);
    const idsA = [...tilesIn(a.container)].map((t) => t.getAttribute('data-tile'));
    a.unmount();
    const b = render(<SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={2} />);
    const idsB = [...tilesIn(b.container)].map((t) => t.getAttribute('data-tile'));
    expect(idsA).toEqual(idsB);
    expect(idsA).toEqual(plan.order.slice(0, plan.stageCounts[2]).map(String));
  });

  it('adds tiles as the stage grows and keeps the earlier ones', () => {
    const { container, rerender } = render(
      <SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={0} />,
    );
    const before = new Set([...tilesIn(container)].map((t) => t.getAttribute('data-tile')));
    rerender(<SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={1} />);
    const after = new Set([...tilesIn(container)].map((t) => t.getAttribute('data-tile')));
    expect(after.size).toBeGreaterThan(before.size);
    for (const id of before) expect(after.has(id)).toBe(true);
  });

  it('describes the picture without naming the Pokémon', () => {
    render(<SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={1} />);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toMatch(/^Mystery Pokémon silhouette, \d+% revealed$/);
  });

  it('keeps the colour artwork out of the page until solved', () => {
    const { container, rerender } = render(
      <SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={5} />,
    );
    expect(container.innerHTML).not.toContain('blob:color');
    rerender(<SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={5} solved />);
    expect(container.innerHTML).toContain('blob:color');
    expect(screen.getByRole('img', { name: 'Revealed Pokémon artwork' })).toBeInTheDocument();
  });

  it('never puts the artwork web address in the page (it contains the Pokémon number)', () => {
    const { container } = render(
      <SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={3} />,
    );
    expect(container.innerHTML).not.toMatch(/official-artwork|githubusercontent|pokeapi/i);
  });

  it('hides the hint grid once everything is revealed', () => {
    const early = render(
      <SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={0} />,
    );
    expect(early.container.querySelector('.shimmer')).not.toBeNull();
    early.unmount();
    const done = render(<SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={5} />);
    expect(done.container.querySelector('.shimmer')).toBeNull();
  });

  it('sizes the picture to the artwork shape (wide and tall)', () => {
    const wide = render(<SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={0} />);
    const wideBox = wide.container.querySelector<HTMLElement>('.relative.max-h-full')!;
    expect(wideBox.style.width).toBe('100%');
    wide.unmount();

    const tall: ProcessedArtwork = { ...artwork, width: 300, height: 400 };
    const tallRender = render(
      <SilhouetteStage status="ready" artwork={tall} plan={plan} stage={0} />,
    );
    const tallBox = tallRender.container.querySelector<HTMLElement>('.relative.max-h-full')!;
    expect(tallBox.style.height).toBe('100%');
  });

  it('shows a loading state', () => {
    render(<SilhouetteStage status="loading" stage={0} />);
    expect(screen.getByText('Loading silhouette…')).toBeInTheDocument();
  });

  it('shows an error with a working retry button', async () => {
    const onRetry = vi.fn();
    render(<SilhouetteStage status="error" stage={0} onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText(/could not load/i)).toBeInTheDocument();
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('clamps a stage outside the valid range', () => {
    const { container } = render(
      <SilhouetteStage status="ready" artwork={artwork} plan={plan} stage={99} />,
    );
    expect(tilesIn(container)).toHaveLength(plan.order.length);
  });
});
