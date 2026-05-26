'use client';

import { useTranslations } from 'next-intl';

import type { DailyCountPoint } from '@open-meet/types';

interface Props {
  title: string;
  series: DailyCountPoint[];
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TrendCard({ title, series }: Props) {
  const t = useTranslations('dashboard.trends');
  const max = Math.max(1, ...series.map((p) => p.count));
  const total = series.reduce((sum, p) => sum + p.count, 0);
  const last = series[series.length - 1];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <span className="text-xs text-muted-foreground">{t('range', { total })}</span>
      </div>

      <div className="mt-6 flex h-32 items-end gap-1.5">
        {series.map((point) => {
          const heightPct = (point.count / max) * 100;
          return (
            <div
              key={point.date}
              className="group relative flex-1 rounded-sm bg-accent/15 transition-colors hover:bg-accent/40"
              style={{ height: `${Math.max(4, heightPct)}%` }}
              title={`${formatDay(point.date)} — ${point.count}`}
            />
          );
        })}
      </div>

      {last ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {t('today')} <span className="font-medium text-foreground">{last.count}</span>
        </p>
      ) : null}
    </div>
  );
}
