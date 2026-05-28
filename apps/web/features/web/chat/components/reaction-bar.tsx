'use client';

import { cn } from '@open-meet/ui/cn';

import type { ReactionSummaryDto } from '@open-meet/types';

export function ReactionBar({
  reactions,
  onToggle,
  align,
}: {
  reactions: ReactionSummaryDto[];
  onToggle: (emoji: string, reactedByMe: boolean) => void;
  align: 'start' | 'end';
}) {
  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1', align === 'end' ? 'justify-end' : 'justify-start')}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle(r.emoji, r.reactedByMe)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors',
            r.reactedByMe
              ? 'border-foreground/30 bg-foreground/10'
              : 'border-border bg-muted hover:bg-muted/70',
          )}
        >
          <span>{r.emoji}</span>
          <span className="text-muted-foreground">{r.count}</span>
        </button>
      ))}
    </div>
  );
}
