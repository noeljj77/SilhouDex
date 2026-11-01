import {
  Award,
  BookOpen,
  CalendarDays,
  Shuffle,
  User,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { hrefFor, type RouteId } from './router.ts';
import { useOnline } from './useOnline.ts';

const NAV: { route: RouteId; label: string; icon: LucideIcon }[] = [
  { route: 'daily', label: 'Daily', icon: CalendarDays },
  { route: 'practice', label: 'Practice', icon: Shuffle },
  { route: 'pokedex', label: 'Pokédex', icon: BookOpen },
  { route: 'achievements', label: 'Awards', icon: Award },
  { route: 'profile', label: 'Profile', icon: User },
];

const REPO_URL = 'https://github.com/noeljj77/SilhouDex';

/** Page frame: brand and navigation (a tab bar on phones, a top bar on larger screens). */
export function AppShell({ route, children }: { route: RouteId; children: ReactNode }) {
  const online = useOnline();
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,var(--color-night-800),var(--color-night-950)_70%)]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-4 md:py-4">
        <a
          href={hrefFor('daily')}
          className="bg-linear-to-r from-violet-glow to-cyan-glow bg-clip-text text-2xl font-black tracking-tight text-transparent"
        >
          SilhouDex
        </a>
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-white/10 bg-night-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:z-auto md:gap-1 md:border-0 md:bg-transparent md:pb-0 md:backdrop-blur-none"
        >
          {NAV.map(({ route: target, label, icon: Icon }) => {
            const active = route === target;
            return (
              <a
                key={target}
                href={hrefFor(target)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-2 text-xs font-semibold transition md:min-h-10 md:flex-none md:flex-row md:gap-2 md:rounded-full md:px-4 md:text-sm ${active ? 'text-cyan-glow md:bg-cyan-glow/15' : 'text-white/60 hover:text-white md:hover:bg-white/10'}`}
              >
                <Icon size={20} aria-hidden />
                {label}
              </a>
            );
          })}
        </nav>
      </header>

      {!online && (
        <p
          role="status"
          className="mx-auto mt-2 flex w-full max-w-5xl items-center gap-2 px-4 text-sm text-volt"
        >
          <WifiOff size={16} aria-hidden className="shrink-0" />
          You&rsquo;re offline. Pokémon you&rsquo;ve already seen still work, but new ones may not
          load until you reconnect.
        </p>
      )}

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4">
        {/* A new key per page lets a crashed page recover when you move on. */}
        <ErrorBoundary key={route}>{children}</ErrorBoundary>
      </div>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-24 pt-10 text-xs leading-relaxed text-white/55 md:pb-8">
        <p>
          SilhouDex is an unofficial fan project, not affiliated with Nintendo, Game Freak,
          Creatures Inc. or The Pokémon Company. Pokémon and their names and artwork belong to their
          owners. Pokémon data comes from{' '}
          <a
            href="https://pokeapi.co/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-white"
          >
            PokéAPI
          </a>
          .{' '}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-white"
          >
            Source on GitHub
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
