import { findBounds } from '../../../domain/reveal/analysis.ts';

/** Longest side, in pixels, of the small copy used to plan the reveal. */
const PLAN_SIZE = 192;

/** Everything the stage needs to draw one Pokémon. Built once per artwork, then cached. */
export interface ProcessedArtwork {
  /** Solid black copy of the artwork, keeping its transparency, cropped to the shape. */
  silhouette: HTMLCanvasElement;
  /** Full-colour copy with identical size and alignment, shown when the game is solved. */
  colorUrl: string;
  /** Pixel size of both copies. */
  width: number;
  height: number;
  /** Small copy of the shape's alpha (0–255), used to work out the reveal order. */
  alpha: Uint8ClampedArray;
  alphaWidth: number;
  alphaHeight: number;
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
      else reject(new Error('Could not encode the artwork'));
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
  const bounds = findBounds(sourceCtx.getImageData(0, 0, source.width, source.height));
  if (!bounds) throw new Error('The artwork has no visible pixels');
  const { width, height } = bounds;

  // Colour copy: the artwork cropped to the shape.
  const [color, colorCtx] = newCanvas(width, height);
  colorCtx.drawImage(source, bounds.x, bounds.y, width, height, 0, 0, width, height);

  // Silhouette copy: same picture, painted solid black where it was visible. "source-in" keeps the
  // original transparency, so holes and soft edges survive.
  const [silhouette, shadowCtx] = newCanvas(width, height);
  shadowCtx.drawImage(color, 0, 0);
  shadowCtx.globalCompositeOperation = 'source-in';
  shadowCtx.fillStyle = '#000';
  shadowCtx.fillRect(0, 0, width, height);

  // A small copy of the shape, so planning the reveal stays fast on any device.
  const scale = Math.min(1, PLAN_SIZE / Math.max(width, height));
  const alphaWidth = Math.max(1, Math.round(width * scale));
  const alphaHeight = Math.max(1, Math.round(height * scale));
  const [, smallCtx] = newCanvas(alphaWidth, alphaHeight);
  smallCtx.drawImage(color, 0, 0, alphaWidth, alphaHeight);
  const small = smallCtx.getImageData(0, 0, alphaWidth, alphaHeight).data;
  const alpha = new Uint8ClampedArray(alphaWidth * alphaHeight);
  for (let i = 0; i < alpha.length; i++) alpha[i] = small[i * 4 + 3] ?? 0;

  return {
    silhouette,
    colorUrl: await canvasToBlobUrl(color),
    width,
    height,
    alpha,
    alphaWidth,
    alphaHeight,
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
