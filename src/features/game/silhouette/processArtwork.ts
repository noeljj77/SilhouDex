import { analyzePixels } from '../../../domain/reveal/analysis.ts';
import type { TileGrid } from '../../../domain/reveal/tiles.ts';

/** Everything the stage needs to draw one Pokémon. Built once per artwork, then cached. */
export interface ProcessedArtwork {
  /** Black copy of the artwork with its transparent areas kept, cropped and padded to the grid. */
  silhouetteUrl: string;
  /** Full-colour copy with identical size and alignment, shown when the game is solved. */
  colorUrl: string;
  grid: TileGrid;
  /** Pixel size of both images (a whole number of tiles). */
  width: number;
  height: number;
}

const cache = new Map<string, Promise<ProcessedArtwork>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Required so the canvas can read the pixels (the artwork host allows cross-site use).
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the Pokémon artwork'));
    img.src = url;
  });
}

function canvasToBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(URL.createObjectURL(blob));
      else reject(new Error('Could not encode the silhouette'));
    }, 'image/png');
  });
}

function newCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available in this browser');
  return [canvas, ctx];
}

async function build(url: string): Promise<ProcessedArtwork> {
  const img = await loadImage(url);
  const [source, sourceCtx] = newCanvas(img.naturalWidth, img.naturalHeight);
  sourceCtx.drawImage(img, 0, 0);
  const pixels = sourceCtx.getImageData(0, 0, source.width, source.height);

  const analysis = analyzePixels(pixels);
  if (!analysis) throw new Error('The artwork has no visible pixels');
  const { bounds, grid } = analysis;
  const width = grid.cols * grid.tileSize;
  const height = grid.rows * grid.tileSize;

  // Colour copy: the cropped artwork on a canvas sized to a whole number of tiles.
  const [color, colorCtx] = newCanvas(width, height);
  colorCtx.drawImage(
    source,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );

  // Silhouette copy: same picture, painted solid black where it was visible. "source-in" keeps
  // the original transparency, so holes and soft edges survive.
  const [shadow, shadowCtx] = newCanvas(width, height);
  shadowCtx.drawImage(color, 0, 0);
  shadowCtx.globalCompositeOperation = 'source-in';
  shadowCtx.fillStyle = '#000';
  shadowCtx.fillRect(0, 0, width, height);

  const [silhouetteUrl, colorUrl] = await Promise.all([
    canvasToBlobUrl(shadow),
    canvasToBlobUrl(color),
  ]);
  return {
    silhouetteUrl,
    colorUrl,
    grid: { cols: grid.cols, rows: grid.rows, coverage: analysis.coverage },
    width,
    height,
  };
}

/** Loads and processes artwork. Repeat calls for the same URL share one result. */
export function processArtwork(url: string): Promise<ProcessedArtwork> {
  let pending = cache.get(url);
  if (!pending) {
    pending = build(url);
    cache.set(url, pending);
    // Do not cache failures, so a retry can succeed.
    pending.catch(() => cache.delete(url));
  }
  return pending;
}
