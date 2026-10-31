import { describe, expect, it } from 'vitest';
import { REVEAL_FRACTIONS } from '../game/config.ts';
import {
  computeRevealOrder,
  fillRevealMask,
  fractionForStage,
  REVEAL_STYLE,
  revealThreshold,
  type AlphaImage,
  type RevealStyle,
} from './mask.ts';

/** A picture whose alpha is 255 where `filled(x, y)` is true. */
function picture(
  width: number,
  height: number,
  filled: (x: number, y: number) => boolean,
): AlphaImage {
  const alpha = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) if (filled(x, y)) alpha[y * width + x] = 255;
  return { alpha, width, height };
}
const disc = picture(120, 120, (x, y) => Math.hypot(x - 60, y - 60) < 50);
const wide = picture(200, 60, (x, y) => x > 10 && x < 190 && y > 10 && y < 50);
const tall = picture(60, 200, (x, y) => x > 10 && x < 50 && y > 10 && y < 190);
const ring = picture(120, 120, (x, y) => {
  const d = Math.hypot(x - 60, y - 60);
  return d < 55 && d > 30;
});
const CLEAN: RevealStyle = { ...REVEAL_STYLE, fogAmplitude: 0 };
const { feather } = REVEAL_STYLE;

const inside = (img: AlphaImage, i: number) => img.alpha[i]! > 13;
const shapeCount = (img: AlphaImage) => Array.from(img.alpha).filter((a) => a > 13).length;

/** The mask at a given share, as alpha values. */
function maskAt(img: AlphaImage, seed: string, fraction: number, style = REVEAL_STYLE) {
  const order = computeRevealOrder(img, seed, style);
  const mask = new Uint8ClampedArray(order.value.length * 4);
  fillRevealMask(mask, order.value, revealThreshold(order, fraction, style.feather), style.feather);
  return { order, mask };
}

/** Share of the shape that is at least half visible. */
function visibleShare(img: AlphaImage, seed: string, fraction: number, style = REVEAL_STYLE) {
  const { mask } = maskAt(img, seed, fraction, style);
  let shown = 0;
  for (let i = 0; i < img.alpha.length; i++)
    if (inside(img, i) && mask[i * 4 + 3]! >= 128) shown += 1;
  return shown / shapeCount(img);
}

describe('computeRevealOrder', () => {
  it('is the same for the same picture and seed, and differs with another seed', () => {
    const a = computeRevealOrder(disc, 'daily:#5|25');
    expect(computeRevealOrder(disc, 'daily:#5|25').value).toEqual(a.value);
    expect(computeRevealOrder(disc, 'daily:#6|25').value).not.toEqual(a.value);
  });

  it('gives every pixel a value, and sorts the ones inside the shape', () => {
    const order = computeRevealOrder(disc, 's');
    expect(order.value).toHaveLength(120 * 120);
    expect(order.sorted).toHaveLength(shapeCount(disc));
    for (let i = 1; i < order.sorted.length; i++)
      expect(order.sorted[i]).toBeGreaterThanOrEqual(order.sorted[i - 1]!);
    expect(order.max).toBe(Math.max(...order.value));
  });

  it('rejects a picture with nothing in it', () => {
    expect(() =>
      computeRevealOrder(
        picture(20, 20, () => false),
        's',
      ),
    ).toThrow(RangeError);
  });

  it('handles wide, tall, hollow and one-pixel shapes', () => {
    for (const img of [wide, tall, ring, picture(5, 5, (x, y) => x === 2 && y === 2)]) {
      expect(computeRevealOrder(img, 's').value.every((v) => Number.isFinite(v))).toBe(true);
    }
  });
});

describe('the reveal goes clockwise from 12 o’clock', () => {
  const at = (img: AlphaImage, style: RevealStyle, x: number, y: number) =>
    computeRevealOrder(img, 's', style).value[y * img.width + x]!;

  it('with no fog it is a clean sweep: right, then bottom, then left', () => {
    const start = at(disc, CLEAN, 66, 15); // a little right of straight up: very early
    const right = at(disc, CLEAN, 105, 60);
    const bottom = at(disc, CLEAN, 60, 105);
    const left = at(disc, CLEAN, 15, 60);
    expect(start).toBeLessThan(right);
    expect(right).toBeLessThan(bottom);
    expect(bottom).toBeLessThan(left);
  });

  it('has no hard line where the sweep starts: just left and just right of the top are alike', () => {
    const justRight = at(disc, CLEAN, 62, 15);
    const justLeft = at(disc, CLEAN, 58, 15);
    // A plain sweep would jump by nearly a full turn here. With the soft start it barely changes.
    expect(Math.abs(justRight - justLeft)).toBeLessThan(feather);
  });

  it('with fog, the opening stages still travel further round the clock each time', () => {
    const order = computeRevealOrder(disc, 'daily:#3|25');
    const meanAngle = (fromShare: number, toShare: number) => {
      const lo = revealThreshold(order, fromShare, 0);
      const hi = revealThreshold(order, toShare, 0);
      let sum = 0;
      let n = 0;
      for (let i = 0; i < order.value.length; i++) {
        if (!inside(disc, i) || order.value[i]! < lo || order.value[i]! >= hi) continue;
        let a = Math.atan2((i % 120) - 60, -(Math.floor(i / 120) - 60));
        if (a < 0) a += Math.PI * 2;
        // The last stretch before 12 o'clock is the soft start ramp, which opens early.
        if (a > Math.PI * 2 * (1 - REVEAL_STYLE.seamBlend)) continue;
        sum += a;
        n += 1;
      }
      return sum / n;
    };
    const bands = REVEAL_FRACTIONS.map((f, i) =>
      meanAngle(i === 0 ? 0 : REVEAL_FRACTIONS[i - 1]!, f),
    );
    for (let i = 1; i < 4; i++) expect(bands[i]).toBeGreaterThan(bands[i - 1]!);
    expect(bands.at(-1)!).toBeGreaterThan(bands[0]!);
  });

  it('the fog really does break up the sweep (patches, not a straight wedge)', () => {
    const clean = computeRevealOrder(disc, 's', CLEAN).value;
    const foggy = computeRevealOrder(disc, 's').value;
    let differing = 0;
    for (let i = 0; i < clean.length; i++)
      if (Math.abs(clean[i]! - foggy[i]!) > 0.1) differing += 1;
    expect(differing).toBeGreaterThan(clean.length * 0.1);
  });
});

describe('no hard edges anywhere', () => {
  it.each([
    ['round', disc],
    ['wide', wide],
    ['tall', tall],
    ['hollow', ring],
  ])('%s shape: neighbouring pixels never differ by more than the soft edge', (_name, img) => {
    for (const style of [CLEAN, REVEAL_STYLE]) {
      const { value, width } = computeRevealOrder(img, 'daily:#4|25', style);
      let sumX = 0;
      let sumY = 0;
      let n = 0;
      for (let i = 0; i < value.length; i++) {
        if (inside(img, i)) {
          sumX += i % width;
          sumY += Math.floor(i / width);
          n += 1;
        }
      }
      const cx = sumX / n;
      const cy = sumY / n;
      // The middle is the pivot of the sweep, where the angle must change quickly.
      const pivot = Math.max(width, img.height) * 0.17;
      let hardEdges = 0;
      for (let i = 0; i < value.length - 1; i++) {
        const x = i % width;
        const y = Math.floor(i / width);
        if (x === width - 1 || !inside(img, i) || !inside(img, i + 1)) continue;
        if (Math.hypot(x - cx, y - cy) < pivot) continue;
        if (Math.abs(value[i]! - value[i + 1]!) > style.feather) hardEdges += 1;
      }
      expect(hardEdges).toBe(0);
    }
  });

  it('a long thin shape gets just as soft an edge as a round one', () => {
    const softBand = (img: AlphaImage) => {
      const { mask } = maskAt(img, 'daily:#2|25', 0.5);
      let partial = 0;
      for (let i = 0; i < img.alpha.length; i++) {
        const a = mask[i * 4 + 3]!;
        if (inside(img, i) && a > 0 && a < 255) partial += 1;
      }
      return partial / shapeCount(img);
    };
    const round = softBand(disc);
    expect(round).toBeGreaterThan(0.04);
    expect(softBand(tall)).toBeGreaterThan(round * 0.15);
    expect(softBand(wide)).toBeGreaterThan(round * 0.15);
  });
});

describe('showing a share of the shape', () => {
  it.each([
    ['round', disc],
    ['wide', wide],
    ['tall', tall],
    ['hollow', ring],
  ])('%s shape: shows the share asked for at every stage', (_name, img) => {
    for (const fraction of REVEAL_FRACTIONS.slice(0, -1)) {
      expect(Math.abs(visibleShare(img, 'daily:#2|25', fraction) - fraction)).toBeLessThan(0.02);
    }
  });

  it('opens with about 12% of the shape', () => {
    expect(visibleShare(disc, 'a', 0.12)).toBeGreaterThan(0.1);
    expect(visibleShare(disc, 'a', 0.12)).toBeLessThan(0.14);
  });

  it('the last stage shows every pixel of the shape, fully solid', () => {
    const { mask } = maskAt(disc, 's', 1);
    for (let i = 0; i < disc.alpha.length; i++)
      if (inside(disc, i)) expect(mask[i * 4 + 3]).toBe(255);
  });

  it('shows nothing before it starts', () => {
    const order = computeRevealOrder(disc, 's');
    const mask = new Uint8ClampedArray(order.value.length * 4);
    fillRevealMask(mask, order.value, order.sorted[0]! - feather, feather);
    expect(mask.every((v, i) => i % 4 !== 3 || v === 0)).toBe(true);
  });
});

describe('smoothness over time', () => {
  it('each pixel only ever gets more visible as the reveal moves on (never flickers)', () => {
    const order = computeRevealOrder(disc, 's');
    let previous = new Uint8ClampedArray(order.value.length * 4);
    let wentBackwards = 0;
    for (let th = -0.5; th <= 1.6; th += 0.05) {
      const mask = new Uint8ClampedArray(order.value.length * 4);
      fillRevealMask(mask, order.value, th, feather);
      for (let i = 3; i < mask.length; i += 4) if (mask[i]! < previous[i]!) wentBackwards += 1;
      previous = mask;
    }
    expect(wentBackwards).toBe(0);
  });

  it('the cut-off for each stage only goes up, so the animation always moves forward', () => {
    const order = computeRevealOrder(wide, 's');
    const cuts = [...REVEAL_FRACTIONS].map((f) => revealThreshold(order, f, feather));
    for (let i = 1; i < cuts.length; i++) expect(cuts[i]).toBeGreaterThan(cuts[i - 1]!);
  });

  it('a softer feather gives a wider soft band', () => {
    const band = (f: number) => {
      const style = { ...REVEAL_STYLE, feather: f };
      const { mask } = maskAt(disc, 's', 0.5, style);
      let partial = 0;
      for (let i = 0; i < disc.alpha.length; i++)
        if (mask[i * 4 + 3]! > 0 && mask[i * 4 + 3]! < 255) partial += 1;
      return partial;
    };
    expect(band(0.16)).toBeGreaterThan(band(0.04) * 2);
  });
});

describe('fractionForStage', () => {
  it('maps stages to shares, and clamps', () => {
    expect(fractionForStage(0)).toBe(0.12);
    expect(fractionForStage(5)).toBe(1);
    expect(fractionForStage(99)).toBe(1);
    expect(fractionForStage(-3)).toBe(0.12);
  });
});
