'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { DeepAnalytics } from '@/features/dashboard/components/deep-analytics';
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
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <TrendCard title={tDash('trends.signups')} series={data.trends.signups} />
        <TrendCard title={tDash('trends.meetings')} series={data.trends.meetings} />
      </section>

      {canViewDeep ? <DeepAnalytics /> : null}
    </main>
  );
}
