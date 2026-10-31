import { Award, BookOpen, Shuffle, User } from 'lucide-react';
import { ComingSoonPage } from '../pages/ComingSoonPage.tsx';
import { DailyPage } from '../pages/DailyPage.tsx';
import { SilhouetteLabPage } from '../pages/SilhouetteLabPage.tsx';
import { AppShell } from './AppShell.tsx';
import { ProgressProvider } from './ProgressProvider.tsx';
import { useRoute, type RouteId } from './router.ts';

function Page({ route }: { route: RouteId }) {
  switch (route) {
    case 'daily':
      return <DailyPage />;
    case 'practice':
      return (
        <ComingSoonPage
          icon={Shuffle}
          title="Practice"
          blurb="Unlimited random silhouettes. They never affect your daily streak."
        />
      );
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
        <ComingSoonPage
          icon={User}
          title="Profile"
          blurb="Your streaks, calendar and statistics."
        />
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
