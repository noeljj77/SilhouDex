import type { LucideIcon } from 'lucide-react';

/** Stand-in for pages that arrive in later milestones. */
export function ComingSoonPage({
  title,
  blurb,
  icon: Icon,
}: {
  title: string;
  blurb: string;
  icon: LucideIcon;
}) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-20 place-items-center dex-card text-dex">
        <Icon size={36} aria-hidden />
      </span>
      <h1 className="font-display text-3xl text-ink">{title}</h1>
      <p className="text-ink-soft">{blurb}</p>
      <p className="dex-chip bg-volt">Coming soon</p>
    </main>
  );
}
