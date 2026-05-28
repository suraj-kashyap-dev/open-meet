'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import { Input } from '@open-meet/ui/input';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { useRouter } from '@/i18n/navigation';

import { chatKeys, useTeammates } from '../hooks/use-chat';
import { chatApi } from '../services/chat';

export function NewDmDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('chat');
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const teammates = useTeammates(search);

  const openDm = useMutation({
    mutationFn: (userId: string) => chatApi.openDirect(userId),
    onSuccess: (conversation) => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
      onOpenChange(false);
      setSearch('');
      router.push(`/chat/${conversation.id}`);
    },
  });

  const items = teammates.data?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('new-dm.title')}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('new-dm.search')}
            className="ps-9"
            autoFocus
          />
        </div>

        <ul className="max-h-72 space-y-0.5 overflow-y-auto">
          {items.length === 0 ? (
            <li className="py-6 text-center text-xs text-muted-foreground">
              {t('new-dm.no-teammates')}
            </li>
          ) : (
            items.map((teammate) => (
              <li key={teammate.id}>
                <button
                  type="button"
                  disabled={teammate.chatDisabled || openDm.isPending}
                  onClick={() => openDm.mutate(teammate.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-start transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserAvatar user={teammate} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{teammate.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {teammate.email}
                    </span>
                  </span>
                  {teammate.chatDisabled ? (
                    <span className="text-[10px] text-muted-foreground">
                      {t('new-dm.disabled')}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
