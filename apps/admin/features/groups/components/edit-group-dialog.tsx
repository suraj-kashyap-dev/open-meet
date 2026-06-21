'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { AdminGroupDto, ShareHistoryDto } from '@open-meet/types';
import { ShareHistoryMode } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-meet/ui/select';

import { MemberMultiSelect } from '@/components/shared/member-multi-select';
import {
  useAdminGroup,
  useSyncGroupMembers,
  useUpdateGroup,
} from '@/features/groups/hooks/use-admin-groups';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  group: AdminGroupDto | null;
  onClose: () => void;
}

type HistoryChoice = 'none' | '7' | '30' | 'all';

function toShareHistory(choice: HistoryChoice): ShareHistoryDto {
  if (choice === 'all') {
    return { mode: ShareHistoryMode.ALL };
  }

  if (choice === 'none') {
    return { mode: ShareHistoryMode.NONE };
  }

  return { mode: ShareHistoryMode.DAYS, days: Number(choice) };
}

export function EditGroupDialog({ group, onClose }: Props) {
  const t = useTranslations('groups');
  const open = group !== null;
  const detail = useAdminGroup(group?.id ?? null);
  const update = useUpdateGroup();
  const syncMembers = useSyncGroupMembers();

  const [title, setTitle] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryChoice>('none');

  useEffect(() => {
    if (detail.data) {
      setTitle(detail.data.title);

      setMemberIds(Array.from(new Set(detail.data.members.map((member) => member.userId))));
    }
  }, [detail.data]);

  const isSaving = update.isPending || syncMembers.isPending;

  const onSubmit = async () => {
    if (!group || !title.trim()) {
      return;
    }

    const current = Array.from(new Set(detail.data?.members.map((member) => member.userId) ?? []));
    const titleDirty = title.trim() !== (detail.data?.title ?? group.title);
    const memberDirty = [...current].sort().join('|') !== [...memberIds].sort().join('|');

    if (!titleDirty && !memberDirty) {
      onClose();

      return;
    }

    try {
      if (titleDirty) {
        await update.mutateAsync({ id: group.id, body: { title: title.trim() } });
      }

      if (memberDirty) {
        await syncMembers.mutateAsync({
          id: group.id,
          currentUserIds: current,
          nextUserIds: memberIds,
          history: toShareHistory(history),
        });
      }

      toast.success(t('detail.rename-success'));

      onClose();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('detail.request-error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && !isSaving ? onClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{group?.title ?? t('actions.manage')}</DialogTitle>
          <DialogDescription>{t('manage.members', { count: memberIds.length })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-group-title">{t('create.name')}</Label>
            <Input
              id="edit-group-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('create.placeholder')}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('manage.title')}</Label>
            <MemberMultiSelect
              selectedIds={memberIds}
              onSelectedIdsChange={setMemberIds}
              initialSelectedUsers={(detail.data?.members ?? []).map((member) => ({
                id: member.userId,
                name: member.name,
                email: member.email,
                avatar: member.avatar,
              }))}
              searchPlaceholder={t('manage.search')}
              emptyLabel={t('manage.no-users')}
              removeLabel={t('manage.remove')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-group-history">{t('manage.history-label')}</Label>
            <Select value={history} onValueChange={(value) => setHistory(value as HistoryChoice)}>
              <SelectTrigger id="edit-group-history">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('manage.history-none')}</SelectItem>
                <SelectItem value="7">{t('manage.history-days', { days: 7 })}</SelectItem>
                <SelectItem value="30">{t('manage.history-days', { days: 30 })}</SelectItem>
                <SelectItem value="all">{t('manage.history-all')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('manage.history-hint')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => void onSubmit()}
            disabled={!title.trim() || isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving ? t('detail.rename-submitting') : t('detail.rename-submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
