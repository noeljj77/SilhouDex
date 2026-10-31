import { describe, expect, it } from 'vitest';
import { analyzePixels, findBounds, tileCoverage, type PixelData } from './analysis.ts';
import { gridDimensions, planReveal } from './tiles.ts';

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
});

describe('analyzePixels', () => {
  it('crops a wide shape and builds a wide grid', () => {
    const a = analyzePixels(image(500, 500, (x, y) => x >= 50 && x < 450 && y >= 200 && y < 300))!;
    expect(a.bounds).toEqual({ x: 50, y: 200, width: 400, height: 100 });
    expect(a.grid).toEqual({ tileSize: 40, cols: 10, rows: 3 });
    expect(a.coverage).toHaveLength(30);
  });

  it('crops a tall shape and builds a tall grid', () => {
    const a = analyzePixels(image(500, 500, (x, y) => x >= 200 && x < 300 && y >= 50 && y < 450))!;
    expect(a.grid).toEqual({ tileSize: 40, cols: 3, rows: 10 });
  });

  it('measures coverage: full tiles read 1, empty tiles 0, partial in between', () => {
    // 100×100 image, a 40×40 square at the top-left of the crop plus a 10×40 sliver.
    const px = image(100, 100, (x, y) => (x < 40 && y < 40) || (x >= 90 && y < 40));
    const a = analyzePixels(px)!;
    expect(a.grid).toEqual({ tileSize: 10, cols: 10, rows: 4 });
    expect(a.coverage[0]).toBe(1);
    expect(a.coverage[9]).toBe(1);
    expect(a.coverage[5]).toBe(0);
    // Columns 4–8 are empty in every row; columns 0–3 and 9 are full in every row.
    for (let row = 0; row < 4; row++) {
      const cells = a.coverage.slice(row * 10, row * 10 + 10);
      expect(cells.slice(4, 9)).toEqual([0, 0, 0, 0, 0]);
      expect([...cells.slice(0, 4), cells[9]]).toEqual([1, 1, 1, 1, 1]);
    }
  });

  it('measures a half-covered tile as 0.5', () => {
    const px = image(20, 10, (x) => x < 15);
    const bounds = findBounds(px)!;
    const grid = gridDimensions(bounds.width, bounds.height, 3);
    const cov = tileCoverage(px, bounds, grid);
    expect(cov.every((c) => c >= 0 && c <= 1)).toBe(true);
    expect(cov.some((c) => c > 0 && c < 1)).toBe(false); // clean edges here
  });

  it('keeps holes empty (a ring has an empty middle)', () => {
    const px = image(200, 200, (x, y) => {
      const d = Math.hypot(x - 100, y - 100);
      return d < 95 && d > 55;
    });
    const a = analyzePixels(px)!;
    const centre =
      a.coverage[Math.floor(a.grid.rows / 2) * a.grid.cols + Math.floor(a.grid.cols / 2)];
    expect(centre).toBe(0);
    // Empty tiles are never part of the reveal plan.
    const plan = planReveal({ cols: a.grid.cols, rows: a.grid.rows, coverage: a.coverage }, 's');
    expect(plan.order.length).toBeLessThan(a.grid.cols * a.grid.rows);
  });

  it('works for a circle: plan reveals the whole shape at the last stage', () => {
    const px = image(300, 300, (x, y) => Math.hypot(x - 150, y - 150) < 120);
    const a = analyzePixels(px)!;
    const plan = planReveal(
      { cols: a.grid.cols, rows: a.grid.rows, coverage: a.coverage },
      'circle',
    );
    expect(plan.stageVisible[0]).toBeGreaterThanOrEqual(0.12 - 0.001);
    expect(plan.stageVisible.at(-1)).toBeCloseTo(1);
    // Every opaque pixel lives in a tile that is in the order.
    const inPlan = new Set(plan.order);
    a.coverage.forEach((c, i) => {
      if (c > 0) expect(inPlan.has(i)).toBe(true);
    });
  });

  it('returns null when there is nothing to show', () => {
    expect(analyzePixels(image(8, 8, () => false))).toBeNull();
  });
});
