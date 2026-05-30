'use client';

import { UserPlus } from 'lucide-react';
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

import { useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

import { useCreateGroup, useTeammates } from '../hooks/use-chat';
import { GroupMemberPicker } from './group-member-picker';

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
            />
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
