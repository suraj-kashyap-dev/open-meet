'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock, TrendingUp, Trophy, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AdminConcurrencyPointDto, AdminTopHostDto } from '@open-meet/types';

import { cn } from '@open-meet/ui/cn';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { adminAnalyticsApi } from '@/features/analytics/services/analytics';
import { TrendCard } from '@/features/dashboard/components/trend-card';

function formatDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) {
    return '—';
  }

  if (min < 60) {
    return `${min}m`;
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function DeepAnalytics() {
  const t = useTranslations('analytics');
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'analytics', 'deep'],
    queryFn: ({ signal }) => adminAnalyticsApi.deep(signal),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">{t('load-error')}</p>;
  }

  const topHost = data.topHosts[0];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Clock}
          label={t('kpi.avg-length')}
          value={formatDuration(data.averageMeetingMinutes)}
          hint={t('kpi.avg-length-hint', { count: data.totalCompletedMeetings })}
        />
        <KpiCard
          icon={Trophy}
          label={t('kpi.top-host')}
          value={topHost?.name ?? '—'}
          hint={
            topHost
              ? t('kpi.top-host-hint', { count: topHost.hostedCount })
              : t('kpi.top-host-empty')
          }
        />
        <KpiCard
          icon={TrendingUp}
          label={t('kpi.peak-hour')}
          value={pickPeakHour(data.peakConcurrencyByHour)}
          hint={t('kpi.peak-hour-hint')}
        />
        <KpiCard
          icon={Users}
          label={t('kpi.dau-today')}
          value={(data.dailyActiveUsers[data.dailyActiveUsers.length - 1]?.count ?? 0).toString()}
          hint={t('kpi.dau-today-hint')}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TrendCard title={t('dau-trend-title')} series={data.dailyActiveUsers} />
        <HourlyConcurrencyCard series={data.peakConcurrencyByHour} />
      </section>

      <TopHostsTable hosts={data.topHosts} />
    </div>
  );
}

function pickPeakHour(series: AdminConcurrencyPointDto[]): string {
  let peak = -1;
  let hour = -1;

  for (const p of series) {
    if (p.count > peak) {
      peak = p.count;
      hour = p.hour;
    }
  }

  if (peak <= 0 || hour < 0) {
    return '—';
  }

  return `${hour.toString().padStart(2, '0')}:00`;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 truncate text-xl font-semibold tracking-tight" title={value}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function HourlyConcurrencyCard({ series }: { series: AdminConcurrencyPointDto[] }) {
  const t = useTranslations('analytics.concurrency');
  const max = Math.max(1, ...series.map((p) => p.count));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{t('title')}</h3>
        <span className="text-xs text-muted-foreground">{t('range')}</span>
      </div>

      <div className="mt-6 flex h-32 items-end gap-[2px]">
        {series.map((p) => {
          const heightPct = (p.count / max) * 100;

          return (
            <div
              key={p.hour}
              className="group relative flex-1 rounded-sm bg-accent/15 transition-colors hover:bg-accent/40"
              style={{ height: `${Math.max(4, heightPct)}%` }}
              title={`${p.hour.toString().padStart(2, '0')}:00 — peak ${p.count}`}
            />
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  );
}

function TopHostsTable({ hosts }: { hosts: AdminTopHostDto[] }) {
  const t = useTranslations('analytics.top-hosts');

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{t('title')}</h3>
        <span className="text-xs text-muted-foreground">{t('subtitle')}</span>
      </div>

      {hosts.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ol className="divide-y divide-border">
          {hosts.map((h, i) => (
            <li key={h.id} className="flex items-center gap-3 py-2.5">
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  i === 0 ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground',
                )}
              >
                {i + 1}
              </span>
              <UserAvatar user={{ name: h.name }} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{h.name}</p>
                <p className="truncate text-xs text-muted-foreground">{h.email}</p>
              </div>
              <div className="text-end text-xs">
                <p className="font-medium tabular-nums">{t('hosted', { count: h.hostedCount })}</p>
                <p className="text-muted-foreground">
                  {t('total-duration', { duration: formatDuration(h.totalDurationMinutes) })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
