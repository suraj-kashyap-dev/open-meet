import { ConversationView } from '@/features/web/chat/components/conversation-view';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  return <ConversationView conversationId={conversationId} />;
}
