import { useCallback, useEffect, useState } from 'react';
import { processArtwork, type ProcessedArtwork } from './processArtwork.ts';

export type SilhouetteState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; artwork: ProcessedArtwork };

interface Settled {
  url: string;
  attempt: number;
  result: { status: 'error' } | { status: 'ready'; artwork: ProcessedArtwork };
}

/** Loads and processes artwork for the silhouette stage. `retry` tries again after an error. */
export function useSilhouette(artworkUrl: string | null): SilhouetteState & { retry(): void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!artworkUrl) return;
    let cancelled = false;
    processArtwork(artworkUrl).then(
      (artwork) =>
        !cancelled &&
        setSettled({ url: artworkUrl, attempt, result: { status: 'ready', artwork } }),
      () => !cancelled && setSettled({ url: artworkUrl, attempt, result: { status: 'error' } }),
    );
    return () => {
      cancelled = true;
    };
  }, [artworkUrl, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  // A result only counts if it belongs to the current artwork and attempt; otherwise we are loading.
  const current =
    settled && settled.url === artworkUrl && settled.attempt === attempt ? settled.result : null;
  return { ...(current ?? { status: 'loading' as const }), retry };
}
