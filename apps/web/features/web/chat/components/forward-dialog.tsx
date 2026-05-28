'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@open-meet/ui/dialog';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import type { ChatMessageDto } from '@open-meet/types';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

import { conversationDisplay } from '../lib/conversation-display';
import { useConversations, useForwardMessage } from '../hooks/use-chat';

export function ForwardDialog({
  message,
  onClose,
}: {
  message: ChatMessageDto | null;
  onClose: () => void;
}) {
  const t = useTranslations('chat');
  const { data: user } = useCurrentUser();
  const { data } = useConversations();
  const router = useRouter();
  const forward = useForwardMessage();

  const items = data?.items ?? [];

  const submit = (targetConversationId: string) => {
    if (!message) {
      return;
    }

    forward.mutate(
      { messageId: message.id, targetConversationId },
      {
        onSuccess: () => {
          toast.success(t('forward.success'));
          onClose();
          router.push(`/chat/${targetConversationId}`);
        },
        onError: (err) =>
          toast.error(err instanceof ApiClientError ? err.message : t('forward.error')),
      },
    );
  };

  return (
    <Dialog open={message !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('forward.title')}</DialogTitle>
        </DialogHeader>

        <ul className="max-h-72 space-y-0.5 overflow-y-auto">
          {items.map((c) => {
            const display = conversationDisplay(c, user?.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={forward.isPending}
                  onClick={() => submit(c.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-start transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {display.isGroup ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Users className="h-4 w-4" />
                    </span>
                  ) : (
                    <UserAvatar user={{ name: display.title || '?', avatar: display.avatar }} size="sm" />
                  )}
                  <span className="truncate text-sm font-medium">
                    {display.title || t('list.untitled')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
