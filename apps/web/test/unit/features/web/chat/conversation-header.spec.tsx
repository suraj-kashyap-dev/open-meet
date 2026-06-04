import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationDto } from '@open-meet/types';

import { ConversationHeader } from '@/features/web/chat/components/conversation-header';

const push = vi.fn();
const toggleInfo = vi.fn();
const clearMutate = vi.fn();
const deleteMutate = vi.fn();
const createPollMutate = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/shared/chat', () => ({
  formatTime: () => '10:00 AM',
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: ComponentProps<'a'>) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push }),
}));

vi.mock('@/features/web/chat/hooks/use-chat', () => ({
  useClearConversation: () => ({
    mutate: clearMutate,
    isPending: false,
  }),
  useDeleteConversation: () => ({
    mutate: deleteMutate,
    isPending: false,
  }),
  useCreatePoll: () => ({
    mutate: createPollMutate,
    isPending: false,
  }),
  useSaved: () => ({ data: { items: [] }, isLoading: false }),
  useToggleSave: () => ({ mutate: () => {}, isPending: false }),
}));

vi.mock('@/features/web/chat/stores', () => ({
  useChatStore: (selector: (state: unknown) => unknown) =>
    selector({
      presenceByUser: {
        u2: {
          online: true,
          status: 'AVAILABLE',
          customText: null,
          lastSeen: null,
        },
      },
      toggleInfo,
    }),
}));

vi.mock('@/features/web/chat/components/poll-composer', () => ({
  PollComposer: () => null,
}));

vi.mock('@/features/web/chat/components/presence-dot', () => ({
  PresenceDot: () => null,
}));

vi.mock('@/features/web/chat/components/starred-messages-panel', () => ({
  StarredMessagesPanel: () => null,
}));

vi.mock('@open-meet/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div role="dialog" aria-labelledby="dlg-title">
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2 id="dlg-title">{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

const messages = {
  chat: {
    view: {
      back: 'Back',
    },
    list: {
      untitled: 'Untitled',
    },
    header: {
      info: 'Info',
      members: '{count, plural, one {# member} other {# members}}',
      actions: 'More actions',
      clear: 'Clear chat',
      'clear-confirm-title': 'Clear chat?',
      'clear-confirm-description':
        'This removes the current messages from your view only. ' +
        'Other participants will still see them.',
      'clear-confirmed': 'Messages cleared from your view',
      delete: 'Delete chat',
      'delete-confirm-title': 'Delete chat?',
      'delete-confirm-description':
        "This removes the chat from your conversation list. This action can't be undone.",
      'delete-confirmed': 'Chat deleted',
    },
    poll: {
      create: 'Create poll',
    },
    saved: {
      'view-chat': 'Starred messages',
    },
    group: {
      'action-failed': 'Something went wrong',
    },
    composer: {
      'poll-failed': 'Could not create the poll',
    },
  },
};

function renderHeader() {
  const conversation: ConversationDto = {
    id: 'c1',
    type: 'DIRECT',
    title: null,
    description: null,
    members: [
      {
        userId: 'u1',
        name: 'Alice',
        avatar: null,
        role: 'MEMBER',
        lastReadAt: null,
        online: true,
        status: 'AVAILABLE',
        customText: null,
        lastSeen: null,
        chatDisabled: false,
      },
      {
        userId: 'u2',
        name: 'Bob',
        avatar: null,
        role: 'MEMBER',
        lastReadAt: null,
        online: true,
        status: 'AVAILABLE',
        customText: null,
        lastSeen: null,
        chatDisabled: false,
      },
    ],
    lastMessage: null,
    lastMessageAt: null,
    unreadCount: 0,
    muted: false,
    pinned: false,
    hidden: false,
    youAreAdmin: false,
    createdAt: '2026-05-31T10:00:00.000Z',
  };

  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ConversationHeader conversation={conversation} currentUserId="u1" />
    </NextIntlClientProvider>,
  );
}

describe('<ConversationHeader />', () => {
  beforeEach(() => {
    push.mockReset();
    toggleInfo.mockReset();
    clearMutate.mockReset();
    deleteMutate.mockReset();
    createPollMutate.mockReset();

    clearMutate.mockImplementation((_conversationId, options) => {
      options?.onSuccess?.();
    });
    deleteMutate.mockImplementation((_conversationId, options) => {
      options?.onSuccess?.();
    });
  });

  it('should confirm before calling the clear-chat mutation', async () => {
    renderHeader();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions' }), { button: 0 });
    fireEvent.click(await screen.findByText('Clear chat'));

    expect(clearMutate).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog', { name: 'Clear chat?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear chat' }));

    expect(clearMutate).toHaveBeenCalledWith('c1', expect.any(Object));
  });

  it('should toggle the info panel when the header identity button is clicked', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Info' }));

    expect(toggleInfo).toHaveBeenCalledTimes(1);
  });

  it('should confirm before deleting the chat and routing back to the list', async () => {
    renderHeader();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions' }), { button: 0 });
    fireEvent.click(await screen.findByText('Delete chat'));

    expect(deleteMutate).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog', { name: 'Delete chat?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete chat' }));

    expect(deleteMutate).toHaveBeenCalledWith('c1', expect.any(Object));
    expect(push).toHaveBeenCalledWith('/chat');
  });
});
