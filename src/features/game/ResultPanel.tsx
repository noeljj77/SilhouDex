import { Frown, Sparkles, Trophy, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { typeStyle } from '../../components/typeColors.ts';
import type { GameResult, FinishedStatus } from '../../domain/game/types.ts';
import type { PokemonIndexEntry } from '../../domain/pokemon/types.ts';
import { AnimatedNumber } from './AnimatedNumber.tsx';

const HEADLINES: Record<FinishedStatus, { text: string; icon: LucideIcon; tone: string }> = {
  won: { text: 'You got it!', icon: Trophy, tone: 'text-ink' },
  lost: { text: 'Out of guesses', icon: Frown, tone: 'text-ink' },
  gave_up: { text: 'You gave up', icon: Frown, tone: 'text-ink' },
};

/** Shown instead of the guess box once the game is over. */
export function ResultPanel({
  result,
  entry,
  isNewDiscovery,
  children,
}: {
  result: GameResult;
  entry: PokemonIndexEntry;
  isNewDiscovery: boolean;
  children?: ReactNode;
}) {
  const { text, icon: Icon, tone } = HEADLINES[result.status];
  return (
    <motion.section
      aria-label="Result"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="dex-card flex flex-col gap-4 overflow-hidden !rounded-3xl pb-5"
    >
      <div
        className={`flex items-center gap-2 border-b-2 border-ink px-5 py-3 font-display text-xl ${result.status === 'won' ? 'bg-volt' : 'bg-line'} ${tone}`}
      >
        <Icon size={22} aria-hidden />
        <h2>{text}</h2>
      </div>

      <div className="px-5">
        <p className="text-sm font-semibold text-ink-soft">
          {result.status === 'won' ? 'It was' : 'The answer was'}
        </p>
        <p className="font-display text-3xl text-ink sm:text-4xl">
          <span className="text-ink-soft">#{String(entry.id).padStart(4, '0')}</span> {entry.name}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Types">
          {entry.types.map((t) => (
            <li key={t} style={typeStyle(t)} className="dex-chip capitalize">
              {t}
            </li>
          ))}
          <li className="dex-chip">Gen {entry.generation}</li>
        </ul>
      </div>

      <dl className="mx-5 grid grid-cols-3 gap-3 text-center">
        <Stat label="Score" value={<AnimatedNumber value={result.score} />} accent />
        <Stat label="Wrong guesses" value={result.wrongGuesses} />
        <Stat label="Reveals" value={result.revealsUsed} />
      </dl>

      {isNewDiscovery && (
        <p className="dex-chip mx-5 w-fit bg-lens-deep !py-1.5 !text-sm !text-white">
          <Sparkles size={16} aria-hidden /> New discovery added to your Pokédex!
        </p>
      )}
      {children && <div className="px-5">{children}</div>}
    </motion.section>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border-2 border-line bg-paper px-2 py-3">
      <dd className={`font-display text-3xl tabular-nums ${accent ? 'text-dex' : 'text-ink'}`}>
        {value}
      </dd>
      <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
    </div>
  );
}
