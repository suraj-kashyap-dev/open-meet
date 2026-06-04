export const GROUP_WINDOW_MS = 2 * 60_000;

export interface GroupableMessage {
  id: string;
  sender: { id: string } | null;
  sentAt: string;
}

export interface MessageRow<T extends GroupableMessage> {
  key: string;
  message: T;
  isMe: boolean;
  isGroupHead: boolean;
  isGroupTail: boolean;
}

export function buildMessageRows<T extends GroupableMessage>(
  messages: T[],
  currentUserId: string | undefined,
): MessageRow<T>[] {
  const rows: MessageRow<T>[] = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const senderId = m.sender?.id ?? null;
    const isMe = senderId !== null && senderId === currentUserId;
    const sentAtMs = new Date(m.sentAt).getTime();

    const sameSenderAsPrev =
      prev !== undefined &&
      prev.sender?.id != null &&
      senderId != null &&
      prev.sender.id === senderId &&
      sentAtMs - new Date(prev.sentAt).getTime() < GROUP_WINDOW_MS;

    const sameSenderAsNext =
      next !== undefined &&
      next.sender?.id != null &&
      senderId != null &&
      next.sender.id === senderId &&
      new Date(next.sentAt).getTime() - sentAtMs < GROUP_WINDOW_MS;

    rows.push({
      key: m.id,
      message: m,
      isMe,
      isGroupHead: !sameSenderAsPrev,
      isGroupTail: !sameSenderAsNext,
    });
  }

  return rows;
}
