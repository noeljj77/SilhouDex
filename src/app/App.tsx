import { lazy, Suspense } from 'react';
import { AchievementToaster } from '../features/achievements/AchievementToaster.tsx';
import { DailyPage } from '../pages/DailyPage.tsx';
import { PokeBall } from '../components/PokeBall.tsx';
import { CloudProvider } from '../cloud/CloudProvider.tsx';
import { AppShell } from './AppShell.tsx';
import { ProgressProvider } from './ProgressProvider.tsx';
import { useRoute, type RouteId } from './router.ts';

// The Daily game is what most visitors open first, so it loads with the app. Every other page
// loads when it is opened, which keeps the first load small (Profile also brings the charts).
const PracticePage = lazy(() =>
  import('../pages/PracticePage.tsx').then((m) => ({ default: m.PracticePage })),
);
const PokedexPage = lazy(() =>
  import('../pages/PokedexPage.tsx').then((m) => ({ default: m.PokedexPage })),
);
const AchievementsPage = lazy(() =>
  import('../pages/AchievementsPage.tsx').then((m) => ({ default: m.AchievementsPage })),
);
const ProfilePage = lazy(() =>
  import('../pages/ProfilePage.tsx').then((m) => ({ default: m.ProfilePage })),
);
// The developer-only Silhouette Lab shows answers, so it is left out of the published site entirely.
const SilhouetteLabPage = import.meta.env.DEV
  ? lazy(() =>
      import('../pages/SilhouetteLabPage.tsx').then((m) => ({ default: m.SilhouetteLabPage })),
    )
  : null;

function Page({ route }: { route: RouteId }) {
  switch (route) {
    case 'daily':
      return <DailyPage />;
    case 'practice':
      return <PracticePage />;
    case 'pokedex':
      return <PokedexPage />;
    case 'achievements':
      return <AchievementsPage />;
    case 'profile':
      return <ProfilePage />;
    case 'lab':
      return SilhouetteLabPage ? <SilhouetteLabPage /> : <DailyPage />;
  }
}

function PageLoading() {
  return (
    <p
      role="status"
      className="flex flex-col items-center gap-3 py-16 text-center font-display text-ink-soft"
    >
      <PokeBall
        size={44}
        className="animate-spin [animation-duration:1.4s] motion-reduce:animate-none"
      />
      Loading…
    </p>
  );
}

export function App() {
  const route = useRoute();
  return (
    <ProgressProvider>
      <CloudProvider>
        <AchievementToaster />
        <AppShell route={route}>
          <Suspense fallback={<PageLoading />}>
            <Page route={route} />
          </Suspense>
        </AppShell>
      </CloudProvider>
    </ProgressProvider>
  );
}
