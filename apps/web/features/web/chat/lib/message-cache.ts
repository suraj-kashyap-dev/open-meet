import type { InfiniteData } from '@tanstack/react-query';

import type { ChatMessageDto, ChatMessagePageDto } from '@open-meet/types';

export type MessagesData = InfiniteData<ChatMessagePageDto, string | undefined>;

export const emptyMessagesData: MessagesData = {
  pages: [{ items: [], nextCursor: null }],
  pageParams: [undefined],
};

export function flattenMessages(data: MessagesData | undefined): ChatMessageDto[] {
  if (!data) {
    return [];
  }

  return data.pages
    .slice()
    .reverse()
    .flatMap((page) => page.items);
}

export function upsertMessage(
  data: MessagesData | undefined,
  message: ChatMessageDto,
): MessagesData {
  const base = data ?? emptyMessagesData;
  let replaced = false;

  const pages = base.pages.map((page) => ({
    ...page,
    items: page.items.map((m) => {
      const sameNonce =
        Boolean(message.clientNonce) &&
        Boolean(m.clientNonce) &&
        m.clientNonce === message.clientNonce;

      if (sameNonce || m.id === message.id) {
        replaced = true;

        return message;
      }

      return m;
    }),
  }));

  if (replaced) {
    return { ...base, pages };
  }

  const [first, ...rest] = pages;

  if (!first) {
    return { pages: [{ items: [message], nextCursor: null }], pageParams: [undefined] };
  }

  return { ...base, pages: [{ ...first, items: [...first.items, message] }, ...rest] };
}

export function patchMessage(
  data: MessagesData | undefined,
  id: string,
  patch: Partial<ChatMessageDto>,
): MessagesData | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  };
}
