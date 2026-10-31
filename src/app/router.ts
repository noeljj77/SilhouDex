import { useSyncExternalStore } from 'react';

export const ROUTES = ['daily', 'practice', 'pokedex', 'achievements', 'profile', 'lab'] as const;
export type RouteId = (typeof ROUTES)[number];

export const DEFAULT_ROUTE: RouteId = 'daily';

/** "#/practice" → "practice". Anything unknown falls back to the daily game. */
export function parseRoute(hash: string): RouteId {
  const name = hash.replace(/^#\/?/, '').split(/[/?]/)[0] ?? '';
  return (ROUTES as readonly string[]).includes(name) ? (name as RouteId) : DEFAULT_ROUTE;
}

export const hrefFor = (route: RouteId) => `#/${route}`;

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

/** The current page. Hash routing needs no server setup, so it works on GitHub Pages. */
export function useRoute(): RouteId {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}
