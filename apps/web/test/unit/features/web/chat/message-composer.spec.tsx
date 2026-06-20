import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as SharedChat from '@/components/shared/chat';
import { MessageComposer } from '@/features/web/chat/components/message-composer';

const send = vi.fn();
const startTyping = vi.fn();
const stopTyping = vi.fn();

let composerMode: 'NORMAL' | 'WYSIWYG' | 'MARKDOWN' = 'NORMAL';
let lastRichInputAutoFocusToken: string | undefined;

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock('@/components/shared/chat', async () => {
  const actual = await vi.importActual<typeof SharedChat>('@/components/shared/chat');

  return {
    ...actual,
    StagedAttachmentPreview: () => null,
    useStagedAttachments: () => ({
      staged: [],
      hasUploading: false,
      readyAttachments: [],
      readyAttachmentIds: [],
      stageFiles: vi.fn(),
      removeStaged: vi.fn(),
      reset: vi.fn(),
    }),
  };
});

vi.mock('@/components/web/branding/branding-provider', () => ({
  useBranding: () => ({ gifsEnabled: false }),
}));

vi.mock('@/features/web/account/hooks/use-settings', () => ({
  useUserSettings: () => ({
    data: {
      composerPreferences: {
        composerMode,
      },
    },
  }),
}));

vi.mock('@/features/web/chat/hooks/use-chat', () => ({
  useSendMessage: () => ({
    send,
    isPending: false,
  }),
}));

vi.mock('@/features/web/chat/components/chat-socket-provider', () => ({
  useChatSocketContext: () => ({
    startTyping,
    stopTyping,
  }),
}));

vi.mock('@/features/web/chat/components/gif-picker', () => ({
  GifPicker: () => null,
}));

vi.mock('@/features/web/chat/components/markdown-toolbar', () => ({
  MarkdownToolbar: () => null,
}));

vi.mock('@/features/web/chat/components/reaction-picker', () => ({
  ReactionPicker: () => null,
}));

vi.mock('@/features/web/chat/components/reply-preview', () => ({
  ReplyPreview: () => null,
}));

vi.mock('@/features/web/chat/components/rich-input', () => ({
  RichInput: ({
    autoFocusToken,
    placeholder,
  }: {
    autoFocusToken?: string;
    placeholder: string;
  }) => {
    lastRichInputAutoFocusToken = autoFocusToken;

    return <div data-testid="rich-input">{placeholder}</div>;
  },
}));

const messages = {
  chat: {
    composer: {
      placeholder: 'Write a message',
      'attach-file': 'Attach file',
      'take-photo': 'Take photo',
      send: 'Send',
      disabled: 'Disabled',
    },
    priority: {
      label: 'Priority',
      normal: 'Normal',
      important: 'Important',
      urgent: 'Urgent',
    },
  },
};

function renderComposer(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('<MessageComposer />', () => {
  beforeEach(() => {
    composerMode = 'NORMAL';

    lastRichInputAutoFocusToken = undefined;

    send.mockReset();

    startTyping.mockReset();

    stopTyping.mockReset();
  });

  it('focuses the plain chat input when a conversation opens', async () => {
    renderComposer(
      <MessageComposer
        conversationId="c1"
        canPost
        members={[]}
        currentUserId="u1"
        replyingTo={null}
        onCancelReply={() => {}}
        onSent={() => {}}
      />,
    );

    const input = screen.getByPlaceholderText('Write a message');

    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it('renders the rich editor for wysiwyg mode', () => {
    composerMode = 'WYSIWYG';

    renderComposer(
      <MessageComposer
        conversationId="c1"
        canPost
        members={[]}
        currentUserId="u1"
        replyingTo={null}
        onCancelReply={() => {}}
        onSent={() => {}}
      />,
    );

    expect(screen.getByTestId('rich-input')).toHaveTextContent('Write a message');

    expect(lastRichInputAutoFocusToken).toBe('c1');
  });
});
