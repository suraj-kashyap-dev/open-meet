import type { ReactNode } from 'react';

import { AuthGuard } from '@/features/web/auth/components/auth-guard';
import { CommandPalette } from '@/components/shared/command-palette';
import { ActiveMeetingMount } from '@/features/web/meeting/components/active-meeting-mount';
import { ChatSocketProvider } from '@/features/web/chat/components/chat-socket-provider';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <ChatSocketProvider>
        {children}
        <CommandPalette />
        <ActiveMeetingMount />
      </ChatSocketProvider>
    </AuthGuard>
  );
}
