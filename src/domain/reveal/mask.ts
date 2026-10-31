import { createRng } from '../../lib/prng.ts';
import { REVEAL_FRACTIONS } from '../game/config.ts';

/**
 * The reveal: a clockwise sweep from 12 o'clock whose edge is broken up by seeded fog, so the
 * silhouette melts into view in cloud-like patches that creep clockwise round the shape.
 *
 * Every pixel gets one number, its `value`: how far round the sweep it is, pushed about by the
 * fog. A pixel is shown once the reveal's cut-off passes its value. Both the cut-off and the soft
 * edge are measured in these same units, so the edge is equally soft everywhere (even on a long,
 * thin Pokémon) and the sweep moves at an even speed. Choosing the cut-off for "x% of the shape"
 * is a lookup in the sorted values, so the visible area is exact.
 */
export interface RevealStyle {
  /** How far the fog pushes the sweep around, in turns (0 = a clean clockwise wipe). */
  fogAmplitude: number;
  /** Size of the fog patches: cloud puffs across the image. Higher = smaller puffs. */
  fogFrequency: number;
  /** Width of the soft edge, in turns. */
  feather: number;
  /** Width, in turns, of the soft ramp at the 12 o'clock start line (no hard line there). */
  seamBlend: number;
}

export const REVEAL_STYLE: RevealStyle = {
  fogAmplitude: 0.7,
  fogFrequency: 3.2,
  feather: 0.08,
  seamBlend: 0.12,
};

/** Alpha channel of a picture (0–255 per pixel, row by row). */
export interface AlphaImage {
  alpha: ArrayLike<number>;
  width: number;
  height: number;
}

export interface RevealOrder {
  width: number;
  height: number;
  /** Row-major position of every pixel in the sweep (about -0.4 to 1.4 turns). */
  value: Float32Array;
  /** The values of the pixels inside the shape, lowest first. */
  sorted: Float32Array;
  /** The highest value of any pixel. */
  max: number;
}

/** Pixels fainter than this are not counted as part of the shape. */
const SHAPE_ALPHA = 13;
const TAU = Math.PI * 2;
const LATTICE = 64;

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Smooth random noise from a string seed (same seed, same fog, on every device). */
function valueNoise(seed: string): (x: number, y: number) => number {
  const rng = createRng(seed);
  const lattice = new Float32Array(LATTICE * LATTICE);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rng.next();
  const at = (a: number, b: number) =>
    lattice[(b & (LATTICE - 1)) * LATTICE + (a & (LATTICE - 1))]!;
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = smooth(x - xi);
    const yf = smooth(y - yi);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

/** Three layers of noise: big clouds with finer wisps on top. Roughly 0–1. */
const fog = (noise: (x: number, y: number) => number, x: number, y: number) =>
  noise(x, y) * 0.5 + noise(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + noise(x * 4.3 + 1, y * 4.3 + 9) * 0.2;

/**
 * Position in the sweep for a clockwise angle (0 to 1 turns). A plain sweep jumps from "last" to
 * "first" across the 12 o'clock line, which would leave a hard straight edge through the shape.
 * Instead the last stretch before the line ramps back down to 0, so the order is continuous all
 * the way round and the start of the sweep is a soft gradient.
 */
function sweep(turn: number, blend: number): number {
  if (blend <= 0 || turn < 1 - blend) return turn;
  return (1 - blend) * (1 - (turn - (1 - blend)) / blend);
}

/**
 * Works out each pixel's place in the reveal. The same picture and seed always give the same
 * result. Pixels outside the shape get a value too (from the same field), so a pixel the shape
 * only just touches still appears at the right moment.
 */
export function computeRevealOrder(
  image: AlphaImage,
  seed: string,
  style: RevealStyle = REVEAL_STYLE,
): RevealOrder {
  const { width, height, alpha } = image;
  const n = width * height;

  let count = 0;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    if ((alpha[i] ?? 0) > SHAPE_ALPHA) {
      count += 1;
      sumX += i % width;
      sumY += Math.floor(i / width);
    }
  }
  if (count === 0) throw new RangeError('The silhouette has no visible pixels');
  const cx = sumX / count;
  const cy = sumY / count;

  const noise = valueNoise(`${seed}|fog`);
  const scale = style.fogFrequency / Math.max(width, height);
  const value = new Float32Array(n);
  const sorted = new Float32Array(count);
  let k = 0;
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    // Clockwise angle from straight up, as a share of a full turn.
    let angle = Math.atan2(x - cx, -(y - cy));
    if (angle < 0) angle += TAU;
    const v =
      sweep(angle / TAU, style.seamBlend) +
      style.fogAmplitude * (fog(noise, x * scale, y * scale) - 0.5);
    value[i] = v;
    if (value[i]! > max) max = value[i]!;
    if ((alpha[i] ?? 0) > SHAPE_ALPHA) sorted[k++] = v;
  }
  sorted.sort();
  return { width, height, value, sorted, max };
}

/**
 * The cut-off that shows a given share of the shape. The edge is soft, so the cut-off sits half a
 * feather past the share (the half-visible line then lands exactly on it). A full reveal goes a
 * whole feather past the last pixel, so everything becomes completely solid.
 */
export function revealThreshold(order: RevealOrder, fraction: number, feather: number): number {
  if (fraction >= 1) return order.max + feather;
  const { sorted } = order;
  const position = Math.max(0, fraction) * sorted.length;
  const index = Math.min(sorted.length - 1, Math.floor(position));
  return sorted[index]! + feather / 2;
}

/**
 * Fills an RGBA buffer with the reveal mask: white, with each pixel's alpha set by how far the
 * cut-off is past its value. Used on the canvas to cut the silhouette.
 */
export function fillRevealMask(
  out: Uint8ClampedArray,
  value: Float32Array,
  threshold: number,
  feather: number,
): void {
  for (let i = 0; i < value.length; i++) {
    const t = (threshold - value[i]!) / feather;
    const a = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
    const o = i * 4;
    out[o] = 255;
    out[o + 1] = 255;
    out[o + 2] = 255;
    out[o + 3] = Math.round(a * 255);
  }
}

/** Share of the shape shown at a game stage (0 = opening view … 5 = everything), clamped. */
export function fractionForStage(stage: number): number {
  const last = REVEAL_FRACTIONS.length - 1;
  return REVEAL_FRACTIONS[Math.min(Math.max(Math.trunc(stage), 0), last)]!;
}
