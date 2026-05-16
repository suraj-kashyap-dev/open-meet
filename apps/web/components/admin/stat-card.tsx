import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/shared/cn';

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
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
