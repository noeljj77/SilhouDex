import { Sparkles, X } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { hrefFor } from '../../app/router.ts';
import { spriteUrl } from '../../data/sprites.ts';
import type { PokedexRow } from '../../domain/pokedex/browse.ts';

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
};

const MODE_NAMES = { daily: 'Daily Silhouette', practice: 'Practice' } as const;

/** A modal panel with the details of one Pokédex entry. Escape or the backdrop closes it. */
export function PokemonDetail({ row, onClose }: { row: PokedexRow; onClose(): void }) {
  const { entry, discovery } = row;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => closeRef.current?.focus(), []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    // Keep Tab inside the panel.
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 grid place-items-center bg-night-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={
          discovery ? `${entry.name}, number ${entry.id}` : `Number ${entry.id}, undiscovered`
        }
        onKeyDown={onKeyDown}
        className="relative flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-br from-night-700 to-night-800 p-5 shadow-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-glow"
        >
          <X size={20} aria-hidden />
        </button>

        <div className="mx-auto grid aspect-square w-3/4 max-w-60 place-items-center rounded-2xl bg-[radial-gradient(circle_at_50%_40%,#b9a4ff,#5b34b8)]">
          {discovery ? (
            <img
              src={entry.artworkUrl}
              alt=""
              className="size-[92%] object-contain drop-shadow-xl"
            />
          ) : (
            <img
              src={spriteUrl(entry.id)}
              alt=""
              className="size-[80%] object-contain opacity-80 brightness-0 [image-rendering:pixelated]"
            />
          )}
        </div>

        {discovery ? (
          <>
            <div className="text-center">
              <p className="text-sm tabular-nums text-white/50">
                #{String(entry.id).padStart(4, '0')}
              </p>
              <h2 className="text-3xl font-black text-white">{entry.name}</h2>
              <ul className="mt-2 flex flex-wrap justify-center gap-2" aria-label="Details">
                {entry.types.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-sm font-semibold capitalize text-white"
                  >
                    {t}
                  </li>
                ))}
                <li className="rounded-full border border-white/20 px-3 py-0.5 text-sm text-white/70">
                  Generation {entry.generation}
                </li>
                {entry.isLegendary && (
                  <li className="rounded-full bg-volt/20 px-3 py-0.5 text-sm font-semibold text-volt">
                    Legendary
                  </li>
                )}
                {entry.isMythical && (
                  <li className="rounded-full bg-volt/20 px-3 py-0.5 text-sm font-semibold text-volt">
                    Mythical
                  </li>
                )}
              </ul>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Fact label="First discovered" value={formatDate(discovery.firstDiscoveredAt)} />
              <Fact label="Last discovered" value={formatDate(discovery.lastDiscoveredAt)} />
              <Fact label="Times identified" value={String(discovery.timesDiscovered)} />
              <Fact
                label="Discovered in"
                value={discovery.modes.map((m) => MODE_NAMES[m]).join(' and ')}
              />
            </dl>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm tabular-nums text-white/50">
              #{String(entry.id).padStart(4, '0')}
            </p>
            <h2 className="text-2xl font-black text-white/80">Undiscovered</h2>
            <p className="text-sm text-violet-200/80">
              Identify this Pokémon in a game to add it to your Pokédex. Giving up does not count.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <a
                href={hrefFor('daily')}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                <Sparkles size={16} aria-hidden /> Daily challenge
              </a>
              <a
                href={hrefFor('practice')}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                Practice
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <dt className="text-xs uppercase tracking-wider text-violet-200/60">{label}</dt>
      <dd className="mt-0.5 font-semibold text-white">{value}</dd>
    </div>
  );
}
