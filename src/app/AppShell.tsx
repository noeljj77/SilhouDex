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
import { AccountButton } from '../features/account/AccountButton.tsx';
import { HowToPlay } from '../features/help/HowToPlay.tsx';
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

/** The Pokédex lens: a blue glass dome with a highlight. Decorative. */
function Lens() {
  return (
    <span
      aria-hidden
      className="relative grid size-11 shrink-0 place-items-center rounded-full border-[3px] border-white bg-[radial-gradient(circle_at_35%_30%,#bfe6ff,#2f9bff_45%,#0f4fa8)] shadow-[0_0_0_3px_var(--color-ink),inset_0_-4px_8px_rgb(0_0_0/0.25)]"
    >
      <span className="absolute left-2 top-1.5 size-3 rounded-full bg-white/80 blur-[1px]" />
    </span>
  );
}

/** Page frame: the Pokédex's red top shell with the brand, and the navigation (a tab bar on phones). */
export function AppShell({ route, children }: { route: RouteId; children: ReactNode }) {
  const online = useOnline();
  return (
    <div className="dex-backdrop flex min-h-dvh flex-col">
      <div className="border-b-[3px] border-ink bg-dex shadow-[inset_0_-5px_0_var(--color-dex-dark)]">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <a href={hrefFor('daily')} className="flex items-center gap-3 rounded-full">
            <Lens />
            <span className="flex flex-col gap-1">
              <span
                aria-hidden
                className="flex gap-1.5 [&>i]:size-2 [&>i]:rounded-full [&>i]:border [&>i]:border-ink"
              >
                <i className="led-blink bg-[#ff6b6b]" />
                <i className="bg-volt" />
                <i className="bg-[#5be08a]" />
              </span>
              <span className="font-display text-2xl leading-none text-white [text-shadow:0_2px_0_var(--color-dex-dark)]">
                SilhouDex
              </span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <nav
              aria-label="Main"
              className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t-[3px] border-ink bg-panel pb-[env(safe-area-inset-bottom)] lg:static lg:z-auto lg:gap-1.5 lg:border-0 lg:bg-transparent lg:pb-0"
            >
              {NAV.map(({ route: target, label, icon: Icon }) => {
                const active = route === target;
                return (
                  <a
                    key={target}
                    href={hrefFor(target)}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-semibold transition lg:min-h-10 lg:flex-none lg:flex-row lg:gap-2 lg:rounded-full lg:border-2 lg:px-4 lg:text-sm ${active ? 'text-dex lg:border-ink lg:bg-volt lg:text-ink lg:shadow-[0_2px_0_var(--color-ink)]' : 'text-ink-soft hover:text-ink lg:border-transparent lg:text-white lg:hover:bg-white/15 lg:hover:text-white'}`}
                  >
                    <span
                      className={`grid h-7 w-12 place-items-center rounded-full transition lg:h-auto lg:w-auto ${active ? 'bg-dex/12 lg:bg-transparent' : ''}`}
                    >
                      <Icon size={20} aria-hidden />
                    </span>
                    {label}
                  </a>
                );
              })}
            </nav>
            <HowToPlay />
            <AccountButton />
          </div>
        </header>
      </div>

      {!online && (
        <p
          role="status"
          className="mx-auto mt-3 flex w-full max-w-5xl items-center gap-2 px-4 text-sm font-semibold text-dex-dark"
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

      <footer className="mx-auto w-full max-w-5xl px-4 pb-28 pt-10 text-xs leading-relaxed text-ink-soft lg:pb-8">
        <p>
          SilhouDex is an unofficial fan project, not affiliated with Nintendo, Game Freak,
          Creatures Inc. or The Pokémon Company. Pokémon and their names and artwork belong to their
          owners. Pokémon data comes from{' '}
          <a
            href="https://pokeapi.co/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            PokéAPI
          </a>
          .{' '}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            Source on GitHub
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
