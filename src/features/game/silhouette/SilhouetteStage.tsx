import { motion, useReducedMotion } from 'motion/react';
import { fractionForStage, type RevealOrder } from '../../../domain/reveal/mask.ts';
import type { ProcessedArtwork } from './processArtwork.ts';
import { RevealCanvas } from './RevealCanvas.tsx';
import { Sparkles } from './Sparkles.tsx';

export interface SilhouetteStageProps {
  status: 'loading' | 'error' | 'ready';
  artwork?: ProcessedArtwork;
  order?: RevealOrder;
  /** 0 = opening view … 5 = everything. */
  stage: number;
  /** When true the black silhouette melts into the full-colour artwork. */
  solved?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function SilhouetteStage({
  status,
  artwork,
  order,
  stage,
  solved = false,
  onRetry,
  className = '',
}: SilhouetteStageProps) {
  const ready = status === 'ready' && artwork && order;
  const fraction = fractionForStage(stage);
  const label = solved
    ? 'Revealed Pokémon artwork'
    : ready
      ? `Mystery Pokémon silhouette, ${Math.round(fraction * 100)}% revealed`
      : 'Mystery Pokémon silhouette';

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative aspect-square w-full overflow-hidden rounded-3xl border border-white/15 bg-[radial-gradient(circle_at_50%_38%,#b9a4ff_0%,#7c4ddb_42%,#2a1b6e_100%)] shadow-[0_0_60px_-10px_rgba(139,92,246,0.7)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_110%,rgba(34,211,238,0.35),transparent_55%)]" />
      <Sparkles />
      {ready ? (
        <Picture artwork={artwork} order={order} fraction={fraction} solved={solved} />
      ) : status === 'error' ? (
        <ErrorPanel onRetry={onRetry} />
      ) : (
        <LoadingPanel />
      )}
    </div>
  );
}

function Picture({
  artwork,
  order,
  fraction,
  solved,
}: {
  artwork: ProcessedArtwork;
  order: RevealOrder;
  fraction: number;
  solved: boolean;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const ratio = artwork.width / artwork.height;

  return (
    <div className="absolute inset-0 flex items-center justify-center p-[8%]">
      <div
        className="relative max-h-full max-w-full"
        style={{ aspectRatio: ratio, ...(ratio >= 1 ? { width: '100%' } : { height: '100%' }) }}
      >
        <RevealCanvas
          artwork={artwork}
          order={order}
          fraction={fraction}
          reduceMotion={reduceMotion}
        />

        {solved && (
          <>
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-[length:100%_100%]"
              style={{ backgroundImage: `url(${artwork.colorUrl})` }}
              initial={{ opacity: reduceMotion ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            {!reduceMotion && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -inset-x-1/4 inset-y-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.7)_50%,transparent_60%)]"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-live="polite">
      <span aria-hidden className="animate-pulse text-8xl font-black text-white/25">
        ?
      </span>
      <span className="sr-only">Loading silhouette…</span>
    </div>
  );
}

function ErrorPanel({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-2xl bg-night-950/85 p-5 text-center"
      >
        <p className="text-lg font-semibold text-white">The silhouette could not load.</p>
        <p className="text-sm text-white/80">Check your connection and try again.</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-white/90 px-5 py-2 text-sm font-bold text-night-900 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-glow"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
