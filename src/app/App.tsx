import { Award, BookOpen } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { ComingSoonPage } from '../pages/ComingSoonPage.tsx';
import { DailyPage } from '../pages/DailyPage.tsx';
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
      return (
        <ComingSoonPage
          icon={BookOpen}
          title="Pokédex"
          blurb="Every Pokémon you identify is collected here. The rest stay in the shadows."
        />
      );
    case 'achievements':
      return (
        <ComingSoonPage
          icon={Award}
          title="Achievements"
          blurb="Fifteen goals to chase, from First Discovery to Master Detective."
        />
      );
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
      <AppShell route={route}>
        <Page route={route} />
      </AppShell>
    </ProgressProvider>
  );
}
