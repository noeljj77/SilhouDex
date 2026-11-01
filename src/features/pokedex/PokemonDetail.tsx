import { Sparkles, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { typeStyle } from '../../components/typeColors.ts';
import { useDialogKeys } from '../../components/useDialogKeys.ts';
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

  const onKeyDown = useDialogKeys(panelRef, onClose);

  return (
    <div
      className="fixed inset-0 z-30 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
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
        className="relative flex max-h-full w-full max-w-md flex-col gap-4 dex-card overflow-y-auto !rounded-3xl p-5"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-paper hover:text-ink"
        >
          <X size={20} aria-hidden />
        </button>

        <div className="mx-auto grid aspect-square w-3/4 max-w-60 place-items-center rounded-2xl border-2 border-ink bg-[radial-gradient(circle_at_50%_45%,#b4e6ff,#3fa9ff_65%,#1767d1)]">
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
              className="size-[80%] object-contain opacity-90 brightness-0 [image-rendering:pixelated]"
            />
          )}
        </div>

        {discovery ? (
          <>
            <div className="text-center">
              <p className="text-sm font-semibold tabular-nums text-ink-soft">
                #{String(entry.id).padStart(4, '0')}
              </p>
              <h2 className="font-display text-4xl text-ink">{entry.name}</h2>
              <ul className="mt-2 flex flex-wrap justify-center gap-2" aria-label="Details">
                {entry.types.map((t) => (
                  <li key={t} style={typeStyle(t)} className="dex-chip capitalize">
                    {t}
                  </li>
                ))}
                <li className="dex-chip">Generation {entry.generation}</li>
                {entry.isLegendary && <li className="dex-chip bg-volt">Legendary</li>}
                {entry.isMythical && <li className="dex-chip bg-volt">Mythical</li>}
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
            <p className="text-sm font-semibold tabular-nums text-ink-soft">
              #{String(entry.id).padStart(4, '0')}
            </p>
            <h2 className="font-display text-3xl text-ink-soft">Undiscovered</h2>
            <p className="text-sm text-ink-soft">
              Identify this Pokémon in a game to add it to your Pokédex. Giving up does not count.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <a href={hrefFor('daily')} className="dex-btn !min-h-10 !text-sm">
                <Sparkles size={16} aria-hidden /> Daily challenge
              </a>
              <a href={hrefFor('practice')} className="dex-btn !min-h-10 !text-sm">
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
    <div className="rounded-xl border-2 border-line bg-paper p-3">
      <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-bold text-ink">{value}</dd>
    </div>
  );
}
