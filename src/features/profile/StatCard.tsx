import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** One headline number with a label. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'text-white',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4">
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-200/70">
        {Icon && <Icon size={14} aria-hidden />}
        {label}
      </dt>
      <dd className={`text-3xl font-black tabular-nums ${tone}`}>{value}</dd>
      {hint && <dd className="text-xs text-violet-200/60">{hint}</dd>}
    </div>
  );
}
