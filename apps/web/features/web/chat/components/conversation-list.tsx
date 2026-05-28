'use client';

import { ListFilter, Search, SquarePen, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@open-meet/ui/button';
import { Input } from '@open-meet/ui/input';

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
  const { data, isLoading } = useConversations();
  const pathname = usePathname();
  const nav = useNavigateTransition();
  const createMeeting = useCreateMeeting();
  const setPresence = useChatStore((s) => s.setPresence);
  const [filter, setFilter] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // Seed the presence store from each conversation's members so other users'
  // status dots show their REAL current state on first load — without this,
  // dots stay OFFLINE until a live socket event fires for that user.
  useEffect(() => {
    if (!data?.items) return;
    for (const conv of data.items) {
      for (const member of conv.members) {
        setPresence(member.userId, {
          online: member.online,
          status: member.status ?? (member.online ? 'AVAILABLE' : 'OFFLINE'),
          customText: member.customText ?? null,
          lastSeen: null,
        });
      }
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

  const items = (data?.items ?? []).filter((c) => {
    if (!filter.trim()) {
      return true;
    }
    return conversationDisplay(c, user?.id).title.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">{t('list.title')}</h1>
        <div className="flex items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowFilter((v) => !v)}
            aria-label={t('list.filter')}
            aria-pressed={showFilter}
          >
            <ListFilter className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={startMeeting}
            disabled={createMeeting.isPending}
            aria-label={t('list.start-meeting')}
          >
            <Video className="h-4 w-4" />
          </Button>
          <Button asChild size="icon" variant="ghost" aria-label={t('list.compose')}>
            <Link href="/chat/new">
              <SquarePen className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {showFilter ? (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t('list.search')}
              className="ps-9"
              autoFocus
            />
          </div>
        </div>
      ) : null}

      <p className="px-4 pb-1 pt-1 text-xs font-medium text-muted-foreground">{t('list.recent')}</p>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
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
