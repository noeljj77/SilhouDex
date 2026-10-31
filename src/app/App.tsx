import { lazy, Suspense } from 'react';
import { AchievementToaster } from '../features/achievements/AchievementToaster.tsx';
import { AchievementsPage } from '../pages/AchievementsPage.tsx';
import { DailyPage } from '../pages/DailyPage.tsx';
import { PokedexPage } from '../pages/PokedexPage.tsx';
import { PracticePage } from '../pages/PracticePage.tsx';
import { SilhouetteLabPage } from '../pages/SilhouetteLabPage.tsx';
import { AppShell } from './AppShell.tsx';
import { ProgressProvider } from './ProgressProvider.tsx';
import { useRoute, type RouteId } from './router.ts';

// Loaded on demand: it carries the charting library, which the game screens do not need.
const ProfilePage = lazy(() =>
  import('../pages/ProfilePage.tsx').then((m) => ({ default: m.ProfilePage })),
);

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
      return (
        <Suspense fallback={<p className="py-16 text-center text-violet-200/70">Loading…</p>}>
          <ProfilePage />
        </Suspense>
      );
    case 'lab':
      return <SilhouetteLabPage />;
  }
}

export function App() {
  const route = useRoute();
  return (
    <ProgressProvider>
      <AchievementToaster />
      <AppShell route={route}>
        <Page route={route} />
      </AppShell>
    </ProgressProvider>
  );
}
