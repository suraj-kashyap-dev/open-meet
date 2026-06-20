'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { DeepAnalytics, DeepAnalyticsKpis } from '@/features/dashboard/components/deep-analytics';
import { TrendCard } from '@/features/dashboard/components/trend-card';
import { adminAnalyticsApi } from '@/features/analytics/services/analytics';
import { useCan } from '@/features/auth/hooks/use-admin-auth';

export default function AdminAnalyticsPage() {
  const t = useTranslations('analytics');
  const tDash = useTranslations('dashboard');
  const canViewDeep = useCan('analytics.view-deep');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: ({ signal }) => adminAnalyticsApi.overview(signal),
    refetchInterval: 30_000,
  });
  const deepAnalyticsQuery = useQuery({
    queryKey: ['admin', 'analytics', 'deep'],
    queryFn: ({ signal }) => adminAnalyticsApi.deep(signal),
    refetchInterval: 60_000,
    enabled: canViewDeep,
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
    <main className="w-full px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pb-10">
      <header className="sticky top-14 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </header>

      <div className="space-y-8 pt-4">
        {canViewDeep ? (
          deepAnalyticsQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
            </div>
          ) : deepAnalyticsQuery.error || !deepAnalyticsQuery.data ? (
            <p className="text-sm text-destructive">{t('load-error')}</p>
          ) : (
            <DeepAnalyticsKpis data={deepAnalyticsQuery.data} />
          )
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <TrendCard series={data.trends.signups} title={tDash('trends.signups')} tone="accent" />

          <TrendCard
            series={data.trends.meetings}
            title={tDash('trends.meetings')}
            tone="success"
          />
        </section>

        {canViewDeep && deepAnalyticsQuery.data ? (
          <DeepAnalytics data={deepAnalyticsQuery.data} showKpis={false} />
        ) : null}
      </div>
    </main>
  );
}
