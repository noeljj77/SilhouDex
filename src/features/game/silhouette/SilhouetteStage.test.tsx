import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REVEAL_FRACTIONS } from '../../../domain/game/config.ts';
import { computeRevealOrder } from '../../../domain/reveal/mask.ts';
import type { ProcessedArtwork } from './processArtwork.ts';
import { REVEAL_MS, RevealCanvas } from './RevealCanvas.tsx';
import { SilhouetteStage } from './SilhouetteStage.tsx';

const SIZE = 20;
const artwork: ProcessedArtwork = {
  silhouette: document.createElement('canvas'),
  colorUrl: 'blob:color-artwork',
  width: 400,
  height: 300,
  alpha: new Uint8ClampedArray(SIZE * SIZE).fill(255),
  alphaWidth: SIZE,
  alphaHeight: SIZE,
};
const order = computeRevealOrder(
  { alpha: artwork.alpha, width: SIZE, height: SIZE },
  'daily:#1|25',
);

const canvasOf = (container: HTMLElement) => container.querySelector('canvas')!;

describe('SilhouetteStage', () => {
  it.each(REVEAL_FRACTIONS.map((f, stage) => [stage, f] as const))(
    'stage %i reveals %f of the shape',
    (stage, fraction) => {
      const { container } = render(
        <SilhouetteStage status="ready" artwork={artwork} order={order} stage={stage} />,
      );
      expect(canvasOf(container).dataset.fraction).toBe(String(fraction));
      expect(screen.getByRole('img')).toHaveAccessibleName(
        `Mystery Pokémon silhouette, ${Math.round(fraction * 100)}% revealed`,
      );
    },
  );

  it('clamps a stage outside the valid range', () => {
    const high = render(
      <SilhouetteStage status="ready" artwork={artwork} order={order} stage={99} />,
    );
    expect(canvasOf(high.container).dataset.fraction).toBe('1');
    high.unmount();
    const low = render(
      <SilhouetteStage status="ready" artwork={artwork} order={order} stage={-4} />,
    );
    expect(canvasOf(low.container).dataset.fraction).toBe('0.12');
  });

  it('is one smooth picture: no grid, no tiles, no hint at the shape', () => {
    const { container } = render(
      <SilhouetteStage status="ready" artwork={artwork} order={order} stage={0} />,
    );
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    expect(container.querySelector('[data-tile]')).toBeNull();
    expect(container.querySelector('.shimmer')).toBeNull();
    expect(container.innerHTML).not.toMatch(/linear-gradient\(to (right|bottom)/);
  });

  it('has faint sparkles in the backdrop, which are hidden from screen readers', () => {
    const { container } = render(
      <SilhouetteStage status="ready" artwork={artwork} order={order} stage={0} />,
    );
    const sparkles = container.querySelectorAll('.sparkle');
    expect(sparkles.length).toBeGreaterThanOrEqual(12);
    expect(sparkles[0]!.closest('[aria-hidden]')).not.toBeNull();
  });

  it('also shows sparkles while loading', () => {
    const { container } = render(<SilhouetteStage status="loading" stage={0} />);
    expect(container.querySelectorAll('.sparkle').length).toBeGreaterThan(0);
  });

  it('keeps the colour artwork and its web address out of the page until solved', () => {
    const { container, rerender } = render(
      <SilhouetteStage status="ready" artwork={artwork} order={order} stage={5} />,
    );
    expect(container.innerHTML).not.toContain('blob:color-artwork');
    expect(container.innerHTML).not.toMatch(/official-artwork|githubusercontent|pokeapi/i);
    rerender(<SilhouetteStage status="ready" artwork={artwork} order={order} stage={5} solved />);
    expect(container.innerHTML).toContain('blob:color-artwork');
    expect(screen.getByRole('img', { name: 'Revealed Pokémon artwork' })).toBeInTheDocument();
  });

  it('sizes the picture to the artwork shape (wide and tall)', () => {
    const wide = render(
      <SilhouetteStage status="ready" artwork={artwork} order={order} stage={0} />,
    );
    expect(wide.container.querySelector<HTMLElement>('.relative.max-h-full')!.style.width).toBe(
      '100%',
    );
    wide.unmount();
    const tall = render(
      <SilhouetteStage
        status="ready"
        artwork={{ ...artwork, width: 300, height: 400 }}
        order={order}
        stage={0}
      />,
    );
    expect(tall.container.querySelector<HTMLElement>('.relative.max-h-full')!.style.height).toBe(
      '100%',
    );
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
});

/** A canvas that records what is drawn, so the animation can be checked without a browser. */
function fakeCanvas() {
  const operations: string[] = [];
  const masks: Uint8ClampedArray[] = [];
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    let op = 'source-over';
    return {
      createImageData: (w: number, h: number) => {
        const image = { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
        masks.push(image.data);
        return image;
      },
      putImageData: () => {},
      clearRect: () => {},
      drawImage: () => operations.push(`draw:${op}`),
      get globalCompositeOperation() {
        return op;
      },
      set globalCompositeOperation(v: string) {
        op = v;
      },
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'low',
    } as unknown as CanvasRenderingContext2D;
  });
  /** Share of pixels at least half visible in the most recent mask. */
  const visible = () => {
    const mask = masks.at(-1)!;
    let shown = 0;
    for (let i = 3; i < mask.length; i += 4) if (mask[i]! >= 128) shown += 1;
    return shown / (mask.length / 4);
  };
  /** Mean opacity of the most recent mask. */
  const opacity = () => {
    const mask = masks.at(-1)!;
    let sum = 0;
    for (let i = 3; i < mask.length; i += 4) sum += mask[i]!;
    return sum / (mask.length / 4) / 255;
  };
  return { operations, visible, opacity, restore: () => spy.mockRestore() };
}

describe('RevealCanvas animation', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const props = (fraction: number, reduceMotion = false) => (
    <RevealCanvas artwork={artwork} order={order} fraction={fraction} reduceMotion={reduceMotion} />
  );

  it('cuts the silhouette with the mask (draws it, then keeps only what the mask shows)', () => {
    const canvas = fakeCanvas();
    render(props(0.12));
    expect(canvas.operations).toEqual(['draw:source-over', 'draw:destination-in']);
  });

  it('opens at the right share straight away', () => {
    const canvas = fakeCanvas();
    render(props(0.12));
    expect(canvas.visible()).toBeGreaterThan(0.08);
    expect(canvas.visible()).toBeLessThan(0.17);
  });

  it('melts smoothly to the next stage, passing through in-between states', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const canvas = fakeCanvas();
    const { rerender } = render(props(0.12));
    const before = canvas.opacity();

    rerender(props(0.3));
    const samples: number[] = [];
    for (let t = 0; t < REVEAL_MS + 200; t += 100) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
      samples.push(canvas.opacity());
    }
    // It never jumps backwards, takes many small steps, and ends at the new share.
    for (let i = 1; i < samples.length; i++)
      expect(samples[i]!).toBeGreaterThanOrEqual(samples[i - 1]! - 1e-9);
    expect(new Set(samples.map((s) => s.toFixed(3))).size).toBeGreaterThan(6);
    expect(samples[0]!).toBeGreaterThan(before - 1e-9);
    expect(samples.at(-1)!).toBeGreaterThan(samples[0]!);
    expect(canvas.visible()).toBeGreaterThan(0.26);
    expect(canvas.visible()).toBeLessThan(0.36);
  });

  it('shows the first frames gently, not all at once (eased start)', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const canvas = fakeCanvas();
    const { rerender } = render(props(0.12));
    const start = canvas.opacity();
    rerender(props(1));
    act(() => {
      vi.advanceTimersByTime(REVEAL_MS * 0.1);
    });
    const early = canvas.opacity();
    act(() => {
      vi.advanceTimersByTime(REVEAL_MS * 2);
    });
    const end = canvas.opacity();
    expect(end).toBeCloseTo(1, 1);
    expect(early - start).toBeLessThan((end - start) * 0.1);
  });

  it('jumps straight there when the player prefers reduced motion', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const canvas = fakeCanvas();
    const { rerender } = render(props(0.12, true));
    rerender(props(0.66, true));
    expect(canvas.visible()).toBeGreaterThan(0.6);
    expect(canvas.visible()).toBeLessThan(0.72);
  });

  it('starts a new Pokémon at its own share, without animating from the old one', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const canvas = fakeCanvas();
    const { rerender } = render(props(1));
    const otherOrder = computeRevealOrder(
      { alpha: artwork.alpha, width: SIZE, height: SIZE },
      'daily:#2|4',
    );
    rerender(
      <RevealCanvas artwork={artwork} order={otherOrder} fraction={0.12} reduceMotion={false} />,
    );
    expect(canvas.visible()).toBeLessThan(0.17);
  });

  it('keeps going from where it is if the stage changes again mid-reveal', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    const canvas = fakeCanvas();
    const { rerender } = render(props(0.12));
    rerender(props(0.48));
    act(() => {
      vi.advanceTimersByTime(REVEAL_MS / 2);
    });
    const midway = canvas.opacity();
    rerender(props(0.66));
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(Math.abs(canvas.opacity() - midway)).toBeLessThan(0.05); // no jump when redirected
  });
});
