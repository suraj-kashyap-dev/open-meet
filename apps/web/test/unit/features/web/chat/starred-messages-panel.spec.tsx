import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessageDto, SavedMessageDto } from '@open-meet/types';

import { StarredMessagesPanel } from '@/features/web/chat/components/starred-messages-panel';

const push = vi.fn();
const saveMutate = vi.fn();
let savedItems: SavedMessageDto[] = [];

vi.mock('@/components/shared/chat', () => ({
  previewText: (content: string) => content,
  formatTime: () => '10:00',
}));

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/features/web/chat/hooks/use-chat', () => ({
  useSaved: () => ({ data: { items: savedItems } }),
  useToggleSave: () => ({ mutate: saveMutate }),
}));

const messages = {
  chat: {
    bubble: {
      you: 'You',
      'unknown-user': 'Unknown',
      deleted: 'This message was deleted',
      starred: 'Starred',
      'unsave-message': 'Unstar',
    },
    list: { attachment: 'Attachment' },
    saved: {
      subtitle: "Messages you've starred.",
      'view-chat': 'Starred messages',
      'chat-empty': 'No starred messages in this chat yet.',
    },
  },
};

function buildSaved(id: string, content: string, conversationId: string): SavedMessageDto {
  const message: ChatMessageDto = {
    id,
    conversationId,
    type: 'TEXT',
    priority: 'NORMAL',
    content,
    sender: { id: 'u2', name: 'Grace', avatar: null },
    parentId: null,
    parent: null,
    replyCount: 0,
    attachments: [],
    reactions: [],
    poll: null,
    mentionedUserIds: [],
    mentionsEveryone: false,
    pinned: false,
    saved: true,
    editedAt: null,
    deletedAt: null,
    sentAt: '2026-05-31T10:00:00.000Z',
    clientNonce: null,
  };
  return { message, conversationId, conversationTitle: 'Grace Hopper' };
}

function renderPanel() {
  const onOpenChange = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <StarredMessagesPanel
        conversationId="c1"
        isGroup
        currentUserId="u1"
        open
        onOpenChange={onOpenChange}
      />
    </NextIntlClientProvider>,
  );
  return { onOpenChange };
}

describe('<StarredMessagesPanel />', () => {
  beforeEach(() => {
    push.mockReset();
    saveMutate.mockReset();
  });

  it('lists only the starred messages for the active conversation', () => {
    savedItems = [
      buildSaved('m1', 'Budget is approved', 'c1'),
      buildSaved('m2', 'Other chat note', 'c2'),
    ];
    renderPanel();

    expect(screen.getByText('Budget is approved')).toBeInTheDocument();
    expect(screen.queryByText('Other chat note')).not.toBeInTheDocument();
  });

  it('jumps to the message and closes when a row is tapped', () => {
    savedItems = [buildSaved('m1', 'Budget is approved', 'c1')];
    const { onOpenChange } = renderPanel();

    fireEvent.click(screen.getByText('Budget is approved'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(push).toHaveBeenCalledWith('/chat/c1?m=m1');
  });

  it('unstars a message from its row action', () => {
    savedItems = [buildSaved('m1', 'Budget is approved', 'c1')];
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Unstar' }));

    expect(saveMutate).toHaveBeenCalledWith({ messageId: 'm1', saved: true });
  });

  it('shows the empty state when this chat has no starred messages', () => {
    savedItems = [buildSaved('m2', 'Other chat note', 'c2')];
    renderPanel();

    expect(screen.getByText('No starred messages in this chat yet.')).toBeInTheDocument();
  });
});
