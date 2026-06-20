import type { LucideIcon } from 'lucide-react';

import { cn } from '@open-meet/ui/cn';

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, hint, className }: Props) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>

      {hint ? <p className="mt-2 text-sm leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
