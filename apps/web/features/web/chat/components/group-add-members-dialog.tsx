'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ConversationDto, ShareHistoryDto } from '@open-meet/types';
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
import { Label } from '@open-meet/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-meet/ui/select';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api/client';

import { useAddGroupMembers, useRemoveGroupMember, useTeammates } from '../hooks/use-chat';
import { GroupMemberPicker } from './group-member-picker';

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

export function GroupAddMembersDialog({
  open,
  onOpenChange,
  conversation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDto;
}) {
  const t = useTranslations('chat');
  const { data: currentUser } = useCurrentUser();
  const add = useAddGroupMembers(conversation.id);
  const remove = useRemoveGroupMember(conversation.id);

  const [search, setSearch] = useState('');
  const [history, setHistory] = useState<HistoryChoice>('none');
  const [localAdded, setLocalAdded] = useState<
    Record<string, { id: string; name: string; avatar: string | null }>
  >({});
  const [localRemoved, setLocalRemoved] = useState<Record<string, true>>({});

  const trimmedSearch = search.trim();
  const teammates = useTeammates(trimmedSearch, { enabled: trimmedSearch.length > 0 });
  const adminCount = conversation.members.filter(
    (member) => member.role === 'ADMIN' && !localRemoved[member.userId],
  ).length;
  const currentMembers = conversation.members.filter((member) => !localRemoved[member.userId]);
  const currentMemberIds = new Set(currentMembers.map((member) => member.userId));
  const picked = {
    ...Object.fromEntries(
      currentMembers.map((member) => [
        member.userId,
        {
          id: member.userId,
          name: member.name,
          avatar: member.avatar,
          removable:
            member.userId !== currentUser?.id && (member.role !== 'ADMIN' || adminCount > 1),
        },
      ]),
    ),
    ...Object.fromEntries(
      Object.values(localAdded)
        .filter((member) => !currentMemberIds.has(member.id))
        .map((member) => [
          member.id,
          {
            ...member,
            removable: member.id !== currentUser?.id,
          },
        ]),
    ),
  };
  const visibleIds = new Set(Object.keys(picked));
  const suggestions = (teammates.data?.items ?? []).filter((tm) => !visibleIds.has(tm.id));
  const addedList = Object.values(localAdded);
  const removedIds = Object.keys(localRemoved);
  const hasChanges = addedList.length > 0 || removedIds.length > 0;

  const reset = () => {
    setSearch('');

    setHistory('none');

    setLocalAdded({});

    setLocalRemoved({});
  };

  const handlePick = (member: { id: string; name: string; avatar: string | null }) => {
    if (picked[member.id]) {
      return;
    }

    const existingMember = conversation.members.find((item) => item.userId === member.id);

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
    if (userId === currentUser?.id) {
      return;
    }

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

  const submit = async () => {
    if (!hasChanges) {
      return;
    }

    try {
      if (addedList.length > 0) {
        await add.mutateAsync({
          userIds: addedList.map((member) => member.id),
          history: toShareHistory(history),
        });
      }

      await Promise.all(removedIds.map((userId) => remove.mutateAsync(userId)));

      if (addedList.length > 0) {
        toast.success(t('group.members-added'));
      } else if (removedIds.length > 0) {
        toast.success(t('group.removed'));
      }

      reset();

      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('group.action-failed'));
    }
  };

  const cancel = () => {
    reset();

    onOpenChange(false);
  };

  const saveLabel = t('group.save');

  const isSaving = add.isPending || remove.isPending;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
    }

    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('group.add-members-title')}</DialogTitle>
          <DialogDescription>{t('group.add-members-subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <GroupMemberPicker
            search={search}
            onSearchChange={setSearch}
            suggestions={suggestions}
            picked={picked}
            onPick={handlePick}
            onRemove={handleRemove}
            placeholder={t('group.members-placeholder')}
            emptyLabel={t('group.no-teammates')}
            loadingLabel={t('list.loading')}
            isLoading={teammates.isLoading}
            autoFocus
          />

          <div className="space-y-1.5">
            <Label htmlFor="add-members-history">{t('group.history-label')}</Label>
            <Select value={history} onValueChange={(value) => setHistory(value as HistoryChoice)}>
              <SelectTrigger id="add-members-history">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('group.history-none')}</SelectItem>
                <SelectItem value="7">{t('group.history-days', { days: 7 })}</SelectItem>
                <SelectItem value="30">{t('group.history-days', { days: 30 })}</SelectItem>
                <SelectItem value="all">{t('group.history-all')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('group.history-hint')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={cancel} disabled={isSaving}>
            {t('group.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={!hasChanges || isSaving}>
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
