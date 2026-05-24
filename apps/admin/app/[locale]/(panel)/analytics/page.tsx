'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock, TrendingUp, Trophy, Users } from 'lucide-react';

import type { AdminConcurrencyPointDto, AdminTopHostDto } from '@open-meet/types';

import { UserAvatar } from '@open-meet/ui/user-avatar';
import { adminAnalyticsApi } from '@/features/analytics/services/analytics';
import { TrendCard } from '@/features/dashboard/components/trend-card';
import { cn } from '@open-meet/ui/cn';

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

export default function AdminAnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'analytics', 'deep'],
    queryFn: ({ signal }) => adminAnalyticsApi.deep(signal),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <main className="w-full px-4 py-10 text-sm text-destructive sm:px-6 lg:px-8">
        Failed to load analytics.
      </main>
    );
  }

  return (
    <main className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Insights
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Trailing 30-day trends + lifetime aggregates. Refreshes every minute.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Clock}
          label="Avg meeting length"
          value={formatDuration(data.averageMeetingMinutes)}
          hint={`${data.totalCompletedMeetings.toLocaleString()} completed`}
        />
        <KpiCard
          icon={Trophy}
          label="Top host"
          value={data.topHosts[0]?.name ?? '—'}
          hint={
            data.topHosts[0]
              ? `${data.topHosts[0].hostedCount} meetings hosted`
              : 'No completed meetings yet'
          }
        />
        <KpiCard
          icon={TrendingUp}
          label="Peak hour"
          value={pickPeakHour(data.peakConcurrencyByHour)}
          hint="Highest concurrent meetings (UTC)"
        />
        <KpiCard
          icon={Users}
          label="DAU today"
          value={(data.dailyActiveUsers[data.dailyActiveUsers.length - 1]?.count ?? 0).toString()}
          hint="Distinct users in a meeting today"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TrendCard title="Daily active users" series={data.dailyActiveUsers} />
        <HourlyConcurrencyCard series={data.peakConcurrencyByHour} />
      </section>

      <TopHostsTable hosts={data.topHosts} />
    </main>
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
  const max = Math.max(1, ...series.map((p) => p.count));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">Peak concurrency by hour</h3>
        <span className="text-xs text-muted-foreground">last 30 days (UTC)</span>
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
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">Top hosts</h3>
        <span className="text-xs text-muted-foreground">by completed meetings</span>
      </div>

      {hosts.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
          No completed meetings yet.
        </p>
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
                <p className="font-medium tabular-nums">{h.hostedCount} meetings</p>
                <p className="text-muted-foreground">
                  {formatDuration(h.totalDurationMinutes)} total
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
