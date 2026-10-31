import { Award, BookOpen, CalendarDays, Shuffle, User, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { hrefFor, type RouteId } from './router.ts';

const NAV: { route: RouteId; label: string; icon: LucideIcon }[] = [
  { route: 'daily', label: 'Daily', icon: CalendarDays },
  { route: 'practice', label: 'Practice', icon: Shuffle },
  { route: 'pokedex', label: 'Pokédex', icon: BookOpen },
  { route: 'achievements', label: 'Awards', icon: Award },
  { route: 'profile', label: 'Profile', icon: User },
];

/** Page frame: brand and navigation (a tab bar on phones, a top bar on larger screens). */
export function AppShell({ route, children }: { route: RouteId; children: ReactNode }) {
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
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-4 md:pb-10">{children}</div>
    </div>
  );
}
