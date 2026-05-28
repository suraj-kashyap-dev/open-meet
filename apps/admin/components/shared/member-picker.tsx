'use client';

import { Check, Search } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@open-meet/ui/cn';
import { Input } from '@open-meet/ui/input';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { useAdminUsers } from '@/features/users/hooks/use-admin-users';

/**
 * Inline user multi-select for adding members to a team or group. Rendered
 * directly inside the owning dialog (NOT its own modal) so it never stacks a
 * second Radix dialog over the parent. Selection is controlled by the parent.
 */
export function MemberPicker({
  selected,
  onSelectedChange,
  excludeIds = [],
  searchPlaceholder,
  emptyLabel,
}: {
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  excludeIds?: string[];
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  const [search, setSearch] = useState('');
  const { data } = useAdminUsers({ page: 1, pageSize: 50, search: search.trim() || undefined });

  const excluded = new Set(excludeIds);
  const selectedSet = new Set(selected);
  const users = (data?.items ?? []).filter((u) => !excluded.has(u.id));

  const toggle = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectedChange([...next]);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="ps-9"
        />
      </div>

      <ul className="max-h-60 space-y-0.5 overflow-y-auto">
        {users.length === 0 ? (
          <li className="py-6 text-center text-xs text-muted-foreground">{emptyLabel}</li>
        ) : (
          users.map((user) => {
            const isSelected = selectedSet.has(user.id);
            return (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => toggle(user.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2 py-2 text-start transition-colors hover:bg-muted',
                    isSelected && 'bg-muted',
                  )}
                >
                  <UserAvatar user={user} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full border',
                      isSelected
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border',
                    )}
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : null}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
