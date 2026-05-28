'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@open-meet/ui/cn';

export function ReplyPreview({
  senderName,
  content,
  deleted,
  onCancel,
  onClick,
  className,
}: {
  senderName: string | null;
  content: string;
  deleted: boolean;
  onCancel?: () => void;
  onClick?: () => void;
  className?: string;
}) {
  const t = useTranslations('chat');
  const Element = onClick ? 'button' : 'div';

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border-s-2 border-foreground/40 bg-muted/60 px-2 py-1',
        className,
      )}
    >
      <Element
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className="min-w-0 flex-1 text-start"
      >
        <span className="block text-xs font-medium text-foreground">
          {senderName ?? t('bubble.unknown-user')}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {deleted ? t('bubble.deleted') : content}
        </span>
      </Element>

      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('composer.cancel-reply')}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
