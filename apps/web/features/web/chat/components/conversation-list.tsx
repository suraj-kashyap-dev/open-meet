'use client';

import { ArrowLeft, ChevronRight, EyeOff, MessageSquare, Search, SquarePen, Users, Video, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@open-meet/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { Input } from '@open-meet/ui/input';

import { useBranding } from '@/components/web/branding/branding-provider';

import { NewGroupDialog } from './new-group-dialog';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { useCreateMeeting } from '@/features/web/meeting/hooks/use-meetings';
import { useNavigateTransition } from '@/hooks/use-navigate-transition';
import { Link, usePathname } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

import { conversationDisplay } from '../lib/conversation-display';
import { useConversations } from '../hooks/use-chat';
import { useChatStore } from '../stores';
import { ConversationListItem } from './conversation-list-item';

export function ConversationList() {
  const t = useTranslations('chat');
  const tNav = useTranslations('nav');
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useConversations({ includeHidden: true });
  const pathname = usePathname();
  const nav = useNavigateTransition();
  const createMeeting = useCreateMeeting();
  const setPresence = useChatStore((s) => s.setPresence);
  const [filter, setFilter] = useState('');
  const [hiddenMode, setHiddenMode] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const { userCanCreateGroups } = useBranding();

  useEffect(() => {
    if (!data?.items) {
      return;
    }

    const tracked = useChatStore.getState().presenceByUser;
    const seeded = new Map<
      string,
      {
        online: boolean;
        status: NonNullable<(typeof data.items)[number]['members'][number]['status']>;
        customText: string | null;
        lastSeen: string | null;
      }
    >();

    for (const conv of data.items) {
      for (const member of conv.members) {
        seeded.set(member.userId, {
          online: member.online,
          status: member.status ?? (member.online ? 'AVAILABLE' : 'OFFLINE'),
          customText: member.customText ?? null,
          lastSeen: member.lastSeen ?? null,
        });
      }
    }

    for (const [userId, entry] of seeded) {
      const prev = tracked[userId];
      if (
        prev?.online === entry.online &&
        prev.status === entry.status &&
        prev.customText === entry.customText &&
        prev.lastSeen === entry.lastSeen
      ) {
        continue;
      }

      setPresence(userId, entry);
    }
  }, [data, setPresence]);

  const activeId = pathname.startsWith('/chat/') ? pathname.slice('/chat/'.length) : null;

  const startMeeting = async () => {
    try {
      const meeting = await createMeeting.mutateAsync({});
      nav.push(`/${meeting.code}/lobby`);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : tNav('command.create-meeting-error'),
      );
    }
  };

  const all = data?.items ?? [];
  const hiddenChats = all.filter((c) => c.hidden);
  const visibleChats = all.filter((c) => !c.hidden);
  const scope = hiddenMode ? hiddenChats : visibleChats;
  const items = scope.filter((c) => {
    if (!filter.trim()) return true;
    return conversationDisplay(c, user?.id).title.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-end gap-1 px-3 py-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={startMeeting}
          disabled={createMeeting.isPending}
          aria-label={t('list.start-meeting')}
        >
          <Video className="h-4 w-4" />
        </Button>
        {userCanCreateGroups ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t('list.compose')}
                className="rounded-full border border-transparent hover:border-border data-[state=open]:border-border data-[state=open]:bg-muted"
              >
                <SquarePen className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-60 overflow-hidden p-1.5">
              <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                <Link
                  href="/chat/new"
                  className="flex items-center gap-3 rounded-md px-2.5 py-2 outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">
                      {t('group.compose-chat')}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
                  </span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                <button
                  type="button"
                  onClick={() => setNewGroupOpen(true)}
                  className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-start outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Users className="h-4 w-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">
                      {t('group.compose-group')}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
                  </span>
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="icon" variant="ghost" aria-label={t('list.compose')}>
            <Link href="/chat/new">
              <SquarePen className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </header>

      <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} />

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('list.search')}
            className="h-9 rounded-full border-border bg-muted/40 ps-9 pe-9 focus-visible:bg-card"
          />
          {filter ? (
            <button
              type="button"
              onClick={() => setFilter('')}
              aria-label={t('list.search')}
              className="absolute end-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {hiddenMode ? (
          <div className="mb-1 flex items-center gap-2 px-1 py-1">
            <button
              type="button"
              onClick={() => setHiddenMode(false)}
              aria-label={t('view.back')}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold">{t('list.show-hidden')}</h2>
          </div>
        ) : null}

        {!hiddenMode && hiddenChats.length > 0 ? (
          <button
            type="button"
            onClick={() => setHiddenMode(true)}
            className="group mb-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition-colors hover:bg-muted/60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
              <EyeOff className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t('list.show-hidden')}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {hiddenChats.length}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
          </button>
        ) : null}

        {!hiddenMode ? (
          <p className="px-2 pb-1 pt-1 text-xs font-medium text-muted-foreground">
            {t('list.recent')}
          </p>
        ) : null}

        {isLoading ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">{t('list.loading')}</p>
        ) : items.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t('list.empty')}</p>
        ) : (
          items.map((c) => (
            <ConversationListItem
              key={c.id}
              conversation={c}
              currentUserId={user?.id}
              active={activeId === c.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
