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
  /** Shown on the device's number plate once the Pokémon is known; "???" until then. */
  dexNumber?: number;
  onRetry?: () => void;
  className?: string;
}

export function SilhouetteStage({
  status,
  artwork,
  order,
  stage,
  solved = false,
  dexNumber,
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
    // The device: a dark bezel with status lights around a bright "Who's that Pokémon?" screen.
    <div
      className={`rounded-[1.75rem] border-2 border-ink bg-screen p-3 shadow-[0_6px_0_var(--color-ink)] ${className}`}
    >
      <div aria-hidden className="mb-2.5 flex items-center justify-between px-1">
        <span className="font-display text-lg leading-none tracking-wider text-lcd">
          No. {solved && dexNumber ? String(dexNumber).padStart(4, '0') : '???'}
        </span>
        <span className="flex gap-1.5 [&>i]:size-2.5 [&>i]:rounded-full [&>i]:border [&>i]:border-black/60">
          <i className="led-blink bg-[#ff6b6b]" />
          <i className="bg-volt" />
          <i className="bg-lcd" />
        </span>
      </div>

      <div
        role="img"
        aria-label={label}
        className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-black bg-[radial-gradient(circle_at_50%_45%,#9be0ff_0%,#3fa9ff_55%,#1767d1_100%)]"
      >
        <div className="sunburst pointer-events-none absolute -inset-[40%]" />
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_50px_rgb(5_30_90/0.55)]" />
        <Sparkles />
        {ready ? (
          <Picture artwork={artwork} order={order} fraction={fraction} solved={solved} />
        ) : status === 'error' ? (
          <ErrorPanel onRetry={onRetry} />
        ) : (
          <LoadingPanel />
        )}
      </div>

      <div aria-hidden className="mt-2.5 flex items-center justify-between px-1">
        <span className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1.5 w-7 rounded-full bg-white/15" />
          ))}
        </span>
        <span className="size-3 rounded-full border-2 border-black/60 bg-dex" />
      </div>
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
                className="pointer-events-none absolute -inset-x-1/4 inset-y-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.8)_50%,transparent_60%)]"
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
      <span aria-hidden className="animate-pulse font-display text-8xl text-white/60">
        ?
      </span>
      <span className="sr-only">Loading silhouette…</span>
    </div>
  );
}

function ErrorPanel({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div role="alert" className="flex flex-col items-center gap-3 dex-card p-5 text-center">
        <p className="font-display text-lg text-ink">The silhouette could not load.</p>
        <p className="text-sm text-ink-soft">Check your connection and try again.</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="dex-btn dex-btn-yellow">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
