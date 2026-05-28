'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@open-meet/ui/cn';

import type { PollDto } from '@open-meet/types';

export function PollCard({
  poll,
  onVote,
  disabled,
}: {
  poll: PollDto;
  onVote: (optionIds: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('chat');
  const closed = poll.closedAt !== null;
  const hasVoted = poll.options.some((o) => o.votedByMe);
  const showResults = hasVoted || closed;

  const handleClick = (optionId: string) => {
    if (disabled || closed) {
      return;
    }

    if (poll.multiple) {
      const selected = new Set(poll.options.filter((o) => o.votedByMe).map((o) => o.id));

      if (selected.has(optionId)) {
        selected.delete(optionId);
      } else {
        selected.add(optionId);
      }

      onVote([...selected]);
    } else {
      onVote([optionId]);
    }
  };

  return (
    <div className="w-72 max-w-full space-y-2 rounded-lg border border-border bg-card/60 p-3">
      <p className="text-sm font-medium">{poll.question}</p>

      <ul className="space-y-1.5">
        {poll.options.map((option) => {
          const pct =
            poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;

          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => handleClick(option.id)}
                disabled={disabled || closed}
                className={cn(
                  'relative w-full overflow-hidden rounded-md border px-2.5 py-1.5 text-start text-sm transition-colors',
                  option.votedByMe ? 'border-foreground/40' : 'border-border',
                  !disabled && !closed && 'hover:border-foreground/40',
                )}
              >
                {showResults ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 start-0 bg-foreground/10"
                    style={{ width: `${pct}%` }}
                  />
                ) : null}

                <span className="relative flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    {option.votedByMe ? <Check className="h-3.5 w-3.5" /> : null}
                    {option.text}
                  </span>
                  {showResults ? (
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        {t('poll.votes', { count: poll.totalVotes })}
        {closed ? ` · ${t('poll.closed')}` : ''}
      </p>
    </div>
  );
}
