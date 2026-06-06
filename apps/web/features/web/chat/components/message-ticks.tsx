'use client';

import { Check, CheckCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@open-meet/ui/cn';

import type { ConversationMemberDto } from '@open-meet/types';

export function MessageTicks({
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

  const others = members.filter((m) => m.userId !== currentUserId);

  const allReached = (pick: (m: ConversationMemberDto) => string | null) =>
    others.length > 0 &&
    others.every((m) => {
      const at = pick(m);
      return at !== null && new Date(at).getTime() >= sentMs;
    });

  const seen = allReached((m) => m.lastReadAt);
  const delivered = seen || allReached((m) => m.lastDeliveredAt);

  const label = seen ? t('ticks.seen') : delivered ? t('ticks.delivered') : t('ticks.sent');

  return (
    <span
      className={cn('inline-flex shrink-0', seen && 'text-sky-500')}
      title={label}
      aria-label={label}
    >
      {delivered ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
    </span>
  );
}
