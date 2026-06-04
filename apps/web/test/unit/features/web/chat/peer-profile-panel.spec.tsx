import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationMemberDto, PublicUserDto } from '@open-meet/types';

import { PeerProfilePanel } from '@/features/web/chat/components/peer-profile-panel';

const { writeText, toastError, setInfoOpen, usePublicUserMock } = vi.hoisted(() => ({
  writeText: vi.fn(),
  toastError: vi.fn(),
  setInfoOpen: vi.fn(),
  usePublicUserMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
  },
}));

vi.mock('@open-meet/ui/user-avatar', () => ({
  UserAvatar: ({ user }: { user: { name: string } }) => <span>{user.name}</span>,
}));

vi.mock('@/features/web/chat/hooks/use-chat', () => ({
  usePublicUser: (userId: string) => usePublicUserMock(userId),
}));

vi.mock('@/features/web/chat/stores', () => ({
  useChatStore: (selector: (state: unknown) => unknown) =>
    selector({
      setInfoOpen,
      presenceByUser: {
        u2: {
          online: true,
          status: 'AVAILABLE',
          customText: null,
          lastSeen: null,
        },
      },
    }),
}));

vi.mock('@/features/web/chat/components/presence-dot', () => ({
  PresenceDot: () => null,
}));

const messages = {
  chat: {
    info: {
      title: 'Details',
      close: 'Close',
      loading: 'Loading…',
      unavailable: 'Profile unavailable.',
      private: 'This profile is private.',
      email: 'Email',
      timezone: 'Timezone',
      joined: 'Joined',
    },
    presence: {
      available: 'Available',
      online: 'Online',
      offline: 'Offline',
      'last-seen-short': 'Last seen recently',
    },
    group: {
      'action-failed': 'Something went wrong',
    },
  },
};

const peer: ConversationMemberDto = {
  userId: 'u2',
  name: 'Ada Lovelace',
  avatar: null,
  role: 'MEMBER',
  lastReadAt: null,
  online: true,
  status: 'AVAILABLE',
  customText: null,
  lastSeen: null,
  chatDisabled: false,
};

const publicUser: PublicUserDto = {
  id: 'u2',
  name: 'Ada Lovelace',
  avatar: null,
  bio: null,
  timezone: null,
  language: null,
  email: 'ada@example.com',
  joinedAt: null,
  visibility: 'PUBLIC',
};

function renderPanel() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PeerProfilePanel peer={peer} locale="en" />
    </NextIntlClientProvider>,
  );
}

describe('<PeerProfilePanel />', () => {
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    toastError.mockReset();
    setInfoOpen.mockReset();
    usePublicUserMock.mockReset().mockReturnValue({
      data: publicUser,
      isLoading: false,
    });

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });
  });

  it('copies the visible email address when the email action is clicked', async () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'ada@example.com' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('ada@example.com');
    });
    expect(toastError).not.toHaveBeenCalled();
  });
});
