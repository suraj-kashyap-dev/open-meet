'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessagesSquare, Search, Send, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@open-meet/ui/cn';
import { Input } from '@open-meet/ui/input';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import type { TeammateDto } from '@open-meet/types';

import { useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

import { chatKeys, useTeammates } from '../hooks/use-chat';
import { chatApi } from '../services/chat';

/**
 * Inline "To:" composer for a brand-new chat.
 * Pick a recipient, type a first message; on send we resolve the DM (reusing the
 * teammate's existing conversation or opening one idempotently) and hand off to
 * the real conversation route, which renders messages normally.
 */
export function NewChatDraft() {
  const t = useTranslations('chat');
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [recipient, setRecipient] = useState<TeammateDto | null>(null);
  const [draft, setDraft] = useState('');
  const teammates = useTeammates(recipient ? '' : search);

  const startChat = useMutation({
    mutationFn: async (content: string) => {
      if (!recipient) {
        throw new Error('no-recipient');
      }
      const conversationId =
        recipient.conversationId ?? (await chatApi.openDirect(recipient.id)).id;
      await chatApi.send(conversationId, { content, clientNonce: crypto.randomUUID() });
      return conversationId;
    },
    onSuccess: (conversationId) => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() });
      void qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
      router.replace(`/chat/${conversationId}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : t('composer.send-failed'));
    },
  });

  const submit = () => {
    const content = draft.trim();
    if (!recipient || content.length === 0 || startChat.isPending) {
      return;
    }
    startChat.mutate(content);
  };

  const suggestions = teammates.data?.items ?? [];

  return (
    <div className="flex h-full flex-col bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => router.push('/chat')}
          aria-label={t('view.back')}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground rtl:rotate-180"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold">{t('new-chat.title')}</p>
      </header>

      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">{t('new-chat.to-label')}</span>
        {recipient ? (
          <span className="flex items-center gap-2 rounded-full bg-muted py-1 pe-1 ps-2 text-sm">
            <UserAvatar user={recipient} size="xs" />
            <span className="font-medium">{recipient.name}</span>
            <button
              type="button"
              aria-label={recipient.name}
              onClick={() => setRecipient(null)}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <div className="relative flex-1">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('new-chat.to-placeholder')}
              className="ps-9"
              autoFocus
            />
            {search.trim().length > 0 ? (
              <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
                {suggestions.length === 0 ? (
                  <li className="px-2 py-3 text-center text-xs text-muted-foreground">
                    <p>{t('new-chat.no-teammates')}</p>
                  </li>
                ) : (
                  suggestions.map((teammate) => (
                    <li key={teammate.id}>
                      <button
                        type="button"
                        disabled={teammate.chatDisabled || !teammate.allowDirectMessages}
                        onClick={() => {
                          setRecipient(teammate);
                          setSearch('');
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-start transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserAvatar user={teammate} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {teammate.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {teammate.email}
                          </span>
                        </span>
                        {teammate.chatDisabled || !teammate.allowDirectMessages ? (
                          <span className="text-[10px] text-muted-foreground">
                            {t('new-chat.disabled')}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <MessagesSquare className="h-7 w-7" />
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">{t('new-chat.empty-title')}</p>
          <p className="text-sm">{t('new-chat.empty-subtitle')}</p>
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            disabled={!recipient}
            rows={1}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t('new-chat.send-placeholder')}
            className="max-h-40 min-h-10 flex-1 resize-none rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!recipient || draft.trim().length === 0 || startChat.isPending}
            aria-label={t('composer.send')}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground transition-opacity',
              (!recipient || draft.trim().length === 0 || startChat.isPending) && 'opacity-40',
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
