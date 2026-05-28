import type { Metadata } from 'next';

import { ChatEmptyState } from '@/features/web/chat/components/chat-empty-state';

export const metadata: Metadata = {
  title: 'Chat',
};

export default function ChatPage() {
  return <ChatEmptyState />;
}
