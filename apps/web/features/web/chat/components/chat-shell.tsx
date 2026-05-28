'use client';

import type { ReactNode } from 'react';

import { cn } from '@open-meet/ui/cn';

import { usePathname } from '@/i18n/navigation';

import { ConversationList } from './conversation-list';

/**
 * Two-pane chat frame. On desktop the conversation list rail is always visible
 * next to the routed conversation pane. On mobile the rail is the page until a
 * conversation is opened, then the conversation takes over full width.
 */
export function ChatShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const conversationOpen = /^\/chat\/.+/.test(pathname);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <aside
        className={cn(
          'w-full shrink-0 border-e border-border lg:w-80',
          conversationOpen ? 'hidden lg:block' : 'block',
        )}
      >
        <ConversationList />
      </aside>

      <main className={cn('min-w-0 flex-1', conversationOpen ? 'block' : 'hidden lg:block')}>
        {children}
      </main>
    </div>
  );
}
