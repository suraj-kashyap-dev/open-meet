'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { AdminUpcomingMeetingDto } from '@open-meet/types';

import { DataTable } from '@open-meet/ui/data-table';
import { cn } from '@open-meet/ui/cn';

function formatScheduled(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(min: number | null): string {
  if (min === null) {
    return '—';
  }

  if (min < 60) {
    return `${min}m`;
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

type RecurrenceKey = 'repeats' | 'daily' | 'weekly' | 'monthly' | 'yearly';

function recurrenceKey(rrule: string | null): RecurrenceKey | null {
  if (!rrule) {
    return null;
  }

  const freq = rrule.match(/FREQ=([A-Z]+)/);

  if (!freq) {
    return 'repeats';
  }

  switch (freq[1]) {
    case 'DAILY':
      return 'daily';
    case 'WEEKLY':
      return 'weekly';
    case 'MONTHLY':
      return 'monthly';
    case 'YEARLY':
      return 'yearly';
    default:
      return 'repeats';
  }
}

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
}

const column = createColumnHelper<AdminUpcomingMeetingDto>();

export function UpcomingMeetingsTable({ meetings }: { meetings: AdminUpcomingMeetingDto[] }) {
  const t = useTranslations('dashboard');
  const columns = useMemo(
    () => [
      column.accessor('code', {
        header: t('upcoming.columns.code'),
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      column.display({
        id: 'title',
        header: t('upcoming.columns.title'),
        cell: ({ row }) => {
          const repeats = recurrenceKey(row.original.recurrence);

          return (
            <div className="flex items-center gap-2">
              <span className="truncate text-sm">
                {row.original.title ??
                  t('upcoming.untitled', { date: formatScheduled(row.original.scheduledFor) })}
              </span>

              {repeats ? (
                <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t(`upcoming.recurrence.${repeats}`)}
                </span>
              ) : null}
            </div>
          );
        },
      }),
      column.display({
        id: 'host',
        header: t('upcoming.columns.host'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm">{row.original.hostName}</span>
            <span className="text-xs text-muted-foreground">{row.original.hostEmail}</span>
          </div>
        ),
      }),
      column.accessor('inviteeCount', {
        header: () => <span className="block text-end">{t('upcoming.columns.invitees')}</span>,
        cell: (info) => <span className="block text-end tabular-nums">{info.getValue()}</span>,
      }),
      column.accessor('durationMin', {
        header: () => <span className="block text-end">{t('upcoming.columns.duration')}</span>,
        cell: (info) => (
          <span className="block text-end tabular-nums">{formatDuration(info.getValue())}</span>
        ),
      }),
      column.accessor('scheduledFor', {
        header: () => <span className="block text-end">{t('upcoming.columns.when')}</span>,
        cell: (info) => {
          const startsIn = minutesUntil(info.getValue());
          const isStartingSoon = startsIn >= 0 && startsIn <= 15;

          return (
            <span
              className={cn(
                'block text-end text-muted-foreground',
                isStartingSoon && 'font-medium text-accent',
              )}
            >
              {formatScheduled(info.getValue())}
            </span>
          );
        },
      }),
    ],
    [t],
  );

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">{t('upcoming.title')}</h3>
        <span className="text-xs text-muted-foreground">{meetings.length}</span>
      </header>
      <DataTable data={meetings} columns={columns} emptyMessage={t('upcoming.empty')} />
    </section>
  );
}
