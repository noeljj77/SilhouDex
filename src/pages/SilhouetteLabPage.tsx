import { Eye, RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { pokedexIndex } from '../data/pokedexIndex.ts';
import { REVEAL_FRACTIONS } from '../domain/game/config.ts';
import { computeRevealOrder } from '../domain/reveal/mask.ts';
import { SilhouetteStage } from '../features/game/silhouette/SilhouetteStage.tsx';
import { useSilhouette } from '../features/game/silhouette/useSilhouette.ts';

/** Odd shapes worth checking: long, tall, tiny, wide, hollow, spiky. */
const QUICK_PICKS: { id: number; note: string }[] = [
  { id: 25, note: 'classic' },
  { id: 95, note: 'very long' },
  { id: 384, note: 'long & thin' },
  { id: 50, note: 'tiny' },
  { id: 321, note: 'huge' },
  { id: 24, note: 'wide' },
  { id: 94, note: 'ghost' },
  { id: 6, note: 'wings' },
  { id: 151, note: 'floaty' },
  { id: 133, note: 'fluffy' },
];

const randomSeed = () => `lab:${Math.random().toString(36).slice(2, 8)}`;

/**
 * Developer preview of the silhouette reveal. It shows answers on purpose.
 * The real Daily and Practice screens replace this in later milestones.
 */
export function SilhouetteLabPage() {
  const [pokemonId, setPokemonId] = useState(25);
  const [stage, setStage] = useState(0);
  const [solved, setSolved] = useState(false);
  const [seed, setSeed] = useState('lab:demo');
  const [query, setQuery] = useState('');

  const entry = pokedexIndex.getById(pokemonId);
  const state = useSilhouette(entry?.artworkUrl ?? null);
  const artwork = state.status === 'ready' ? state.artwork : undefined;
  const order = useMemo(
    () =>
      artwork
        ? computeRevealOrder(
            { alpha: artwork.alpha, width: artwork.alphaWidth, height: artwork.alphaHeight },
            `${seed}|${pokemonId}`,
          )
        : undefined,
    [artwork, seed, pokemonId],
  );

  const choose = (id: number) => {
    setPokemonId(id);
    setStage(0);
    setSolved(false);
    setQuery('');
  };
  const results = query.trim() ? pokedexIndex.search(query, 6) : [];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="bg-linear-to-r from-violet-glow to-cyan-glow bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
          SilhouDex
        </h1>
        <p className="text-violet-200/80">Every shadow has a story.</p>
        <p className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-volt/40 px-3 py-1 text-xs text-volt">
          <Sparkles size={14} aria-hidden /> Silhouette Lab — developer preview (shows answers)
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <section aria-label="Preview" className="flex flex-col gap-4">
          <SilhouetteStage
            status={state.status}
            artwork={artwork}
            order={order}
            stage={stage}
            solved={solved}
            onRetry={state.retry}
          />
          <p className="text-center text-lg font-bold text-white">
            {entry ? `#${entry.id} ${entry.name}` : 'Unknown'}
          </p>
        </section>

        <section aria-label="Controls" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-200/70">
              Reveal stage
            </h2>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={stage === s}
                  onClick={() => {
                    setStage(s);
                    setSolved(false);
                  }}
                  className={`h-11 min-w-11 rounded-xl border px-3 font-bold transition ${stage === s ? 'border-cyan-glow bg-cyan-glow/20 text-cyan-glow' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <LabButton
                icon={<Eye size={16} aria-hidden />}
                onClick={() => setStage((s) => Math.min(5, s + 1))}
              >
                Reveal next
              </LabButton>
              <LabButton
                icon={<Sparkles size={16} aria-hidden />}
                onClick={() => setSolved((v) => !v)}
              >
                {solved ? 'Hide answer' : 'Solve it'}
              </LabButton>
              <LabButton
                icon={<RotateCcw size={16} aria-hidden />}
                onClick={() => {
                  setStage(0);
                  setSolved(false);
                }}
              >
                Reset
              </LabButton>
              <LabButton
                icon={<Shuffle size={16} aria-hidden />}
                onClick={() => setSeed(randomSeed())}
              >
                New reveal order
              </LabButton>
            </div>
            <p className="text-xs text-violet-200/60">
              Seed: <code>{seed}</code> — the same seed always reveals in the same way.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-200/70">
              Pick a Pokémon
            </h2>
            <label className="sr-only" htmlFor="lab-search">
              Search Pokémon
            </label>
            <input
              id="lab-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              autoComplete="off"
              className="h-11 rounded-xl border border-white/15 bg-white/5 px-4 text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-cyan-glow"
            />
            {results.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => choose(r.id)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white hover:bg-white/10"
                    >
                      #{r.id} {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_PICKS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={pokemonId === p.id}
                  onClick={() => choose(p.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${pokemonId === p.id ? 'border-volt bg-volt/15 text-volt' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}
                >
                  {pokedexIndex.getById(p.id)?.name}{' '}
                  <span className="text-white/50">· {p.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-200/70">
              Reveal: clockwise fog
            </h2>
            <table className="w-full max-w-sm text-sm">
              <thead>
                <tr className="text-left text-violet-200/60">
                  <th className="py-1 font-medium">Stage</th>
                  <th className="py-1 font-medium">Shape visible</th>
                </tr>
              </thead>
              <tbody>
                {REVEAL_FRACTIONS.map((fraction, s) => (
                  <tr key={s} className={s === stage ? 'text-cyan-glow' : 'text-white/80'}>
                    <td className="py-0.5">{s}</td>
                    <td className="py-0.5">{Math.round(fraction * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function LabButton({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-glow/50 bg-violet-glow/15 px-4 text-sm font-semibold text-white transition hover:bg-violet-glow/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-glow"
    >
      {icon}
      {children}
    </button>
  );
}
