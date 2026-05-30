'use client';

import type { TeammateDto } from '@open-meet/types';
import { Search, X } from 'lucide-react';

import { cn } from '@open-meet/ui/cn';
import { Input } from '@open-meet/ui/input';
import { UserAvatar } from '@open-meet/ui/user-avatar';

interface PickedMember {
  id: string;
  name: string;
  avatar: string | null;
}

interface GroupMemberPickerProps {
  search: string;
  onSearchChange: (value: string) => void;
  suggestions: TeammateDto[];
  picked: Record<string, PickedMember>;
  onPick: (member: PickedMember) => void;
  onRemove: (userId: string) => void;
  placeholder: string;
  emptyLabel: string;
  loadingLabel: string;
  autoFocus?: boolean;
  isLoading?: boolean;
}

export function GroupMemberPicker({
  search,
  onSearchChange,
  suggestions,
  picked,
  onPick,
  onRemove,
  placeholder,
  emptyLabel,
  loadingLabel,
  autoFocus = false,
  isLoading = false,
}: GroupMemberPickerProps) {
  const pickedList = Object.values(picked);
  const availableSuggestions = suggestions.filter((member) => !picked[member.id]);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border bg-background transition-shadow focus-within:ring-2 focus-within:ring-ring">
        <div className={cn('relative', pickedList.length > 0 && 'border-b border-border/70')}>
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="border-0 bg-transparent ps-9 pe-9 focus-visible:ring-0"
            autoFocus={autoFocus}
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute end-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {pickedList.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 p-2">
            {pickedList.map((member) => (
              <span
                key={member.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-1.5 py-1 text-xs"
              >
                <UserAvatar user={member} size="xs" />
                <span className="max-w-36 truncate">{member.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(member.id)}
                  aria-label="Remove"
                  className="flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <ul className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card p-1">
        {isLoading ? (
          <li className="px-2 py-3 text-center text-xs text-muted-foreground">{loadingLabel}</li>
        ) : availableSuggestions.length === 0 ? (
          <li className="px-2 py-3 text-center text-xs text-muted-foreground">{emptyLabel}</li>
        ) : (
          availableSuggestions.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                disabled={member.chatDisabled}
                onClick={() =>
                  onPick({
                    id: member.id,
                    name: member.name,
                    avatar: member.avatar,
                  })
                }
                className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-start text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserAvatar user={member} size="xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{member.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {member.email}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
