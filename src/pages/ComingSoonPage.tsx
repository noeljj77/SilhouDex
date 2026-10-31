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
      <span className="grid size-20 place-items-center rounded-3xl border border-white/15 bg-white/5 text-violet-glow">
        <Icon size={36} aria-hidden />
      </span>
      <h1 className="text-3xl font-black text-white">{title}</h1>
      <p className="text-violet-200/80">{blurb}</p>
      <p className="rounded-full border border-volt/40 px-4 py-1 text-sm text-volt">Coming soon</p>
    </main>
  );
}
