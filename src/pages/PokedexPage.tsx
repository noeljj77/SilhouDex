import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { useProgress } from '../app/progressStore.ts';
import { pokedexIndex } from '../data/pokedexIndex.ts';
import {
  browsePokedex,
  DEFAULT_FILTERS,
  generationProgress,
  type PokedexFilters,
} from '../domain/pokedex/browse.ts';
import type { SpeciesId } from '../domain/pokemon/types.ts';
import { computeCollectionStats } from '../domain/progression/stats.ts';
import { PokedexFilterBar } from '../features/pokedex/PokedexFilterBar.tsx';
import { PokemonCard } from '../features/pokedex/PokemonCard.tsx';
import { PokemonDetail } from '../features/pokedex/PokemonDetail.tsx';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

export function PokedexPage() {
  const { discoveries } = useProgress();
  const [filters, setFilters] = useState<PokedexFilters>(DEFAULT_FILTERS);
  const [openId, setOpenId] = useState<SpeciesId | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  // Typing stays responsive: the 1,025-tile grid catches up a moment later.
  const deferred = useDeferredValue(filters);
  const rows = useMemo(
    () => browsePokedex(pokedexIndex.entries, discoveries, deferred),
    [discoveries, deferred],
  );
  const stats = computeCollectionStats(discoveries, pokedexIndex.entries.length);
  const progress = useMemo(
    () => generationProgress(pokedexIndex.entries, discoveries),
    [discoveries],
  );

  const open = useCallback((id: SpeciesId, from: HTMLElement) => {
    trigger.current = from;
    setOpenId(id);
  }, []);
  const close = () => {
    setOpenId(null);
    trigger.current?.focus(); // return to the tile that was opened
  };

  const entry = openId === null ? undefined : pokedexIndex.getById(openId);
  const openRow = entry ? { entry, discovery: discoveries[entry.id] } : undefined;

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-glow">
            Your collection
          </p>
          <h1 className="text-3xl font-black text-white">Pokédex</h1>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-white">
            <span className="text-3xl font-black tabular-nums text-cyan-glow">
              {stats.discovered}
            </span>
            <span className="text-violet-200/80">
              {' '}
              of {stats.total} discovered ({stats.percent}%)
            </span>
          </p>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Collection completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stats.percent}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-glow to-violet-glow transition-[width] duration-700"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
          <ul
            className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
            aria-label="Progress by generation"
          >
            {progress.map((g) => (
              <li key={g.generation} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={filters.generation === g.generation}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      generation: f.generation === g.generation ? 'all' : g.generation,
                    }))
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-semibold tabular-nums transition focus-visible:outline-2 focus-visible:outline-cyan-glow ${filters.generation === g.generation ? 'border-cyan-glow bg-cyan-glow/20 text-cyan-glow' : g.discovered === g.total ? 'border-volt/60 bg-volt/10 text-volt' : 'border-white/15 text-white/70 hover:bg-white/10'}`}
                >
                  Gen {ROMAN[g.generation - 1]} · {g.discovered}/{g.total}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <PokedexFilterBar
        filters={filters}
        onChange={setFilters}
        shown={rows.length}
        total={pokedexIndex.entries.length}
      />

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-violet-200/70">
          No Pokémon match these filters.
        </p>
      ) : (
        <ul
          aria-label="Pokémon"
          className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
        >
          {rows.map((row) => (
            <PokemonCard key={row.entry.id} row={row} onOpen={open} />
          ))}
        </ul>
      )}

      <p className="text-xs text-violet-200/70">
        Regional and alternate forms count as their base Pokémon. Names of undiscovered Pokémon stay
        hidden, so search finds only the ones you have identified, plus any Pokémon by number.
      </p>

      {openRow && <PokemonDetail row={openRow} onClose={close} />}
    </main>
  );
}
