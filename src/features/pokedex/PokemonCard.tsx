import { Check } from 'lucide-react';
import { memo } from 'react';
import { spriteUrl } from '../../data/sprites.ts';
import type { PokedexRow } from '../../domain/pokedex/browse.ts';
import type { SpeciesId } from '../../domain/pokemon/types.ts';

/**
 * One Pokédex tile. Discovered Pokémon show their artwork and name; the rest show a black
 * silhouette of a small sprite and "???" (no name appears anywhere in the page for them).
 */
export const PokemonCard = memo(
  function PokemonCard({
    row,
    onOpen,
  }: {
    row: PokedexRow;
    onOpen(id: SpeciesId, trigger: HTMLElement): void;
  }) {
    const { entry, discovery } = row;
    const label = discovery
      ? `${entry.name}, number ${entry.id}`
      : `Number ${entry.id}, undiscovered`;
    return (
      // Off-screen tiles are skipped by the browser's layout, which keeps 1,025 tiles cheap.
      <li className="[contain-intrinsic-size:auto_11rem] [content-visibility:auto]">
        <button
          type="button"
          aria-label={label}
          onClick={(e) => onOpen(entry.id, e.currentTarget)}
          className={`group relative flex w-full flex-col items-center gap-1 rounded-2xl border-2 border-ink p-2 text-center shadow-[0_3px_0_var(--color-ink)] transition hover:-translate-y-0.5 ${discovery ? 'bg-panel' : 'bg-line/60'}`}
        >
          <span
            className={`relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl border-2 border-ink ${discovery ? 'bg-[radial-gradient(circle_at_50%_45%,#b4e6ff,#3fa9ff)]' : 'bg-[radial-gradient(circle_at_50%_45%,#c9d5e8,#8ea3c2)]'}`}
          >
            {discovery ? (
              <img
                src={entry.artworkUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-[88%] object-contain drop-shadow-lg"
              />
            ) : (
              <img
                src={spriteUrl(entry.id)}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-[78%] object-contain opacity-90 brightness-0 [image-rendering:pixelated]"
              />
            )}
            {discovery && (
              <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full border-2 border-ink bg-volt text-ink">
                <Check size={12} strokeWidth={3} aria-hidden />
              </span>
            )}
          </span>
          <span className="text-xs font-semibold tabular-nums text-ink-soft">
            #{String(entry.id).padStart(4, '0')}
          </span>
          <span
            className={`w-full truncate text-sm font-bold ${discovery ? 'text-ink' : 'text-ink-soft'}`}
          >
            {discovery ? entry.name : '???'}
          </span>
        </button>
      </li>
    );
  },
  (a, b) =>
    a.row.entry === b.row.entry && a.row.discovery === b.row.discovery && a.onOpen === b.onOpen,
);
