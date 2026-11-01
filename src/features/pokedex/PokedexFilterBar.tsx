import { RotateCcw, Search } from 'lucide-react';
import {
  DEFAULT_FILTERS,
  SORT_LABELS,
  type PokedexFilters,
  type SortKey,
  type StatusFilter,
} from '../../domain/pokedex/browse.ts';
import { POKEMON_TYPES, type Generation } from '../../domain/pokemon/types.ts';

const STATUS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'discovered', label: 'Discovered' },
  { value: 'undiscovered', label: 'Undiscovered' },
];
const GENERATIONS: Generation[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

const selectClass = 'dex-field h-11 !min-h-0 text-sm font-medium';

export function PokedexFilterBar({
  filters,
  onChange,
  shown,
  total,
}: {
  filters: PokedexFilters;
  onChange(next: PokedexFilters): void;
  shown: number;
  total: number;
}) {
  const set = <K extends keyof PokedexFilters>(key: K, value: PokedexFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const changed = (Object.keys(DEFAULT_FILTERS) as (keyof PokedexFilters)[]).some(
    (k) => filters[k] !== DEFAULT_FILTERS[k],
  );

  return (
    <section aria-label="Filters" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            type="search"
            aria-label="Search"
            placeholder="Search name or number"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            autoComplete="off"
            className="dex-field h-11 !min-h-0 !pl-10"
          />
        </div>
        <div
          role="radiogroup"
          aria-label="Show"
          className="inline-flex w-fit gap-1 rounded-xl border-2 border-ink bg-panel p-1"
        >
          {STATUS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={filters.status === value}
              onClick={() => set('status', value)}
              className={`min-h-9 rounded-lg px-3 font-display text-sm transition ${filters.status === value ? 'bg-dex text-white' : 'text-ink-soft hover:bg-paper'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:flex md:flex-wrap md:items-end">
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
          Generation
          <select
            className={selectClass}
            value={String(filters.generation)}
            onChange={(e) =>
              set(
                'generation',
                e.target.value === 'all' ? 'all' : (Number(e.target.value) as Generation),
              )
            }
          >
            <option value="all">All</option>
            {GENERATIONS.map((g) => (
              <option key={g} value={g}>
                Generation {ROMAN[g - 1]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink-soft">
          Type
          <select
            className={`${selectClass} capitalize`}
            value={filters.type}
            onChange={(e) => set('type', e.target.value as PokedexFilters['type'])}
          >
            <option value="all">All</option>
            {POKEMON_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1 sm:col-span-1 text-sm font-semibold text-ink-soft">
          Sort
          <select
            className={selectClass}
            value={filters.sort}
            onChange={(e) => set('sort', e.target.value as SortKey)}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        {changed && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-lens-deep hover:bg-lens/15"
          >
            <RotateCcw size={16} aria-hidden /> Reset filters
          </button>
        )}
        <p
          role="status"
          aria-live="polite"
          className="col-span-2 text-sm font-semibold text-ink-soft sm:col-span-3 md:ml-auto md:self-center"
        >
          Showing {shown} of {total}
        </p>
      </div>
    </section>
  );
}
