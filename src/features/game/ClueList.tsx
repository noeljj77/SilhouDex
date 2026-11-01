import {
  BookOpen,
  Calendar,
  Dna,
  Egg,
  Lock,
  Palette,
  Ruler,
  Shapes,
  Sparkles,
  Swords,
  TreePine,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Clue, ClueCategory } from '../../domain/clues/types.ts';
import { CLUES_PER_GAME } from '../../domain/game/config.ts';

const ICONS: Record<ClueCategory, LucideIcon> = {
  generation: Calendar,
  rarity: Sparkles,
  types: Zap,
  abilities: Swords,
  evolution: Dna,
  size: Ruler,
  stats: Swords,
  color: Palette,
  shape: Shapes,
  habitat: TreePine,
  eggGroup: Egg,
  pokedex: BookOpen,
};

/** Five clue slots. Each unlocks with a wrong guess. Locked slots show only when they open. */
export function ClueList({ clues, unlocked }: { clues: readonly Clue[]; unlocked: number }) {
  return (
    <section aria-label="Clues" className="flex flex-col gap-2.5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-200/70">Clues</h2>
      <ol className="flex flex-col gap-2.5">
        {Array.from({ length: CLUES_PER_GAME }, (_, i) => {
          const clue = clues[i];
          return clue && i < unlocked ? (
            <OpenClue key={clue.id} clue={clue} number={i + 1} />
          ) : (
            <LockedClue key={i} number={i + 1} />
          );
        })}
      </ol>
    </section>
  );
}

function OpenClue({ clue, number }: { clue: Clue; number: number }) {
  const Icon = ICONS[clue.category];
  return (
    <motion.li
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="flex gap-3 rounded-2xl border border-cyan-glow/30 bg-gradient-to-br from-night-700/80 to-night-800/80 p-3.5 shadow-[0_0_24px_-12px_rgba(34,211,238,0.6)]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-glow/15 text-cyan-glow">
        <Icon size={20} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-glow/80">
          Clue {number} · {clue.title}
        </p>
        <p className="mt-0.5 text-[0.95rem] leading-snug text-white">{clue.body}</p>
      </div>
    </motion.li>
  );
}

function LockedClue({ number }: { number: number }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-dashed border-white/15 p-3.5 text-white/60">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5">
        <Lock size={18} aria-hidden />
      </span>
      <p className="text-sm">
        Clue {number} unlocks after wrong guess {number}
      </p>
    </li>
  );
}
