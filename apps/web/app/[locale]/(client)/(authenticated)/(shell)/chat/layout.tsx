import type { ReactNode } from 'react';

import { ChatShell } from '@/features/web/chat/components/chat-shell';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <ChatShell>{children}</ChatShell>;
}
