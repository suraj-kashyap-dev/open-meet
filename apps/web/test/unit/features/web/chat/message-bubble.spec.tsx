import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import type { ChatMessageDto } from '@open-meet/types';

import { MessageBubble } from '@/features/web/chat/components/message-bubble';

vi.mock('@/components/shared/chat', () => ({
  AttachmentBlock: () => <div>Attachment</div>,
  MessageContent: ({ content }: { content: string }) => <span>{content}</span>,
  formatTime: () => '10:00',
}));

vi.mock('@/features/web/chat/components/poll-card', () => ({
  PollCard: () => <div>Poll</div>,
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
      you: 'You',
      'unknown-user': 'Unknown',
      pinned: 'Pinned',
      edited: 'Edited',
      deleted: 'Deleted',
      save: 'Save',
      cancel: 'Cancel',
      reply: 'Reply',
      more: 'More',
      edit: 'Edit',
      pin: 'Pin',
      unpin: 'Unpin',
      'save-message': 'Save message',
      'unsave-message': 'Unsave message',
      forward: 'Forward',
      delete: 'Delete',
    },
    priority: {
      urgent: 'Urgent',
      important: 'Important',
    },
  },
};

function buildMessage(): ChatMessageDto {
  return {
    id: 'm1',
    conversationId: 'c1',
    type: 'TEXT',
    priority: 'NORMAL',
    content: 'Jump target',
    sender: { id: 'u1', name: 'Ada', avatar: null },
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
}

describe('<MessageBubble />', () => {
  it('marks the message row as the jump target and highlights the message surface', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ul>
          <MessageBubble
            message={buildMessage()}
            isMe
            highlighted
            isGroupHead
            isGroupTail
            showSenderName={false}
            isLastOwn={false}
            canPost={false}
            members={[]}
            currentUserId="u1"
            formatSize={(bytes) => `${bytes}`}
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
        </ul>
      </NextIntlClientProvider>,
    );

    const item = screen.getByText('Jump target').closest('li');

    expect(item).toHaveAttribute('data-mid', 'm1');
    expect(item?.querySelector('.chat-jump-target-end')).not.toBeNull();
    expect(item?.querySelector('.chat-jump-surface')).not.toBeNull();
  });
});
