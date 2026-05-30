'use client';

import { useChatStore } from '../stores';

export function ChatNavBadge() {
  const total = useChatStore((s) => s.totalUnread);

  if (total <= 0) {
    return null;
  }

  return (
    <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background">
      {total > 99 ? '99+' : total}
    </span>
  );
}
