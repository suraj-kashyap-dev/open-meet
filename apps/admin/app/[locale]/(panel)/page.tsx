'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarRange, MessageSquare, MessagesSquare, Radio, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { RecentMeetingsTable } from '@/features/dashboard/components/recent-meetings-table';
import { OverviewMixCard } from '@/features/dashboard/components/overview-mix-card';
import { StatCard } from '@/features/dashboard/components/stat-card';
import { TrendCard } from '@/features/dashboard/components/trend-card';
import { UpcomingMeetingsTable } from '@/features/dashboard/components/upcoming-meetings-table';
import { adminAnalyticsApi } from '@/features/analytics/services/analytics';

export default function AdminOverviewPage() {
  const t = useTranslations('dashboard');
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: ({ signal }) => adminAnalyticsApi.overview(signal),
    refetchInterval: 30_000,
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
        {t('load-error')}
      </main>
    );
  }

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          hint={t('stats.users-hint')}
          icon={Users}
          label={t('stats.users')}
          value={data.totals.users.toLocaleString()}
        />
        <StatCard
          hint={t('stats.meetings-hint')}
          icon={CalendarRange}
          label={t('stats.meetings')}
          value={data.totals.meetings.toLocaleString()}
        />
        <StatCard
          hint={t('stats.active-now-hint')}
          icon={Radio}
          label={t('stats.active-now')}
          value={data.totals.activeMeetings.toLocaleString()}
        />
        <StatCard
          hint={t('stats.messages-24h-hint')}
          icon={MessageSquare}
          label={t('stats.messages-24h')}
          value={data.totals.messagesLast24h.toLocaleString()}
        />
        <StatCard
          hint={t('stats.groups-hint')}
          icon={MessagesSquare}
          label={t('stats.groups')}
          value={data.totals.groups.toLocaleString()}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <OverviewMixCard
          activeLabel={t('stats.active-now')}
          activeValue={data.totals.activeMeetings}
          segments={[
            { label: t('stats.users'), value: data.totals.users },
            { label: t('stats.meetings'), value: data.totals.meetings },
            { label: t('stats.messages-24h'), value: data.totals.messagesLast24h },
            { label: t('stats.groups'), value: data.totals.groups },
            { label: t('stats.active-now'), value: data.totals.activeMeetings },
          ]}
          title={t('eyebrow')}
        />
        <TrendCard series={data.trends.meetings} title={t('trends.meetings')} tone="success" />
      </section>

      <UpcomingMeetingsTable meetings={data.upcomingMeetings} />

      <RecentMeetingsTable meetings={data.recentMeetings} />
    </main>
  );
}
