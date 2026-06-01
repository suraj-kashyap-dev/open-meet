import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import type { ChatMessageDto } from '@open-meet/types';

import { PinnedMessagesBar } from '@/features/web/chat/components/pinned-messages-bar';

vi.mock('@/components/shared/chat', () => ({
  previewText: (content: string) => content,
}));

const messages = {
  chat: {
    bubble: {
      pinned: 'Pinned',
      you: 'You',
      deleted: 'This message was deleted',
      'unknown-user': 'Unknown',
    },
    list: {
      attachment: 'Attachment',
    },
    pins: {
      previous: 'Previous pinned message',
      next: 'Next pinned message',
    },
  },
};

function buildMessage(id: string, content: string, senderName: string): ChatMessageDto {
  return {
    id,
    conversationId: 'c1',
    type: 'TEXT',
    priority: 'NORMAL',
    content,
    sender: { id: id === 'm1' ? 'u1' : 'u2', name: senderName, avatar: null },
    parentId: null,
    parent: null,
    replyCount: 0,
    attachments: [],
    reactions: [],
    poll: null,
    mentionedUserIds: [],
    mentionsEveryone: false,
    pinned: true,
    saved: false,
    editedAt: null,
    deletedAt: null,
    sentAt: '2026-05-31T10:00:00.000Z',
    clientNonce: null,
  };
}

describe('<PinnedMessagesBar />', () => {
  it('shows the newest pinned message first and cycles through multiple pins', () => {
    const onOpenMessage = vi.fn();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <PinnedMessagesBar
          items={[
            buildMessage('m3', 'Bring the projector', 'Grace'),
            buildMessage('m2', 'Share the venue map', 'Linus'),
            buildMessage('m1', 'Budget is approved', 'Ada'),
          ]}
          currentUserId="u1"
          isGroup
          onOpenMessage={onOpenMessage}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.getByText('Bring the projector')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next pinned message' }));

    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('Linus')).toBeInTheDocument();
    expect(screen.getByText('Share the venue map')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous pinned message' }));

    expect(screen.getByText('Grace')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pinned: Bring the projector' }));

    expect(onOpenMessage).toHaveBeenCalledWith('m3');
  });
});
