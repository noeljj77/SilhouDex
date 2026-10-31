import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { visibleTiles, type RevealPlan } from '../../../domain/reveal/tiles.ts';
import type { ProcessedArtwork } from './processArtwork.ts';

export interface SilhouetteStageProps {
  status: 'loading' | 'error' | 'ready';
  artwork?: ProcessedArtwork;
  plan?: RevealPlan;
  /** 0 = opening view … 5 = everything. */
  stage: number;
  /** When true the black silhouette melts into the full-colour artwork. */
  solved?: boolean;
  onRetry?: () => void;
  className?: string;
}

/** Seconds between neighbouring tiles appearing, so a reveal ripples in. */
const TILE_STAGGER = 0.045;

export function SilhouetteStage({
  status,
  artwork,
  plan,
  stage,
  solved = false,
  onRetry,
  className = '',
}: SilhouetteStageProps) {
  const ready = status === 'ready' && artwork && plan;
  const percent = ready ? Math.round(plan.stageVisible[clampStage(plan, stage)]! * 100) : 0;
  const label = solved
    ? 'Revealed Pokémon artwork'
    : ready
      ? `Mystery Pokémon silhouette, ${percent}% revealed`
      : 'Mystery Pokémon silhouette';

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative aspect-square w-full overflow-hidden rounded-3xl border border-white/15 bg-[radial-gradient(circle_at_50%_38%,#b9a4ff_0%,#7c4ddb_42%,#2a1b6e_100%)] shadow-[0_0_60px_-10px_rgba(139,92,246,0.7)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_110%,rgba(34,211,238,0.35),transparent_55%)]" />
      {ready ? (
        <RevealLayers artwork={artwork} plan={plan} stage={stage} solved={solved} />
      ) : status === 'error' ? (
        <ErrorPanel onRetry={onRetry} />
      ) : (
        <LoadingPanel />
      )}
    </div>
  );
}

function clampStage(plan: RevealPlan, stage: number) {
  return Math.min(Math.max(Math.trunc(stage), 0), plan.stageCounts.length - 1);
}

function RevealLayers({
  artwork,
  plan,
  stage,
  solved,
}: {
  artwork: ProcessedArtwork;
  plan: RevealPlan;
  stage: number;
  solved: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const tiles = visibleTiles(plan, stage);
  const count = tiles.length;

  // Remember how many tiles were showing before this render: only tiles beyond that animate in.
  const [shown, setShown] = useState({ count, previous: count });
  if (shown.count !== count) setShown({ count, previous: shown.count });
  const previous = shown.previous;

  const { cols, rows } = plan;
  const ratio = artwork.width / artwork.height;

  return (
    <div className="absolute inset-0 flex items-center justify-center p-[8%]">
      <div
        className="relative max-h-full max-w-full"
        style={{ aspectRatio: ratio, ...(ratio >= 1 ? { width: '100%' } : { height: '100%' }) }}
      >
        {/* Faint grid over the whole picture: shows where tiles are without hinting at the shape. */}
        {!solved && count < plan.order.length && (
          <div
            aria-hidden
            className="shimmer absolute inset-0 rounded-md"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.16) 1px, transparent 1px)`,
              backgroundSize: `${100 / cols}% ${100 / rows}%`,
            }}
          />
        )}

        {tiles.map((tile, position) => {
          const col = tile % cols;
          const row = Math.floor(tile / cols);
          const isNew = position >= previous && !reduceMotion;
          const delay = (position - previous) * TILE_STAGGER;
          return (
            <motion.div
              key={tile}
              data-tile={tile}
              aria-hidden
              className="absolute inset-0"
              style={{
                clipPath: `inset(${(row / rows) * 100}% ${(1 - (col + 1) / cols) * 100}% ${(1 - (row + 1) / rows) * 100}% ${(col / cols) * 100}%)`,
                transformOrigin: `${((col + 0.5) / cols) * 100}% ${((row + 0.5) / rows) * 100}%`,
              }}
              initial={isNew ? { opacity: 0, scale: 0.8 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="absolute inset-0 bg-[length:100%_100%]"
                style={{ backgroundImage: `url(${artwork.silhouetteUrl})` }}
              />
              {isNew && (
                <motion.div
                  className="absolute inset-0 bg-cyan-300"
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.9, delay, ease: 'easeOut' }}
                />
              )}
            </motion.div>
          );
        })}

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
      <span className="animate-pulse text-8xl font-black text-white/25">?</span>
      <span className="sr-only">Loading silhouette…</span>
    </div>
  );
}

function ErrorPanel({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
      role="alert"
    >
      <p className="text-lg font-semibold text-white">The silhouette could not load.</p>
      <p className="text-sm text-white/70">Check your connection and try again.</p>
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
  );
}
