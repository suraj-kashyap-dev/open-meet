'use client';

import { Search, UserPlus, X } from 'lucide-react';
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
import { Input } from '@open-meet/ui/input';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { ApiClientError } from '@/lib/api/client';

import { useAddGroupMembers, useTeammates } from '../hooks/use-chat';

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
          {pickedList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {pickedList.map((m) => (
                <span
                  key={m.id}
                  className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 ps-1 pe-2 text-xs"
                >
                  <UserAvatar user={m} size="xs" />
                  <span>{m.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPicked((prev) => {
                        const next = { ...prev };
                        delete next[m.id];
                        return next;
                      })
                    }
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="relative">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('group.members-placeholder')}
              className="ps-9"
              autoFocus
            />
          </div>
          {search.trim().length > 0 ? (
            <ul className="max-h-48 overflow-y-auto rounded-md border border-border bg-popover p-1">
              {suggestions.length === 0 ? (
                <li className="py-2 text-center text-xs text-muted-foreground">
                  {t('group.no-teammates')}
                </li>
              ) : (
                suggestions
                  .filter((tm) => !picked[tm.id])
                  .map((tm) => (
                    <li key={tm.id}>
                      <button
                        type="button"
                        disabled={tm.chatDisabled}
                        onClick={() => {
                          setPicked((p) => ({
                            ...p,
                            [tm.id]: { id: tm.id, name: tm.name, avatar: tm.avatar },
                          }));
                          setSearch('');
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted disabled:opacity-50"
                      >
                        <UserAvatar user={tm} size="xs" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{tm.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {tm.email}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))
              )}
            </ul>
          ) : null}
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
