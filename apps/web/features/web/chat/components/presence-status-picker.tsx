'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@open-meet/ui/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';

import type { PresenceStatus, UserPresenceDto } from '@open-meet/types';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';

import { presenceMeKey, usePresenceMe } from '../hooks/use-chat';
import { useChatStore } from '../stores';
import { useChatSocketContext } from './chat-socket-provider';

const STATUS_COLOR: Record<PresenceStatus, string> = {
  AVAILABLE: 'bg-emerald-500',
  BUSY: 'bg-rose-500',
  DND: 'bg-rose-600',
  BRB: 'bg-amber-500',
  AWAY: 'bg-amber-400',
  OFFLINE: 'bg-muted-foreground/40',
};

const OPTIONS: PresenceStatus[] = ['AVAILABLE', 'BUSY', 'DND', 'BRB', 'AWAY', 'OFFLINE'];

export function PresenceStatusPicker() {
  const t = useTranslations('chat');
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const me = usePresenceMe();
  const { setPresence } = useChatSocketContext();
  const storeSetPresence = useChatStore((s) => s.setPresence);

  const current = me.data?.status ?? 'AVAILABLE';

  const label = (status: PresenceStatus) =>
    t(`presence.${status.toLowerCase()}` as `presence.${Lowercase<PresenceStatus>}`);

  const choose = (status: PresenceStatus) => {
    setPresence(status, me.data?.customText ?? null);
    qc.setQueryData<UserPresenceDto>(presenceMeKey, (prev) =>
      prev
        ? { ...prev, status }
        : {
            userId: user?.id ?? '',
            online: true,
            status,
            customText: null,
            lastSeen: null,
          },
    );
    if (user) {
      storeSetPresence(user.id, {
        online: status !== 'OFFLINE',
        status,
        customText: me.data?.customText ?? null,
        lastSeen: null,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('presence.set-status')}
        className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_COLOR[current])} />
        <span className="hidden sm:inline">{label(current)}</span>
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((status) => (
          <DropdownMenuItem key={status} onSelect={() => choose(status)}>
            <span className={cn('me-2 h-2.5 w-2.5 rounded-full', STATUS_COLOR[status])} />
            {label(status)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
