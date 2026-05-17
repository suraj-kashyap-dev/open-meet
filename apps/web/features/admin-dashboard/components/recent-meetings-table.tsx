'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

import type { RecentMeetingDto } from '@open-meet/types';

import { DataTable } from '@/components/shared/data-table/data-table';
import { cn } from '@/lib/cn';

function statusClasses(status: RecentMeetingDto['status']): string {
  if (status === 'ACTIVE') {
    return 'bg-success/10 text-success border-success/30';
  }

  if (status === 'WAITING') {
    return 'bg-warning/10 text-warning border-warning/30';
  }

  return 'bg-muted text-muted-foreground border-border';
}

function formatRelative(iso: string | null): string {
  if (! iso) {
    return '—';
  }

  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const column = createColumnHelper<RecentMeetingDto>();

export function RecentMeetingsTable({ meetings }: { meetings: RecentMeetingDto[] }) {
  const columns = useMemo(
    () => [
      column.accessor('code', {
        header: 'Code',
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      column.display({
        id: 'host',
        header: 'Host',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm">{row.original.hostName}</span>
            <span className="text-xs text-muted-foreground">{row.original.hostEmail}</span>
          </div>
        ),
      }),
      column.accessor('status', {
        header: 'Status',
        cell: (info) => (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
              statusClasses(info.getValue()),
            )}
          >
            {info.getValue()}
          </span>
        ),
      }),
      column.accessor('participantCount', {
        header: () => <span className="block text-right">Participants</span>,
        cell: (info) => (
          <span className="block text-right tabular-nums">{info.getValue()}</span>
        ),
      }),
      column.accessor('durationMinutes', {
        header: () => <span className="block text-right">Duration</span>,
        cell: (info) => (
          <span className="block text-right tabular-nums">
            {info.getValue() !== null ? `${info.getValue()}m` : '—'}
          </span>
        ),
      }),
      column.accessor('startedAt', {
        header: () => <span className="block text-right">Started</span>,
        cell: (info) => (
          <span className="block text-right text-muted-foreground">
            {formatRelative(info.getValue())}
          </span>
        ),
      }),
    ],
    [],
  );

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">Recent meetings</h3>
        <span className="text-xs text-muted-foreground">{meetings.length}</span>
      </header>
      <DataTable data={meetings} columns={columns} emptyMessage="No meetings yet." />
    </section>
  );
}
