'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarRange, MessageSquare, Radio, Users } from 'lucide-react';

import { RecentMeetingsTable } from '@/components/admin/recent-meetings-table';
import { StatCard } from '@/components/admin/stat-card';
import { TrendCard } from '@/components/admin/trend-card';
import { adminApi } from '@/lib/api/admin';

export default function AdminOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: ({ signal }) => adminApi.overview(signal),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (error || ! data) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-sm text-destructive">
        Failed to load overview.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Overview
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Console</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Users"
          value={data.totals.users.toLocaleString()}
          icon={Users}
          hint="Total registered accounts"
        />
        <StatCard
          label="Meetings"
          value={data.totals.meetings.toLocaleString()}
          icon={CalendarRange}
          hint="All-time meeting rooms created"
        />
        <StatCard
          label="Active now"
          value={data.totals.activeMeetings.toLocaleString()}
          icon={Radio}
          hint="Rooms with status = ACTIVE"
        />
        <StatCard
          label="Messages 24h"
          value={data.totals.messagesLast24h.toLocaleString()}
          icon={MessageSquare}
          hint="Chat messages in last 24h"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TrendCard title="New signups" series={data.trends.signups} />
        <TrendCard title="New meetings" series={data.trends.meetings} />
      </section>

      <RecentMeetingsTable meetings={data.recentMeetings} />
    </main>
  );
}
