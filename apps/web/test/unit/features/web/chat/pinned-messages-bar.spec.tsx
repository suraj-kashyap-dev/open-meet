import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import type { ChatMessageDto } from '@open-meet/types';

import { PinnedMessagesBar } from '@/features/web/chat/components/pinned-messages-bar';

vi.mock('@/components/shared/chat', () => ({
  previewText: (content: string) => content,
  formatTime: () => '10:00',
}));

const messages = {
  chat: {
    bubble: {
      pinned: 'Pinned',
      you: 'You',
      deleted: 'This message was deleted',
      unpin: 'Unpin',
      'unknown-user': 'Unknown',
    },
    list: {
      attachment: 'Attachment',
    },
    pins: {
      previous: 'Previous pinned message',
      next: 'Next pinned message',
      cycle: 'Next pinned message',
      'view-all': 'View all pinned messages',
      title: 'Pinned messages',
      empty: 'No pinned messages yet.',
      count: '{count, plural, one {# pinned} other {# pinned}}',
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

function renderBar(props?: {
  onOpenMessage?: (id: string) => void;
  onUnpin?: (id: string) => void;
  items?: ChatMessageDto[];
}) {
  const onOpenMessage = props?.onOpenMessage ?? vi.fn();
  const onUnpin = props?.onUnpin ?? vi.fn();
  const items = props?.items ?? [
    buildMessage('m3', 'Bring the projector', 'Grace'),
    buildMessage('m2', 'Share the venue map', 'Linus'),
    buildMessage('m1', 'Budget is approved', 'Ada'),
  ];

  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PinnedMessagesBar
        items={items}
        currentUserId="u1"
        isGroup
        onOpenMessage={onOpenMessage}
        onUnpin={onUnpin}
      />
    </NextIntlClientProvider>,
  );

  return { onOpenMessage, onUnpin };
}

describe('<PinnedMessagesBar />', () => {
  it('shows the newest pinned message first with a segmented indicator', () => {
    renderBar();

    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.getByText('Bring the projector')).toBeInTheDocument();

    const segments = screen.getAllByTestId('pin-segment');
    expect(segments).toHaveLength(3);
    expect(segments[0]).toHaveAttribute('data-active', 'true');
  });

  it('caps the segmented indicator at five segments', () => {
    renderBar({
      items: Array.from({ length: 7 }, (_, i) => buildMessage(`m${i}`, `Pin ${i}`, `User ${i}`)),
    });

    expect(screen.getAllByTestId('pin-segment')).toHaveLength(5);
  });

  it('jumps to the active pin and advances to the next on tap (cycle)', () => {
    const { onOpenMessage } = renderBar();

    const cycle = screen.getByRole('button', { name: 'Pinned: Bring the projector' });

    fireEvent.click(cycle);
    expect(onOpenMessage).toHaveBeenLastCalledWith('m3');

    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('Share the venue map')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pinned: Share the venue map' }));
    expect(onOpenMessage).toHaveBeenLastCalledWith('m2');
  });

  it('opens the view-all panel and supports jump + unpin per row', () => {
    const { onOpenMessage, onUnpin } = renderBar();

    fireEvent.click(screen.getByRole('button', { name: 'View all pinned messages' }));

    const panel = screen.getByTestId('pinned-panel');
    expect(within(panel).getByText('Budget is approved')).toBeInTheDocument();
    expect(within(panel).getByText('Share the venue map')).toBeInTheDocument();

    fireEvent.click(within(panel).getByText('Budget is approved'));
    expect(onOpenMessage).toHaveBeenLastCalledWith('m1');

    fireEvent.click(screen.getByRole('button', { name: 'View all pinned messages' }));
    const reopened = screen.getByTestId('pinned-panel');
    const unpinButtons = within(reopened).getAllByRole('button', { name: 'Unpin' });
    fireEvent.click(unpinButtons[0]!);
    expect(onUnpin).toHaveBeenCalledWith('m3');
  });

  it('hides cycle affordances and the view-all button for a single pin', () => {
    renderBar({ items: [buildMessage('m1', 'Only pin', 'Ada')] });

    expect(screen.queryByText('1/1')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'View all pinned messages' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Only pin')).toBeInTheDocument();
  });
});
