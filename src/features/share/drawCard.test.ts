import { describe, expect, it, vi } from 'vitest';
import type { ShareData } from '../../domain/share/text.ts';
import { CARD_HEIGHT, CARD_WIDTH, drawShareCard, type CardArtwork } from './drawCard.ts';

const data = (over: Partial<ShareData> = {}): ShareData => ({
  challengeNumber: 12,
  status: 'won',
  score: 70,
  wrongGuesses: 2,
  revealsUsed: 2,
  streak: 4,
  ...over,
});

/** A canvas context that records every call, so drawing can be checked without a browser. */
function recorder() {
  const texts: string[] = [];
  const images: unknown[] = [];
  const fills: unknown[] = [];
  const gradient = { addColorStop: vi.fn() };
  const state = { fillStyle: '' as unknown };
  const ctx = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'fillText') return (value: string) => texts.push(value);
        if (prop === 'drawImage') return (...args: unknown[]) => images.push(args);
        if (prop === 'fill') return () => fills.push(state.fillStyle);
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient')
          return () => gradient;
        if (prop in state) return state[prop as keyof typeof state];
        return () => {};
      },
      set(_t, prop: string, value) {
        (state as Record<string, unknown>)[prop] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, images, fills };
}

const artwork: CardArtwork = { image: {} as CanvasImageSource, width: 400, height: 300 };
const NAME = 'Seismitoad';

describe('drawShareCard: spoiler-free', () => {
  it('shows the branding, challenge number, score and stats', () => {
    const { ctx, texts } = recorder();
    drawShareCard(ctx, data(), { spoilers: false });
    expect(texts).toEqual(
      expect.arrayContaining([
        'SilhouDex',
        'Every shadow has a story.',
        'Daily Silhouette · #12',
        '70',
        '/100',
        'Solved',
      ]),
    );
    expect(texts).toEqual(
      expect.arrayContaining(['2', '4', 'Wrong guesses', 'Reveals', 'Day streak']),
    );
  });

  it('shows a question mark, and never the Pokémon, even if they are handed in', () => {
    const { ctx, texts, images } = recorder();
    drawShareCard(ctx, data(), { spoilers: false, answer: { id: 537, name: NAME }, artwork });
    expect(texts).toContain('?');
    expect(texts).toContain('Can you name it?');
    expect(texts.join(' ')).not.toContain(NAME);
    expect(texts.join(' ')).not.toMatch(/537|It was/);
    expect(images).toHaveLength(0);
  });

  it('shows every reveal stage, lit only for the stages that were seen', () => {
    const { ctx, texts } = recorder();
    drawShareCard(ctx, data({ revealsUsed: 2 }), { spoilers: false });
    expect(texts).toEqual(expect.arrayContaining(['12%', '30%', '48%', '66%', '84%', '100%']));
  });

  it.each([
    [0, 1],
    [2, 3],
    [5, 6],
  ])('lights %i reveals as %i stages', (revealsUsed, lit) => {
    const { ctx, fills } = recorder();
    drawShareCard(ctx, data({ revealsUsed }), { spoilers: false });
    // Stage pills are filled with a gradient when lit, and a faint colour when not.
    const faint = fills.filter((f) => f === 'rgba(255,255,255,0.07)').length;
    expect(faint).toBe(6 - lit);
  });

  it('shows the wording for each way a game can end', () => {
    for (const [status, label] of [
      ['won', 'Solved'],
      ['lost', 'Not solved'],
      ['gave_up', 'Gave up'],
    ] as const) {
      const { ctx, texts } = recorder();
      drawShareCard(ctx, data({ status }), { spoilers: false });
      expect(texts).toContain(label);
    }
  });

  it('shows a dash instead of a streak of zero', () => {
    const { ctx, texts } = recorder();
    drawShareCard(ctx, data({ streak: 0 }), { spoilers: false });
    expect(texts).toContain('—');
  });

  it('prints the link without its protocol, if given', () => {
    const { ctx, texts } = recorder();
    drawShareCard(ctx, data(), { spoilers: false, url: 'https://noeljj77.github.io/SilhouDex/' });
    expect(texts).toContain('noeljj77.github.io/SilhouDex/');
    const none = recorder();
    drawShareCard(none.ctx, data(), { spoilers: false, url: null });
    expect(none.texts.join(' ')).not.toContain('github.io');
  });
});

describe('drawShareCard: spoilers on', () => {
  it('draws the artwork, fitted inside the panel, and names the Pokémon', () => {
    const { ctx, texts, images } = recorder();
    drawShareCard(ctx, data(), { spoilers: true, answer: { id: 537, name: NAME }, artwork });
    expect(texts).toContain(`It was ${NAME}`);
    expect(texts).not.toContain('?');
    expect(images).toHaveLength(1);
    const [, x, y, w, h] = images[0] as [unknown, number, number, number, number];
    expect(w / h).toBeCloseTo(400 / 300); // keeps its shape
    expect(x).toBeGreaterThan(0);
    expect(x + w).toBeLessThan(CARD_WIDTH);
    expect(y + h).toBeLessThan(CARD_HEIGHT);
  });

  it('copes with artwork that has not loaded: names the Pokémon, no picture', () => {
    const { ctx, texts, images } = recorder();
    drawShareCard(ctx, data(), { spoilers: true, answer: { id: 537, name: NAME }, artwork: null });
    expect(texts).toContain(`It was ${NAME}`);
    expect(images).toHaveLength(0);
  });
});

describe('card size', () => {
  it('is a portrait picture that fits a social post', () => {
    expect(CARD_WIDTH).toBe(1080);
    expect(CARD_HEIGHT).toBe(1350);
  });
});
