import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import type { ConversationMemberDto } from '@open-meet/types';

import { MessageTicks } from '@/features/web/chat/components/message-ticks';

const messages = {
  chat: {
    ticks: {
      sent: 'Sent',
      delivered: 'Delivered',
      seen: 'Read',
    },
  },
};

function renderTicks(members: ConversationMemberDto[], currentUserId = 'u1') {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <MessageTicks
        members={members}
        currentUserId={currentUserId}
        messageSentAt="2026-05-31T10:00:00.000Z"
      />
    </NextIntlClientProvider>,
  );
}

function member(overrides: Partial<ConversationMemberDto> = {}): ConversationMemberDto {
  return {
    userId: 'u1',
    name: 'Ada Lovelace',
    avatar: null,
    role: 'MEMBER',
    lastReadAt: null,
    lastDeliveredAt: null,
    online: true,
    status: null,
    customText: null,
    lastSeen: null,
    chatDisabled: false,
    ...overrides,
  };
}

describe('<MessageTicks />', () => {
  it('shows self-chat messages as read immediately', () => {
    renderTicks([member()]);

    expect(screen.getByLabelText('Read')).toBeInTheDocument();
  });

  it('keeps normal direct messages sent until another member receives them', () => {
    renderTicks([member(), member({ userId: 'u2', lastDeliveredAt: null, lastReadAt: null })]);

    expect(screen.getByLabelText('Sent')).toBeInTheDocument();
  });
});
