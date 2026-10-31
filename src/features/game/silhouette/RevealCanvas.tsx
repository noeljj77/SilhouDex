import { useEffect, useRef } from 'react';
import {
  fillRevealMask,
  REVEAL_STYLE,
  revealThreshold,
  type RevealOrder,
} from '../../../domain/reveal/mask.ts';
import type { ProcessedArtwork } from './processArtwork.ts';

/** How long one reveal takes to melt in. */
export const REVEAL_MS = 1300;

const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

interface Shown {
  order: RevealOrder;
  threshold: number;
}

/**
 * Draws the black silhouette, cut by the reveal mask. When the revealed share changes it animates
 * smoothly from where it currently is to the new share, so a reveal never jumps. With reduced
 * motion, or on first showing, it simply appears at the right share.
 */
export function RevealCanvas({
  artwork,
  order,
  fraction,
  reduceMotion,
}: {
  artwork: ProcessedArtwork;
  order: RevealOrder;
  /** Share of the shape to show, 0–1. */
  fraction: number;
  reduceMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shown = useRef<Shown | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return; // no canvas support (or a test environment)

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = order.width;
    maskCanvas.height = order.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;
    const mask = maskCtx.createImageData(order.width, order.height);
    const { feather } = REVEAL_STYLE;

    const paint = (threshold: number) => {
      fillRevealMask(mask.data, order.value, threshold, feather);
      maskCtx.putImageData(mask, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(artwork.silhouette, 0, 0);
      // Keep the silhouette only where the (smoothly scaled up) mask is visible.
      ctx.globalCompositeOperation = 'destination-in';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      shown.current = { order, threshold };
    };

    const target = revealThreshold(order, fraction, feather);
    const previous = shown.current?.order === order ? shown.current.threshold : null;
    if (previous === null || reduceMotion || previous === target) {
      paint(target);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / REVEAL_MS);
      paint(previous + (target - previous) * easeInOut(u));
      if (u < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [artwork, order, fraction, reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      width={artwork.width}
      height={artwork.height}
      data-fraction={fraction}
      aria-hidden
      className="absolute inset-0 size-full"
    />
  );
}
