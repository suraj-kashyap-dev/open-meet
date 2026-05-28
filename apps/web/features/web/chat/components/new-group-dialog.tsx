'use client';

import { Search, UserPlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

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

import { useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

import { useCreateGroup, useTeammates } from '../hooks/use-chat';

/**
 * "New group" composer modal. Title + optional description + multi-select
 * teammate picker. On submit calls `POST /messaging/groups` and navigates to
 * the new conversation. Open only when the workspace allows user-initiated
 * groups (the trigger in the conversation-list header gates visibility).
 */
export function NewGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('chat');
  const router = useRouter();
  const create = useCreateGroup();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Record<string, { id: string; name: string; avatar: string | null }>>({});

  const teammates = useTeammates(search);
  const suggestions = teammates.data?.items ?? [];
  const pickedList = Object.values(picked);

  const reset = () => {
    setTitle('');
    setDescription('');
    setSearch('');
    setPicked({});
  };

  const submit = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) return;
    try {
      const conv = await create.mutateAsync({
        title: trimmedTitle,
        description: description.trim() || null,
        memberIds: pickedList.map((m) => m.id),
      });
      reset();
      onOpenChange(false);
      router.push(`/chat/${conv.id}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('group.create-failed'));
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
          <DialogTitle>{t('group.create-title')}</DialogTitle>
          <DialogDescription>{t('group.create-subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t('group.name-label')}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('group.name-placeholder')}
              maxLength={80}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t('group.description-label')}
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('group.description-placeholder')}
              maxLength={280}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t('group.members-label')}
            </label>
            {pickedList.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {pickedList.map((m) => (
                  <span
                    key={m.id}
                    className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 ps-1 pe-2 text-xs"
                  >
                    <UserAvatar user={m} size="xs" />
                    <span>{m.name}</span>
                    <button
                      type="button"
                      onClick={() => setPicked((prev) => {
                        const next = { ...prev };
                        delete next[m.id];
                        return next;
                      })}
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
              />
            </div>
            {search.trim().length > 0 ? (
              <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover p-1">
                {suggestions.length === 0 ? (
                  <li className="py-2 text-center text-xs text-muted-foreground">
                    {t('group.no-teammates')}
                  </li>
                ) : (
                  suggestions
                    .filter((t) => !picked[t.id])
                    .map((tm) => (
                      <li key={tm.id}>
                        <button
                          type="button"
                          disabled={tm.chatDisabled}
                          onClick={() => {
                            setPicked((p) => ({ ...p, [tm.id]: { id: tm.id, name: tm.name, avatar: tm.avatar } }));
                            setSearch('');
                          }}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted disabled:opacity-50"
                        >
                          <UserAvatar user={tm} size="xs" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{tm.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{tm.email}</span>
                          </span>
                        </button>
                      </li>
                    ))
                )}
              </ul>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('group.cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={title.trim().length === 0 || create.isPending}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            {t('group.create-submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
