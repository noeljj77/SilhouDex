import { describe, expect, it } from 'vitest';
import { findBounds, type PixelData } from './analysis.ts';

/** Builds RGBA pixels where `filled(x, y)` decides if a pixel is opaque. */
function image(
  width: number,
  height: number,
  filled: (x: number, y: number) => boolean,
): PixelData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (filled(x, y)) data[(y * width + x) * 4 + 3] = 255;
    }
  }
  return { data, width, height };
}

describe('findBounds', () => {
  it('finds the tight box around the shape, ignoring transparent padding', () => {
    const px = image(100, 80, (x, y) => x >= 20 && x < 60 && y >= 10 && y < 30);
    expect(findBounds(px)).toEqual({ x: 20, y: 10, width: 40, height: 20 });
  });

  it('returns null for a fully transparent image', () => {
    expect(findBounds(image(10, 10, () => false))).toBeNull();
  });

  it('ignores near-transparent specks', () => {
    const px = image(20, 20, (x, y) => x === 10 && y === 10);
    (px.data as Uint8ClampedArray)[(2 * 20 + 2) * 4 + 3] = 5; // faint speck, below the threshold
    expect(findBounds(px)).toEqual({ x: 10, y: 10, width: 1, height: 1 });
  });

  it('handles a one-pixel shape on the corner', () => {
    expect(findBounds(image(5, 5, (x, y) => x === 4 && y === 4))).toEqual({
      x: 4,
      y: 4,
      width: 1,
      height: 1,
    });
  });

  it('handles tall and wide shapes', () => {
    expect(
      findBounds(image(500, 500, (x, y) => x >= 50 && x < 450 && y >= 200 && y < 300)),
    ).toEqual({
      x: 50,
      y: 200,
      width: 400,
      height: 100,
    });
    expect(
      findBounds(image(500, 500, (x, y) => x >= 200 && x < 300 && y >= 50 && y < 450)),
    ).toEqual({
      x: 200,
      y: 50,
      width: 100,
      height: 400,
    });
  });
});
