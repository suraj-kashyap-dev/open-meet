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

import {
  useAddGroupMembers,
  useAdminGroup,
  useRemoveGroupMember,
  useUpdateGroup,
} from '@/features/groups/hooks/use-admin-groups';
import { useAdminUsers } from '@/features/users/hooks/use-admin-users';
import { ApiClientError } from '@/lib/api/client';
import { useDebouncedValue } from '@/lib/use-debounced-value';

import { GroupMemberPicker } from './group-member-picker';

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
  const addMembers = useAddGroupMembers();
  const removeMember = useRemoveGroupMember();

  const [title, setTitle] = useState('');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<HistoryChoice>('none');
  const [localAdded, setLocalAdded] = useState<
    Record<string, { id: string; name: string; email: string; avatar: string | null }>
  >({});
  const [localRemoved, setLocalRemoved] = useState<Record<string, true>>({});

  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 250);
  const users = useAdminUsers(
    { page: 1, pageSize: 20, search: debouncedSearch },
    { enabled: debouncedSearch.length > 0 },
  );
  const isSearchPending = trimmedSearch.length > 0 && trimmedSearch !== debouncedSearch;

  const currentMembers = (detail.data?.members ?? []).filter(
    (member) => !localRemoved[member.userId],
  );
  const currentMemberIds = new Set(currentMembers.map((member) => member.userId));
  const picked = {
    ...Object.fromEntries(
      currentMembers.map((member) => [
        member.userId,
        {
          id: member.userId,
          name: member.name,
          email: member.email,
          avatar: member.avatar,
          removable: true,
        },
      ]),
    ),
    ...Object.fromEntries(
      Object.values(localAdded)
        .filter((member) => !currentMemberIds.has(member.id))
        .map((member) => [member.id, { ...member, removable: true }]),
    ),
  };
  const visibleIds = new Set(Object.keys(picked));
  const suggestions = (users.data?.items ?? []).filter((user) => !visibleIds.has(user.id));
  const addedList = Object.values(localAdded);
  const removedIds = Object.keys(localRemoved);
  const memberCount = Object.keys(picked).length;
  const membersDirty = addedList.length > 0 || removedIds.length > 0;

  useEffect(() => {
    if (detail.data) {
      setTitle(detail.data.title);
    }
  }, [detail.data]);

  useEffect(() => {
    if (group) {
      setTitle(group.title);
    }

    setSearch('');

    setHistory('none');

    setLocalAdded({});

    setLocalRemoved({});
  }, [group?.id, group?.title]);

  const resetMemberChanges = () => {
    setSearch('');

    setHistory('none');

    setLocalAdded({});

    setLocalRemoved({});
  };

  const close = () => {
    resetMemberChanges();

    onClose();
  };

  const handlePick = (member: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  }) => {
    if (picked[member.id]) {
      return;
    }

    const existingMember = detail.data?.members.find((item) => item.userId === member.id);

    if (existingMember) {
      setLocalRemoved((prev) => {
        const next = { ...prev };

        delete next[member.id];

        return next;
      });
    } else {
      setLocalAdded((prev) => ({ ...prev, [member.id]: member }));
    }

    setSearch('');
  };

  const handleRemove = (userId: string) => {
    if (localAdded[userId]) {
      setLocalAdded((prev) => {
        const next = { ...prev };

        delete next[userId];

        return next;
      });

      return;
    }

    setLocalRemoved((prev) => ({ ...prev, [userId]: true }));
  };

  const isSaving = update.isPending || addMembers.isPending || removeMember.isPending;

  const onSubmit = async () => {
    if (!group || !title.trim()) {
      return;
    }

    const titleDirty = title.trim() !== (detail.data?.title ?? group.title);

    if (!titleDirty && !membersDirty) {
      close();

      return;
    }

    try {
      if (titleDirty) {
        await update.mutateAsync({ id: group.id, body: { title: title.trim() } });
      }

      if (addedList.length > 0) {
        await addMembers.mutateAsync({
          id: group.id,
          userIds: addedList.map((member) => member.id),
          history: toShareHistory(history),
        });
      }

      await Promise.all(
        removedIds.map((userId) => removeMember.mutateAsync({ id: group.id, userId })),
      );

      toast.success(t('detail.rename-success'));

      close();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('detail.request-error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && !isSaving ? close() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{group?.title ?? t('actions.manage')}</DialogTitle>
          <DialogDescription>{t('manage.members', { count: memberCount })}</DialogDescription>
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
            <GroupMemberPicker
              search={search}
              onSearchChange={setSearch}
              suggestions={suggestions}
              picked={picked}
              onPick={handlePick}
              onRemove={handleRemove}
              placeholder={t('manage.search')}
              emptyLabel={t('manage.no-users')}
              clearLabel={t('manage.clear-search')}
              removeLabel={t('manage.remove')}
              isLoading={isSearchPending || users.isFetching}
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
          <Button variant="ghost" onClick={close} disabled={isSaving}>
            {t('delete-dialog.cancel')}
          </Button>
          <Button
            onClick={() => void onSubmit()}
            disabled={!title.trim() || isSaving || detail.isLoading}
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
