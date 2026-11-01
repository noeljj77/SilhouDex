import { Search } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { pokedexIndex } from '../../data/pokedexIndex.ts';
import type { GuessOutcome } from '../../domain/game/engine.ts';
import { SCORING } from '../../domain/game/config.ts';
import type { PokemonIndexEntry, SpeciesId } from '../../domain/pokemon/types.ts';

interface GuessInputProps {
  disabled?: boolean;
  /** Pokémon already guessed this game: shown as unavailable. */
  guessedIds: ReadonlySet<SpeciesId>;
  onGuess(pokemonId: SpeciesId): GuessOutcome;
}

type Message = { kind: 'info' | 'wrong'; text: string } | null;

/**
 * Search box with a suggestion list (the ARIA "combobox" pattern).
 * Tapping a suggestion fills the box; pressing Guess (or Enter on a highlighted suggestion) submits,
 * so a mis-tap on a phone can never cost points.
 */
export function GuessInput({ disabled = false, guessedIds, onGuess }: GuessInputProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const suggestions = value.trim() ? pokedexIndex.search(value, 6) : [];
  const exact = pokedexIndex.findByName(value);
  const showList = open && suggestions.length > 0 && !disabled;

  const submit = (entry: PokemonIndexEntry) => {
    const outcome = onGuess(entry.id);
    if (outcome === 'duplicate')
      setMessage({ kind: 'info', text: `You already guessed ${entry.name}.` });
    else if (outcome === 'wrong') {
      setMessage({
        kind: 'wrong',
        text: `Not ${entry.name}. −${SCORING.wrongGuessPenalty} points.`,
      });
    } else setMessage(null);
    setValue('');
    setActive(-1);
    setOpen(false);
    inputRef.current?.focus();
  };

  const choose = (entry: PokemonIndexEntry) => {
    if (guessedIds.has(entry.id)) return;
    setValue(entry.name);
    setActive(-1);
    setOpen(false);
    setMessage(null);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const count = suggestions.length;
      // From nothing highlighted, Down picks the first item and Up the last.
      setActive((i) => (i < 0 ? (step === 1 ? 0 : count - 1) : (i + step + count) % count));
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = showList && active >= 0 ? suggestions[active] : exact;
      if (target) submit(target);
      else if (value.trim()) setMessage({ kind: 'info', text: 'Pick a Pokémon from the list.' });
    }
  };

  return (
    <div className="relative">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (exact) submit(exact);
        }}
      >
        <div className="relative flex-1">
          <Search
            aria-hidden
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            ref={inputRef}
            role="combobox"
            aria-label="Your guess"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={disabled}
            value={value}
            placeholder="Who's that Pokémon?"
            onChange={(e) => {
              setValue(e.target.value);
              setActive(-1);
              setOpen(true);
              setMessage(null);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            className="dex-field h-12 !pl-10"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !exact || guessedIds.has(exact.id)}
          className="dex-btn dex-btn-yellow h-12 px-6 text-lg"
        >
          Guess
        </button>
      </form>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching Pokémon"
          // Opens upward on phones (the box sits low on the screen) and downward on larger screens.
          className="absolute inset-x-0 bottom-full z-10 mb-1.5 dex-card overflow-hidden !shadow-[0_6px_0_var(--color-ink)] md:bottom-auto md:top-[3.25rem] md:mb-0"
        >
          {suggestions.map((entry, i) => {
            const guessed = guessedIds.has(entry.id);
            return (
              <li
                key={entry.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={guessed}
                // mousedown (not click) so the input keeps focus and the list does not close first
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(entry);
                }}
                className={`flex min-h-11 cursor-pointer items-center justify-between border-b border-line px-4 py-2 font-semibold text-ink last:border-b-0 ${i === active ? 'bg-volt' : 'hover:bg-paper'} ${guessed ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                <span>{entry.name}</span>
                <span className="text-xs font-medium text-ink-soft">
                  {guessed ? 'Already guessed' : `#${entry.id}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p
        role="status"
        aria-live="polite"
        className={`mt-2 min-h-5 text-sm ${message?.kind === 'wrong' ? 'font-bold text-dex-dark' : 'text-ink-soft'}`}
      >
        {message?.text}
      </p>
    </div>
  );
}
