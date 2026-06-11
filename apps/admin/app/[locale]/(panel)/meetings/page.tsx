'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { AdminMeetingDto } from '@open-meet/types';

import { DataGrid } from '@/components/datagrid/data-grid';
import { DeleteMeetingDialog } from '@/features/meetings/components/delete-meeting-dialog';
import { EndAllActiveDialog } from '@/features/meetings/components/end-all-dialog';
import { EndMeetingDialog } from '@/features/meetings/components/end-meeting-dialog';
import { MeetingDetailDialog } from '@/features/meetings/components/meeting-detail-dialog';

export default function AdminMeetingsPage() {
  const t = useTranslations('meetings');

  const [endTarget, setEndTarget] = useState<AdminMeetingDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMeetingDto | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [bulkCount, setBulkCount] = useState<number | null>(null);

  return (
    <main className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section className="space-y-4">
        <DataGrid
          resource="meetings"
          emptyMessage={t('empty')}
          renderCell={(column, row) => {
            if (column.key !== 'status') {
              return undefined;
            }

            const status = String(row.status ?? '').toLowerCase();
            const tone =
              status === 'active'
                ? 'bg-emerald-500/10 text-emerald-500'
                : status === 'waiting'
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-muted text-muted-foreground';

            return (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
                {t(`status.${status}`)}
              </span>
            );
          }}
          onAction={(key, row) => {
            if (key === 'view' && row) {
              setDetailId((row as unknown as AdminMeetingDto).id);
            } else if (key === 'end' && row) {
              setEndTarget(row as unknown as AdminMeetingDto);
            } else if (key === 'delete' && row) {
              setDeleteTarget(row as unknown as AdminMeetingDto);
            }
          }}
          onBulkAction={(key, ids) => {
            if (key === 'end-all') {
              setBulkCount(ids.length);
            }
          }}
        />
      </section>

      <EndMeetingDialog meeting={endTarget} onClose={() => setEndTarget(null)} />
      <DeleteMeetingDialog meeting={deleteTarget} onClose={() => setDeleteTarget(null)} />
      <MeetingDetailDialog meetingId={detailId} onClose={() => setDetailId(null)} />
      <EndAllActiveDialog
        open={bulkCount !== null}
        activeCount={bulkCount ?? 0}
        onClose={() => setBulkCount(null)}
      />
    </main>
  );
}
