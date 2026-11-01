import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** One headline number with a label. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'text-ink',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: string;
}) {
  return (
    <div className="dex-card flex flex-col gap-1 p-4">
      <dt className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
        {Icon && <Icon size={14} aria-hidden />}
        {label}
      </dt>
      <dd className={`font-display text-4xl tabular-nums ${tone}`}>{value}</dd>
      {hint && <dd className="text-xs text-ink-soft">{hint}</dd>}
    </div>
  );
}
