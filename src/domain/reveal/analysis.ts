import { gridDimensions, type GridDimensions } from './tiles.ts';

/** Pixel data in the same layout as canvas ImageData: RGBA bytes, row by row. */
export interface PixelData {
  data: ArrayLike<number>;
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Pixels fainter than this count as empty (ignores stray anti-aliasing specks). */
export const ALPHA_THRESHOLD = 16;

const alphaAt = (px: PixelData, x: number, y: number) => px.data[(y * px.width + x) * 4 + 3] ?? 0;

/** Tightest box around the visible pixels, or null if the image is fully transparent. */
export function findBounds(px: PixelData, threshold = ALPHA_THRESHOLD): Bounds | null {
  let minX = px.width;
  let minY = px.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < px.height; y++) {
    for (let x = 0; x < px.width; x++) {
      if (alphaAt(px, x, y) < threshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Share of each tile (row-major) covered by visible pixels. Tiles are measured from `bounds`. */
export function tileCoverage(
  px: PixelData,
  bounds: Bounds,
  grid: GridDimensions,
  threshold = ALPHA_THRESHOLD,
): number[] {
  const area = grid.tileSize * grid.tileSize;
  const counts = new Array<number>(grid.cols * grid.rows).fill(0);
  for (let y = 0; y < bounds.height; y++) {
    const row = Math.floor(y / grid.tileSize);
    for (let x = 0; x < bounds.width; x++) {
      if (alphaAt(px, bounds.x + x, bounds.y + y) < threshold) continue;
      counts[row * grid.cols + Math.floor(x / grid.tileSize)]! += 1;
    }
  }
  return counts.map((n) => n / area);
}

export interface SilhouetteAnalysis {
  bounds: Bounds;
  grid: GridDimensions;
  coverage: number[];
}

/** Crops to the visible shape and measures how much of each tile it fills. */
export function analyzePixels(px: PixelData): SilhouetteAnalysis | null {
  const bounds = findBounds(px);
  if (!bounds) return null;
  const grid = gridDimensions(bounds.width, bounds.height);
  return { bounds, grid, coverage: tileCoverage(px, bounds, grid) };
}
