import { createRng } from '../../lib/prng.ts';
import { REVEAL_FRACTIONS } from '../game/config.ts';

/** How many tiles span the longer side of the cropped silhouette. */
export const TILES_ALONG_LONG_SIDE = 10;

export interface GridDimensions {
  /** Side of one square tile, in source pixels. */
  tileSize: number;
  cols: number;
  rows: number;
}

/**
 * Square tiles over a cropped silhouette: ~10 along the longer side, however wide or tall the
 * artwork is. The last row/column may overhang the image a little; that part is empty.
 */
export function gridDimensions(
  width: number,
  height: number,
  tilesAlongLongSide = TILES_ALONG_LONG_SIDE,
): GridDimensions {
  if (!(width > 0) || !(height > 0)) throw new RangeError('Image size must be positive');
  const tileSize = Math.max(1, Math.ceil(Math.max(width, height) / tilesAlongLongSide));
  return { tileSize, cols: Math.ceil(width / tileSize), rows: Math.ceil(height / tileSize) };
}

export interface TileGrid {
  cols: number;
  rows: number;
  /** Row-major. Share of each tile covered by the silhouette, 0–1. */
  coverage: readonly number[];
}

export interface RevealPlan {
  cols: number;
  rows: number;
  /** Tile indices (row * cols + col) that contain part of the silhouette, in reveal order. */
  order: readonly number[];
  /** Tiles shown at each stage (cumulative). Stage 0 is the opening view; the last is all. */
  stageCounts: readonly number[];
  /** Share of the silhouette's area visible at each stage, 0–1. */
  stageVisible: readonly number[];
}

/** Floor so even a sliver of a tile can appear before the end. */
const MIN_WEIGHT = 0.05;

/**
 * Decides which tiles appear when. The order is a weighted shuffle seeded by `seed`, so every
 * device sees the same reveal. Tiles with more silhouette in them tend to come earlier, so the
 * opening view is a few solid chunks rather than scattered edge crumbs.
 *
 * Stage sizes follow the *area* of the silhouette (12% → 30% → 48% → 66% → 84% → 100%), not the
 * tile count, so the opening view really shows about 12% of the shape.
 */
export function planReveal(
  grid: TileGrid,
  seed: string,
  fractions: readonly number[] = REVEAL_FRACTIONS,
): RevealPlan {
  const rng = createRng(`${seed}|tiles`);
  const occupied = grid.coverage
    .map((coverage, index) => ({ index, coverage }))
    .filter((t) => t.coverage > 0);
  if (occupied.length === 0) throw new RangeError('The silhouette has no visible pixels');

  // Weighted shuffle (Efraimidis–Spirakis): sort by u^(1/weight), largest first.
  const order = occupied
    .map((t) => ({
      ...t,
      key: Math.pow(Math.max(rng.next(), Number.MIN_VALUE), 1 / (t.coverage + MIN_WEIGHT)),
    }))
    .sort((a, b) => b.key - a.key || a.index - b.index);

  const total = order.reduce((sum, t) => sum + t.coverage, 0);
  const cumulative: number[] = [];
  order.reduce((sum, t) => {
    cumulative.push(sum + t.coverage);
    return sum + t.coverage;
  }, 0);

  const count = order.length;
  const stageCounts: number[] = [];
  fractions.forEach((fraction, stage) => {
    if (stage === fractions.length - 1 || fraction >= 1) {
      stageCounts.push(count);
      return;
    }
    // Fewest tiles reaching the target area, and always at least one more than the last stage.
    const reached = cumulative.findIndex((c) => c >= fraction * total - 1e-9) + 1;
    const previous = stageCounts[stage - 1] ?? 0;
    stageCounts.push(Math.min(count, Math.max(reached, previous + 1)));
  });

  const stageVisible = stageCounts.map((n) => (n === 0 ? 0 : (cumulative[n - 1] ?? 0) / total));
  return {
    cols: grid.cols,
    rows: grid.rows,
    order: order.map((t) => t.index),
    stageCounts,
    stageVisible,
  };
}

/** The tile indices visible at a stage (clamped to the plan's range). */
export function visibleTiles(plan: RevealPlan, stage: number): readonly number[] {
  const s = Math.min(Math.max(Math.trunc(stage), 0), plan.stageCounts.length - 1);
  return plan.order.slice(0, plan.stageCounts[s]);
}
