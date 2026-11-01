import { Frown, Sparkles, Trophy, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { GameResult, FinishedStatus } from '../../domain/game/types.ts';
import type { PokemonIndexEntry } from '../../domain/pokemon/types.ts';
import { AnimatedNumber } from './AnimatedNumber.tsx';

const HEADLINES: Record<FinishedStatus, { text: string; icon: LucideIcon; tone: string }> = {
  won: { text: 'You got it!', icon: Trophy, tone: 'text-volt' },
  lost: { text: 'Out of guesses', icon: Frown, tone: 'text-red-300' },
  gave_up: { text: 'You gave up', icon: Frown, tone: 'text-red-300' },
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
      className="flex flex-col gap-4 rounded-3xl border border-white/15 bg-gradient-to-br from-night-700/90 to-night-800/90 p-5 shadow-[0_0_50px_-15px_rgba(139,92,246,0.8)]"
    >
      <div className={`flex items-center gap-2 text-lg font-black ${tone}`}>
        <Icon size={22} aria-hidden />
        <h2>{text}</h2>
      </div>

      <div>
        <p className="text-sm text-violet-200/70">
          {result.status === 'won' ? 'It was' : 'The answer was'}
        </p>
        <p className="text-3xl font-black text-white sm:text-4xl">
          <span className="text-white/55">#{String(entry.id).padStart(4, '0')}</span> {entry.name}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Types">
          {entry.types.map((t) => (
            <li
              key={t}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-sm font-semibold capitalize text-white"
            >
              {t}
            </li>
          ))}
          <li className="rounded-full border border-white/20 px-3 py-0.5 text-sm text-white/70">
            Gen {entry.generation}
          </li>
        </ul>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Score" value={<AnimatedNumber value={result.score} />} accent />
        <Stat label="Wrong guesses" value={result.wrongGuesses} />
        <Stat label="Reveals" value={result.revealsUsed} />
      </dl>

      {isNewDiscovery && (
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-glow/15 px-4 py-1.5 text-sm font-bold text-cyan-glow">
          <Sparkles size={16} aria-hidden /> New discovery added to your Pokédex!
        </p>
      )}
      {children}
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
    <div className="rounded-xl bg-white/5 px-2 py-3">
      <dd className={`text-2xl font-black tabular-nums ${accent ? 'text-volt' : 'text-white'}`}>
        {value}
      </dd>
      <dt className="text-xs text-violet-200/70">{label}</dt>
    </div>
  );
}
