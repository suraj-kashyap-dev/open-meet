'use client';

import { useTranslations } from 'next-intl';

import type { ConversationMemberDto } from '@open-meet/types';

export function ReadReceipts({
  members,
  currentUserId,
  messageSentAt,
}: {
  members: ConversationMemberDto[];
  currentUserId: string | undefined;
  messageSentAt: string;
}) {
  const t = useTranslations('chat');
  const sentMs = new Date(messageSentAt).getTime();

  const readers = members.filter(
    (m) =>
      m.userId !== currentUserId &&
      m.lastReadAt !== null &&
      new Date(m.lastReadAt).getTime() >= sentMs,
  );

  if (readers.length === 0) {
    return null;
  }

  return (
    <span className="px-1 text-[10px] text-muted-foreground">
      {readers.length === 1 ? t('receipts.seen') : t('receipts.seen-by', { count: readers.length })}
    </span>
  );
}
