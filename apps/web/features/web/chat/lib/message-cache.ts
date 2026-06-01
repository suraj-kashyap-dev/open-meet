import type { InfiniteData } from '@tanstack/react-query';

import type { ChatMessageDto, ChatMessagePageDto } from '@open-meet/types';

/**
 * Infinite pages of messages. The first page is the newest batch; subsequent
 * pages (fetched via `nextCursor`) are progressively older. Within a page,
 * items are ascending (oldest → newest).
 */
export type MessagesData = InfiniteData<ChatMessagePageDto, string | undefined>;

export const emptyMessagesData: MessagesData = {
  pages: [{ items: [], nextCursor: null }],
  pageParams: [undefined],
};

/** Flatten to a single ascending (oldest → newest) list for rendering. */
export function flattenMessages(data: MessagesData | undefined): ChatMessageDto[] {
  if (!data) {
    return [];
  }

  return data.pages
    .slice()
    .reverse()
    .flatMap((page) => page.items);
}

/**
 * Insert or replace a message. Matches an existing optimistic row by
 * `clientNonce` first, then by `id`; otherwise appends to the newest page.
 */
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

/** Apply a partial update to a message by id, leaving the rest untouched. */
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
