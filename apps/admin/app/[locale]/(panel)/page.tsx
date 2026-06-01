'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarRange, MessageSquare, MessagesSquare, Radio, Users, UsersRound } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DeepAnalytics } from '@/features/dashboard/components/deep-analytics';
import { RecentMeetingsTable } from '@/features/dashboard/components/recent-meetings-table';
import { StatCard } from '@/features/dashboard/components/stat-card';
import { TrendCard } from '@/features/dashboard/components/trend-card';
import { UpcomingMeetingsTable } from '@/features/dashboard/components/upcoming-meetings-table';
import { adminAnalyticsApi } from '@/features/analytics/services/analytics';
import { useCan } from '@/features/auth/hooks/use-admin-auth';

export default function AdminOverviewPage() {
  const t = useTranslations('dashboard');
  const canViewDeep = useCan('analytics.view-deep');
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
    <main className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t('stats.users')}
          value={data.totals.users.toLocaleString()}
          icon={Users}
          hint={t('stats.users-hint')}
        />
        <StatCard
          label={t('stats.meetings')}
          value={data.totals.meetings.toLocaleString()}
          icon={CalendarRange}
          hint={t('stats.meetings-hint')}
        />
        <StatCard
          label={t('stats.active-now')}
          value={data.totals.activeMeetings.toLocaleString()}
          icon={Radio}
          hint={t('stats.active-now-hint')}
        />
        <StatCard
          label={t('stats.messages-24h')}
          value={data.totals.messagesLast24h.toLocaleString()}
          icon={MessageSquare}
          hint={t('stats.messages-24h-hint')}
        />
        <StatCard
          label={t('stats.groups')}
          value={data.totals.groups.toLocaleString()}
          icon={MessagesSquare}
          hint={t('stats.groups-hint')}
        />
        <StatCard
          label={t('stats.departments')}
          value={data.totals.departments.toLocaleString()}
          icon={UsersRound}
          hint={t('stats.departments-hint')}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TrendCard title={t('trends.signups')} series={data.trends.signups} />
        <TrendCard title={t('trends.meetings')} series={data.trends.meetings} />
      </section>

      <UpcomingMeetingsTable meetings={data.upcomingMeetings} />

      <RecentMeetingsTable meetings={data.recentMeetings} />

      {canViewDeep ? <DeepAnalytics /> : null}
    </main>
  );
}
