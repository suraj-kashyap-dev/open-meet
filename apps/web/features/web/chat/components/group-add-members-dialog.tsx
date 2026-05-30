'use client';

import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ConversationDto } from '@open-meet/types';
import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';

import { ApiClientError } from '@/lib/api/client';

import { useAddGroupMembers, useTeammates } from '../hooks/use-chat';
import { GroupMemberPicker } from './group-member-picker';

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
  const add = useAddGroupMembers(conversation.id);

  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<
    Record<string, { id: string; name: string; avatar: string | null }>
  >({});

  const teammates = useTeammates(search);
  const existingIds = new Set(conversation.members.map((m) => m.userId));
  const suggestions = (teammates.data?.items ?? []).filter((tm) => !existingIds.has(tm.id));
  const pickedList = Object.values(picked);

  const reset = () => {
    setSearch('');
    setPicked({});
  };

  const submit = async () => {
    if (pickedList.length === 0) return;
    try {
      await add.mutateAsync(pickedList.map((m) => m.id));
      toast.success(t('group.members-added'));
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('group.action-failed'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
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
            onPick={(member) => {
              setPicked((prev) => ({ ...prev, [member.id]: member }));
              setSearch('');
            }}
            onRemove={(userId) =>
              setPicked((prev) => {
                const next = { ...prev };
                delete next[userId];
                return next;
              })
            }
            placeholder={t('group.members-placeholder')}
            emptyLabel={t('group.no-teammates')}
            loadingLabel={t('list.loading')}
            isLoading={teammates.isLoading}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('group.cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={pickedList.length === 0 || add.isPending}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            {t('group.add-members')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
