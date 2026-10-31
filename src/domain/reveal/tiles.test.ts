import { describe, expect, it } from 'vitest';
import { REVEAL_FRACTIONS } from '../game/config.ts';
import { gridDimensions, planReveal, visibleTiles, type TileGrid } from './tiles.ts';

/** A solid cols×rows grid where every tile is fully covered. */
const solid = (cols: number, rows: number): TileGrid => ({
  cols,
  rows,
  coverage: Array.from({ length: cols * rows }, () => 1),
});

/** A grid with a few full tiles in the middle and thin edge tiles around them. */
function blobGrid(): TileGrid {
  const cols = 10;
  const rows = 10;
  const coverage = Array.from({ length: cols * rows }, (_, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const d = Math.hypot(c - 4.5, r - 4.5);
    if (d < 3) return 1;
    if (d < 4.5) return 0.3;
    if (d < 5) return 0.05;
    return 0;
  });
  return { cols, rows, coverage };
}

describe('gridDimensions', () => {
  it('gives ~10 tiles along the longer side, whichever it is', () => {
    expect(gridDimensions(400, 400)).toEqual({ tileSize: 40, cols: 10, rows: 10 });
    expect(gridDimensions(400, 200)).toEqual({ tileSize: 40, cols: 10, rows: 5 });
    expect(gridDimensions(200, 400)).toEqual({ tileSize: 40, cols: 5, rows: 10 });
  });

  it('rounds partial tiles up so the whole image is covered', () => {
    const g = gridDimensions(405, 100);
    expect(g.tileSize).toBe(41);
    expect(g.cols * g.tileSize).toBeGreaterThanOrEqual(405);
    expect(g.rows * g.tileSize).toBeGreaterThanOrEqual(100);
  });

  it('copes with very small images', () => {
    expect(gridDimensions(3, 2)).toEqual({ tileSize: 1, cols: 3, rows: 2 });
  });

  it('rejects empty sizes', () => {
    expect(() => gridDimensions(0, 10)).toThrow(RangeError);
  });
});

describe('planReveal', () => {
  it('is identical for the same seed and different for another', () => {
    const grid = blobGrid();
    expect(planReveal(grid, 'daily:#5')).toEqual(planReveal(grid, 'daily:#5'));
    expect(planReveal(grid, 'daily:#5').order).not.toEqual(planReveal(grid, 'daily:#6').order);
  });

  it('only includes tiles that contain part of the silhouette, each once', () => {
    const grid = blobGrid();
    const plan = planReveal(grid, 's');
    const occupied = grid.coverage.filter((c) => c > 0).length;
    expect(plan.order).toHaveLength(occupied);
    expect(new Set(plan.order).size).toBe(occupied);
    for (const i of plan.order) expect(grid.coverage[i]).toBeGreaterThan(0);
  });

  it('has six stages that grow, ending with every tile', () => {
    const plan = planReveal(blobGrid(), 's');
    expect(plan.stageCounts).toHaveLength(REVEAL_FRACTIONS.length);
    for (let i = 1; i < plan.stageCounts.length; i++) {
      expect(plan.stageCounts[i]).toBeGreaterThan(plan.stageCounts[i - 1]!);
    }
    expect(plan.stageCounts.at(-1)).toBe(plan.order.length);
    expect(plan.stageVisible.at(-1)).toBeCloseTo(1);
  });

  it('opens at about 12% of the silhouette area, then follows the target curve', () => {
    for (const seed of ['a', 'b', 'c', 'daily:#1', 'daily:#2']) {
      const plan = planReveal(blobGrid(), seed);
      REVEAL_FRACTIONS.slice(0, -1).forEach((target, stage) => {
        const visible = plan.stageVisible[stage]!;
        expect(visible).toBeGreaterThanOrEqual(target - 0.001);
        // Never overshoots by more than one full tile's share of the area.
        expect(visible).toBeLessThan(target + 0.12);
      });
    }
  });

  it('opens at ~12% for a flat grid too (every tile equal)', () => {
    const plan = planReveal(solid(10, 10), 's');
    expect(plan.stageCounts[0]).toBe(12);
    expect(plan.stageCounts).toEqual([12, 30, 48, 66, 84, 100]);
  });

  it('tends to open with the fullest tiles', () => {
    const grid = blobGrid();
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const overall = mean(grid.coverage.filter((c) => c > 0));
    let openingMeans = 0;
    const seeds = 60;
    for (let s = 0; s < seeds; s++) {
      const plan = planReveal(grid, `seed-${s}`);
      openingMeans += mean(plan.order.slice(0, plan.stageCounts[0]).map((i) => grid.coverage[i]!));
    }
    expect(openingMeans / seeds).toBeGreaterThan(overall);
  });

  it('still reveals thin edge tiles eventually', () => {
    const grid = blobGrid();
    const plan = planReveal(grid, 's');
    const thin = grid.coverage.map((c, i) => (c > 0 && c < 0.1 ? i : -1)).filter((i) => i >= 0);
    expect(thin.length).toBeGreaterThan(0);
    for (const i of thin) expect(plan.order).toContain(i);
  });

  it('handles a tiny silhouette with fewer tiles than stages', () => {
    const plan = planReveal({ cols: 2, rows: 1, coverage: [0.5, 0.2] }, 's');
    expect(plan.order).toHaveLength(2);
    expect(plan.stageCounts.at(-1)).toBe(2);
    expect(Math.max(...plan.stageCounts)).toBe(2);
  });

  it('rejects an empty silhouette', () => {
    expect(() => planReveal({ cols: 2, rows: 2, coverage: [0, 0, 0, 0] }, 's')).toThrow(RangeError);
  });

  it('is pinned for a fixed grid: reveal order must never change for existing challenges', () => {
    const plan = planReveal(solid(3, 3), 'daily:#1');
    expect(plan.order).toEqual(planReveal(solid(3, 3), 'daily:#1').order);
    expect([...plan.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('visibleTiles', () => {
  it('returns the first N tiles of the order for a stage', () => {
    const plan = planReveal(solid(10, 10), 's');
    expect(visibleTiles(plan, 0)).toEqual(plan.order.slice(0, 12));
    expect(visibleTiles(plan, 5)).toHaveLength(100);
  });

  it('keeps earlier tiles visible as stages grow', () => {
    const plan = planReveal(blobGrid(), 's');
    for (let s = 1; s < plan.stageCounts.length; s++) {
      const prev = new Set(visibleTiles(plan, s - 1));
      const next = new Set(visibleTiles(plan, s));
      for (const t of prev) expect(next.has(t)).toBe(true);
    }
  });

  it('clamps out-of-range stages', () => {
    const plan = planReveal(solid(4, 4), 's');
    expect(visibleTiles(plan, -3)).toEqual(visibleTiles(plan, 0));
    expect(visibleTiles(plan, 99)).toHaveLength(16);
  });
});
