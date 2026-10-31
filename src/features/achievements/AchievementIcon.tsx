import {
  BookOpen,
  CalendarCheck,
  Crown,
  Eye,
  Flame,
  Layers,
  Library,
  Medal,
  Repeat,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** Icon names used by the achievement list, mapped to the real icons. Unknown names show a trophy. */
const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  CalendarCheck,
  Crown,
  Eye,
  Flame,
  Layers,
  Library,
  Medal,
  Repeat,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
};

export function AchievementIcon({ name, size = 24 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Trophy;
  return <Icon size={size} aria-hidden />;
}
