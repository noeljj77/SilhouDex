import { DIFFICULTY_PROFILES, type DifficultyLevel } from '../../domain/clues/difficulty.ts';

const OPTIONS: { level: DifficultyLevel; label: string; hint: string }[] = [
  { level: 'easy', label: 'Easy', hint: 'Stronger clues' },
  { level: 'normal', label: 'Normal', hint: 'Balanced clues' },
  { level: 'hard', label: 'Hard', hint: 'Vaguer clues' },
];

// Guards against the list drifting from the real profiles.
for (const { level } of OPTIONS)
  if (!(level in DIFFICULTY_PROFILES)) throw new Error(`Unknown level ${level}`);

/** Picks how strong the clues are. Locked once a game has started, so clues never change mid-game. */
export function DifficultyPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: DifficultyLevel;
  onChange(level: DifficultyLevel): void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-label="Clue difficulty"
        className="inline-flex w-fit rounded-xl border border-white/15 bg-white/5 p-1"
      >
        {OPTIONS.map(({ level, label, hint }) => {
          const selected = value === level;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={selected}
              title={hint}
              disabled={disabled}
              onClick={() => onChange(level)}
              className={`min-h-9 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-cyan-glow disabled:cursor-not-allowed ${selected ? 'bg-cyan-glow/20 text-cyan-glow' : 'text-white/70 enabled:hover:bg-white/10'} ${disabled && !selected ? 'opacity-40' : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-violet-200/60">
        {disabled
          ? 'Difficulty can be changed between games.'
          : OPTIONS.find((o) => o.level === value)?.hint}
      </p>
    </div>
  );
}
