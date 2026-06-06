'use client';

import {
  CalendarRange,
  Crown,
  Hourglass,
  MessageSquare,
  Paperclip,
  Users,
  Video,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, type ReactNode } from 'react';

import { Link, useRouter } from '@/i18n/navigation';

import type { MeetingHistoryItemDto } from '@open-meet/types';

import { DataGridView } from '@open-meet/ui/datagrid/data-grid';
import { UserAvatar } from '@open-meet/ui/user-avatar';
import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';

import { useDatagrid } from '@/features/web/datagrid/hooks/use-datagrid';

function formatStartedAt(iso: string | null): string {
  if (!iso) {
    return '-';
  }

  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(min: number | null): string {
  if (min === null) {
    return '-';
  }

  if (min < 60) {
    return `${min}m`;
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTotalDuration(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function HistoryList() {
  const t = useTranslations('history');
  const router = useRouter();
  const { data, isLoading, page, setPage, search, setSearch, filters, setFilter, toggleSort } =
    useDatagrid('/meetings/history/datagrid');

  const items = (data?.rows ?? []) as unknown as MeetingHistoryItemDto[];
  const total = data?.pagination.total ?? 0;

  const totals = useMemo(() => {
    const acc = {
      hosted: 0,
      participants: 0,
      durationMin: 0,
      messages: 0,
    };

    for (const item of items) {
      if (item.isHost) {
        acc.hosted += 1;
      }
      acc.participants += item.participantCount;
      acc.durationMin += item.durationMinutes ?? 0;
      acc.messages += item.messageCount;
    }

    return acc;
  }, [items]);

  const renderCell = (column: { key: string }, row: Record<string, unknown>): ReactNode => {
    const item = row as unknown as MeetingHistoryItemDto;

    switch (column.key) {
      case 'meeting': {
        const title =
          item.title ?? t('default-title', { date: formatStartedAt(item.startedAt ?? item.createdAt) });

        return (
          <div className="flex min-w-[260px] items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Video className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{title}</p>
                {item.isHost ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning">
                    <Crown className="h-3 w-3" />
                    {t('host')}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                <span className="font-mono">{item.code}</span>
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                {item.isHost ? t('hosted-by-you') : t('hosted-by', { name: item.hostName })}
              </p>
            </div>
          </div>
        );
      }
      case 'startedAt':
        return (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {formatStartedAt(item.startedAt ?? item.createdAt)}
          </span>
        );
      case 'durationMinutes':
        return (
          <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatDuration(item.durationMinutes)}
          </span>
        );
      case 'participants': {
        const displayedAvatars = item.participantsPreview.slice(0, 4);
        const extra = Math.max(0, item.participantCount - displayedAvatars.length);

        return (
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2">
              {displayedAvatars.map((p) => (
                <UserAvatar
                  key={p.id}
                  user={p}
                  size="xs"
                  title={p.name}
                  className="border-2 border-card"
                  fallbackClassName="bg-muted text-muted-foreground"
                />
              ))}
              {extra > 0 ? (
                <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border-2 border-card bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  {t('overflow', { count: extra })}
                </span>
              ) : null}
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {item.participantCount}
            </span>
          </div>
        );
      }
      case 'activity':
        return (
          <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MessageSquare className="h-3.5 w-3.5" />
              {item.messageCount}
            </span>
            {item.attachmentCount > 0 ? (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Paperclip className="h-3.5 w-3.5" />
                {item.attachmentCount}
              </span>
            ) : null}
            {item.recordingCount > 0 ? (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive"
                title={t('recording-title', { count: item.recordingCount })}
              >
                <Video className="h-3 w-3" />
                {t('recording-badge', { count: item.recordingCount })}
              </span>
            ) : null}
          </div>
        );
      case 'status':
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
              item.status === 'ENDED'
                ? 'border-border bg-muted text-muted-foreground'
                : item.status === 'ACTIVE'
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-warning/30 bg-warning/10 text-warning',
            )}
          >
            {t(`status.${item.status.toLowerCase()}`)}
          </span>
        );
      default:
        return undefined;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t('header.eyebrow')}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('header.title')}</h1>
          {total > 0 ? (
            <span className="text-sm text-muted-foreground">
              {t('header.total', { count: total })}
            </span>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('header.description')}</p>
      </header>

      {items.length > 0 ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Video className="h-4 w-4" />}
            label={t('stats.on-this-page')}
            value={items.length.toString()}
          />
          <StatCard
            icon={<Crown className="h-4 w-4" />}
            label={t('stats.hosted-by-you')}
            value={totals.hosted.toString()}
          />
          <StatCard
            icon={<Hourglass className="h-4 w-4" />}
            label={t('stats.total-time')}
            value={totals.durationMin > 0 ? formatTotalDuration(totals.durationMin) : '-'}
          />
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label={t('stats.participants')}
            value={totals.participants.toString()}
          />
        </section>
      ) : null}

      {items.length === 0 && !isLoading ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <EmptyState />
        </section>
      ) : (
        <DataGridView
          data={data}
          isLoading={isLoading}
          search={search}
          filters={filters}
          page={page}
          onSearchChange={setSearch}
          onFilterChange={setFilter}
          onPageChange={setPage}
          onToggleSort={toggleSort}
          renderCell={renderCell}
          onAction={(key, row) => {
            if (key === 'open' && row) {
              router.push(`/history/${(row as unknown as MeetingHistoryItemDto).code}`);
            }
          }}
          emptyMessage={t('table.empty')}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function EmptyState() {
  const t = useTranslations('history');

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CalendarRange className="h-6 w-6" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">{t('empty.title')}</p>
        <p className="text-sm text-muted-foreground">{t('empty.description')}</p>
      </div>
      <Button asChild className="mt-2">
        <Link href="/meet">{t('empty.cta')}</Link>
      </Button>
    </div>
  );
}
