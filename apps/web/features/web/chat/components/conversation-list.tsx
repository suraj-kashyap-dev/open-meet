'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@open-meet/ui/button';
import { Input } from '@open-meet/ui/input';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { usePathname } from '@/i18n/navigation';

import { conversationDisplay } from '../lib/conversation-display';
import { useConversations } from '../hooks/use-chat';
import { ConversationListItem } from './conversation-list-item';
import { NewDmDialog } from './new-dm-dialog';
import { PresenceStatusPicker } from './presence-status-picker';

export function ConversationList() {
  const t = useTranslations('chat');
  const { data: user } = useCurrentUser();
  const { data, isLoading } = useConversations();
  const pathname = usePathname();
  const [filter, setFilter] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  const activeId = pathname.startsWith('/chat/') ? pathname.slice('/chat/'.length) : null;

  const items = (data?.items ?? []).filter((c) => {
    if (!filter.trim()) {
      return true;
    }
    return conversationDisplay(c, user?.id).title.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h1 className="text-sm font-semibold tracking-tight">{t('list.title')}</h1>
        <div className="flex items-center gap-1">
          <PresenceStatusPicker />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setNewOpen(true)}
            aria-label={t('list.new')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('list.search')}
            className="ps-9"
          />
        </div>
      </div>

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

      <NewDmDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
