'use client';

import { MessagesSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ChatEmptyState() {
  const t = useTranslations('chat');

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <MessagesSquare className="h-6 w-6" />
      </span>
      <p className="text-sm">{t('view.empty')}</p>
    </div>
  );
}
