'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import type { AdminGroupDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';

import { DataGrid } from '@/components/datagrid/data-grid';
import { CreateGroupDialog } from '@/features/groups/components/create-group-dialog';
import { EditGroupDialog } from '@/features/groups/components/edit-group-dialog';
import { useDeleteGroup } from '@/features/groups/hooks/use-admin-groups';
import { ApiClientError } from '@/lib/api/client';

export default function AdminGroupsPage() {
  const t = useTranslations('groups');
  const del = useDeleteGroup();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminGroupDto | null>(null);
  const [deleting, setDeleting] = useState<AdminGroupDto | null>(null);

  const onConfirmDelete = async () => {
    if (!deleting) {
      return;
    }

    try {
      await del.mutateAsync(deleting.id);
      toast.success(t('detail.delete-success'));
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('detail.delete-error'));
    }
  };

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section className="space-y-4">
        <DataGrid
          resource="groups"
          emptyMessage={t('empty')}
          onAction={(key, row) => {
            if (key === 'create') {
              setCreateOpen(true);
            } else if (key === 'edit' && row) {
              setEditing(row as unknown as AdminGroupDto);
            } else if (key === 'delete' && row) {
              setDeleting(row as unknown as AdminGroupDto);
            }
          }}
        />
      </section>

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditGroupDialog group={editing} onClose={() => setEditing(null)} />

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(o) => (!o && !del.isPending ? setDeleting(null) : undefined)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('delete-dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('delete-dialog.description', { name: deleting?.title ?? '' })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={del.isPending}>
              {t('delete-dialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void onConfirmDelete()}
              disabled={del.isPending}
            >
              {del.isPending ? t('delete-dialog.deleting') : t('delete-dialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
