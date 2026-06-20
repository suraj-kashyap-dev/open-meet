'use client';

import type { ChartData, ChartOptions } from 'chart.js';
import { Clock, TrendingUp, Trophy, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type {
  AdminConcurrencyPointDto,
  AdminDeepAnalyticsDto,
  AdminTopHostDto,
} from '@open-meet/types';

import { cn } from '@open-meet/ui/cn';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { ChartCanvas } from '@/features/dashboard/components/chart-canvas';
import { TrendCard } from '@/features/dashboard/components/trend-card';
import { useChartPalette, withAlpha } from '@/features/dashboard/components/chart-theme';
import {
  formatHourLabel,
  pickPeakHour,
  sortTopHosts,
} from '@/features/dashboard/lib/chart-insights';

function formatDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) {
    return '-';
  }

  if (min < 60) {
    return `${min}m`;
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function DeepAnalytics({
  data,
  showKpis = true,
}: {
  data: AdminDeepAnalyticsDto;
  showKpis?: boolean;
}) {
  return (
    <div className="space-y-6">
      {showKpis ? <DeepAnalyticsKpis data={data} /> : null}
      <DeepAnalyticsDetails data={data} />
    </div>
  );
}

export function DeepAnalyticsKpis({ data }: { data: AdminDeepAnalyticsDto }) {
  const t = useTranslations('analytics');
  const topHost = data.topHosts.at(0);
  const dauToday = data.dailyActiveUsers.at(-1)?.count ?? 0;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        hint={t('kpi.avg-length-hint', { count: data.totalCompletedMeetings })}
        icon={Clock}
        label={t('kpi.avg-length')}
        value={formatDuration(data.averageMeetingMinutes)}
      />
      <KpiCard
        hint={
          topHost ? t('kpi.top-host-hint', { count: topHost.hostedCount }) : t('kpi.top-host-empty')
        }
        icon={Trophy}
        label={t('kpi.top-host')}
        value={topHost?.name ?? '-'}
      />
      <KpiCard
        hint={t('kpi.peak-hour-hint')}
        icon={TrendingUp}
        label={t('kpi.peak-hour')}
        value={pickPeakHour(data.peakConcurrencyByHour)}
      />
      <KpiCard
        hint={t('kpi.dau-today-hint')}
        icon={Users}
        label={t('kpi.dau-today')}
        value={dauToday.toString()}
      />
    </section>
  );
}

export function DeepAnalyticsDetails({ data }: { data: AdminDeepAnalyticsDto }) {
  const t = useTranslations('analytics');

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <TrendCard
          series={data.dailyActiveUsers}
          summary={t('kpi.dau-today-hint')}
          title={t('dau-trend-title')}
          tone="accent"
        />
        <HourlyConcurrencyCard series={data.peakConcurrencyByHour} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <TopHostsPerformanceCard hosts={data.topHosts} />
        <TopHostsTable hosts={data.topHosts} />
      </section>
    </>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  hint: string;
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-4 truncate text-2xl font-semibold tracking-tight" title={value}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

function HourlyConcurrencyCard({ series }: { series: AdminConcurrencyPointDto[] }) {
  const t = useTranslations('analytics.concurrency');
  const palette = useChartPalette();
  const hourLabels = series.map((point) => formatHourLabel(point.hour));

  const data: ChartData<'bar'> = {
    labels: hourLabels,
    datasets: [
      {
        backgroundColor: series.map((point) =>
          point.count > 0 ? withAlpha(palette.accent, 0.8) : withAlpha(palette.border, 0.75),
        ),
        borderRadius: 999,
        data: series.map((point) => point.count),
        hoverBackgroundColor: series.map((point) =>
          point.count > 0 ? palette.accent : withAlpha(palette.border, 0.95),
        ),
        maxBarThickness: 18,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    animation: false,
    layout: {
      padding: {
        top: 12,
        right: 6,
      },
    },
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: palette.card,
        bodyColor: palette.foreground,
        borderColor: withAlpha(palette.border, 0.85),
        borderWidth: 1,
        displayColors: false,
        padding: 12,
        titleColor: palette.foreground,
      },
    },
    responsive: true,
    scales: {
      x: {
        border: {
          display: false,
        },
        grid: {
          display: false,
        },
        ticks: {
          color: palette.muted,
          maxRotation: 0,
          callback: (_value, index) => (index % 4 === 0 ? (hourLabels[index] ?? '') : ''),
        },
      },
      y: {
        beginAtZero: true,
        grace: 1,
        border: {
          display: false,
        },
        grid: {
          color: withAlpha(palette.border, 0.45),
          drawTicks: false,
        },
        ticks: {
          color: palette.muted,
          precision: 0,
        },
      },
    },
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">{t('range')}</p>
        </div>
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {pickPeakHour(series)}
        </span>
      </div>

      <div className="mt-5 h-64">
        <ChartCanvas ariaLabel={t('title')} data={data} options={options} type="bar" />
      </div>
    </section>
  );
}

function TopHostsPerformanceCard({ hosts }: { hosts: AdminTopHostDto[] }) {
  const t = useTranslations('analytics.top-hosts');
  const palette = useChartPalette();
  const orderedHosts = sortTopHosts(hosts).slice(0, 5);

  if (orderedHosts.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">{t('empty')}</p>
      </section>
    );
  }

  const data: ChartData<'bar'> = {
    labels: orderedHosts.map((host) => host.name),
    datasets: [
      {
        backgroundColor: orderedHosts.map((_host, index) =>
          index === 0 ? palette.warning : withAlpha(palette.accent, 0.82),
        ),
        borderRadius: 999,
        data: orderedHosts.map((host) => host.hostedCount),
        hoverBackgroundColor: orderedHosts.map((_host, index) =>
          index === 0 ? palette.warning : palette.accent,
        ),
        maxBarThickness: 18,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    animation: false,
    indexAxis: 'y',
    layout: {
      padding: {
        top: 8,
        right: 8,
      },
    },
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: palette.card,
        bodyColor: palette.foreground,
        borderColor: withAlpha(palette.border, 0.85),
        borderWidth: 1,
        padding: 12,
        titleColor: palette.foreground,
        callbacks: {
          label: (context) => {
            const host = orderedHosts[context.dataIndex];

            if (!host) {
              return '';
            }

            return `${host.hostedCount} hosted • ${formatDuration(host.totalDurationMinutes)}`;
          },
        },
      },
    },
    responsive: true,
    scales: {
      x: {
        beginAtZero: true,
        grace: 1,
        border: {
          display: false,
        },
        grid: {
          color: withAlpha(palette.border, 0.45),
          drawTicks: false,
        },
        ticks: {
          color: palette.muted,
          precision: 0,
        },
      },
      y: {
        border: {
          display: false,
        },
        grid: {
          display: false,
        },
        ticks: {
          color: palette.muted,
        },
      },
    },
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {orderedHosts[0]?.name ?? '-'}
        </span>
      </div>

      <div className="mt-5 h-64">
        <ChartCanvas ariaLabel={t('title')} data={data} options={options} type="bar" />
      </div>
    </section>
  );
}

function TopHostsTable({ hosts }: { hosts: AdminTopHostDto[] }) {
  const t = useTranslations('analytics.top-hosts');
  const orderedHosts = sortTopHosts(hosts);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {orderedHosts.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <ol className="space-y-2">
          {orderedHosts.map((host, index) => (
            <li
              key={host.id}
              className={
                'flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-3'
              }
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  index === 0 ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground',
                )}
              >
                {index + 1}
              </span>
              <UserAvatar user={{ name: host.name }} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{host.name}</p>
                <p className="truncate text-xs text-muted-foreground">{host.email}</p>
              </div>
              <div className="text-end text-xs">
                <p className="font-medium tabular-nums">
                  {t('hosted', { count: host.hostedCount })}
                </p>
                <p className="text-muted-foreground">
                  {t('total-duration', { duration: formatDuration(host.totalDurationMinutes) })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
