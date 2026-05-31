import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import type { ChatMessageDto } from '@open-meet/types';

import { MessageBubble } from '@/features/web/chat/components/message-bubble';

vi.mock('@/components/shared/chat', () => ({
  AttachmentBlock: () => null,
  MessageContent: ({ content }: { content: string }) => <span>{content}</span>,
  formatTime: () => '10:00 AM',
}));

vi.mock('@/features/web/chat/components/poll-card', () => ({
  PollCard: () => null,
}));

vi.mock('@/features/web/chat/components/reaction-bar', () => ({
  ReactionBar: () => null,
}));

vi.mock('@/features/web/chat/components/reaction-picker', () => ({
  ReactionPicker: () => null,
}));

vi.mock('@/features/web/chat/components/read-receipts', () => ({
  ReadReceipts: () => null,
}));

vi.mock('@/features/web/chat/components/reply-preview', () => ({
  ReplyPreview: () => null,
}));

const messages = {
  chat: {
    bubble: {
      deleted: 'This message was deleted',
      edit: 'Edit',
      reply: 'Reply',
      more: 'More actions',
      pin: 'Pin',
      unpin: 'Unpin',
      'save-message': 'Save',
      'unsave-message': 'Remove from saved',
      forward: 'Forward',
      delete: 'Delete',
    },
  },
};

function renderBubble(message: ChatMessageDto) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <MessageBubble
        message={message}
        isMe
        isGroupHead={false}
        isGroupTail
        showSenderName={false}
        isLastOwn={false}
        canPost
        members={[]}
        currentUserId={message.sender?.id}
        formatSize={() => '1 KB'}
        onReply={vi.fn()}
        onReact={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onVotePoll={vi.fn()}
        onJumpToParent={vi.fn()}
        onPin={vi.fn()}
        onSave={vi.fn()}
        onForward={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

describe('<MessageBubble />', () => {
  it('should not render a copy-link action in the message menu', async () => {
    const message: ChatMessageDto = {
      id: 'm1',
      conversationId: 'c1',
      type: 'TEXT',
      priority: 'NORMAL',
      content: 'hello world',
      sender: { id: 'u1', name: 'Ada Lovelace', avatar: null },
      parentId: null,
      parent: null,
      replyCount: 0,
      attachments: [],
      reactions: [],
      poll: null,
      mentionedUserIds: [],
      mentionsEveryone: false,
      pinned: false,
      saved: false,
      editedAt: null,
      deletedAt: null,
      sentAt: '2026-05-31T10:00:00.000Z',
      clientNonce: null,
    };

    renderBubble(message);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions' }), { button: 0 });

    expect(await screen.findByText('Forward')).toBeInTheDocument();
    expect(screen.queryByText('Copy link')).not.toBeInTheDocument();
  });
});
