'use client';

import type { ReactNode } from 'react';

import { cn } from '@open-meet/ui/cn';

import { usePathname } from '@/i18n/navigation';

import { ConversationList } from './conversation-list';

export function ChatShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const conversationOpen = /^\/chat\/.+/.test(pathname);

  return (
    <div className="flex h-full">
      <aside
        className={cn(
          'w-full shrink-0 border-e border-border lg:w-96',
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
