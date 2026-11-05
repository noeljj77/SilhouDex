import { ALL_GENERATIONS, romanGeneration } from '../../domain/pokemon/generations.ts';
import type { Generation } from '../../domain/pokemon/types.ts';

/**
 * Chooses which generations Practice draws its Pokémon from. At least one always stays chosen.
 * Locked once a game has started, so the pool never changes under a game in progress.
 */
export function GenerationPicker({
  value,
  onChange,
  poolSize,
  disabled = false,
}: {
  value: readonly Generation[];
  onChange(next: Generation[]): void;
  /** How many Pokémon the current choice leaves in play. */
  poolSize: number;
  disabled?: boolean;
}) {
  const all = value.length === ALL_GENERATIONS.length;

  const toggle = (generation: Generation) => {
    const on = value.includes(generation);
    if (on && value.length === 1) return; // keep at least one
    onChange(on ? value.filter((g) => g !== generation) : [...value, generation]);
  };

  return (
    <section aria-label="Practice generations" className="flex flex-col gap-1.5">
      <p className="font-display text-lg text-ink">Generations</p>
      {/* One swipeable row on phones, so the game stays in view; it wraps on wider screens. */}
      <div
        role="group"
        aria-label="Generations"
        className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
      >
        {ALL_GENERATIONS.map((generation) => {
          const on = value.includes(generation);
          const lastOne = on && value.length === 1;
          return (
            <button
              key={generation}
              type="button"
              aria-pressed={on}
              aria-disabled={lastOne || undefined}
              disabled={disabled}
              onClick={() => toggle(generation)}
              className={`dex-chip min-h-9 shrink-0 cursor-pointer !px-3 !text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${on ? '!bg-dex !text-white' : 'enabled:hover:bg-paper'} ${lastOne ? '!cursor-not-allowed' : ''}`}
            >
              Gen {romanGeneration(generation)}
            </button>
          );
        })}
        <button
          type="button"
          disabled={disabled || all}
          onClick={() => onChange([...ALL_GENERATIONS])}
          className="dex-chip min-h-9 shrink-0 cursor-pointer !px-3 !text-sm enabled:hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
        >
          All
        </button>
      </div>
      <p className="text-xs text-ink-soft" aria-live="polite">
        {disabled
          ? 'Generations can be changed between games.'
          : `${poolSize} Pokémon in play. At least one generation stays on.`}
      </p>
    </section>
  );
}
