'use client';

import { Check, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@open-meet/ui/cn';
import { Input } from '@open-meet/ui/input';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { useAdminUsers } from '@/features/users/hooks/use-admin-users';

interface MemberOption {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export function MemberMultiSelect({
  selectedIds,
  onSelectedIdsChange,
  initialSelectedUsers = [],
  searchPlaceholder,
  emptyLabel,
  removeLabel,
}: {
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  initialSelectedUsers?: MemberOption[];
  searchPlaceholder: string;
  emptyLabel: string;
  removeLabel: string;
}) {
  const [search, setSearch] = useState('');
  const [userCache, setUserCache] = useState<Record<string, MemberOption>>({});
  const { data, isLoading } = useAdminUsers({ page: 1, pageSize: 50, search: search.trim() || undefined });

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const queryUsers = useMemo<MemberOption[]>(
    () =>
      (data?.items ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      })),
    [data?.items],
  );

  useEffect(() => {
    const merged = [...initialSelectedUsers, ...queryUsers];

    if (merged.length === 0) {
      return;
    }

    setUserCache((current) => {
      let changed = false;
      const next = { ...current };

      for (const user of merged) {
        const existing = current[user.id];

        if (
          !existing ||
          existing.name !== user.name ||
          existing.email !== user.email ||
          existing.avatar !== user.avatar
        ) {
          next[user.id] = user;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [initialSelectedUsers, queryUsers]);

  const selectedUsers = selectedIds
    .map((id) => userCache[id])
    .filter((user): user is MemberOption => Boolean(user));

  const toggle = (id: string) => {
    const next = new Set(selectedSet);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    onSelectedIdsChange([...next]);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card/60 p-3">
        <div className="relative">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="ps-9"
          />
        </div>

        {selectedUsers.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <li
                key={user.id}
                className="flex items-center gap-2 rounded-full border border-border bg-muted/60 py-1 pe-2 ps-1.5 text-sm"
              >
                <UserAvatar user={user} size="xs" />
                <span className="max-w-40 truncate font-medium">{user.name}</span>
                <button
                  type="button"
                  onClick={() => toggle(user.id)}
                  aria-label={removeLabel}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <ul className="max-h-80 space-y-0.5 overflow-y-auto rounded-xl border border-border bg-card/60 p-2">
        {isLoading ? (
          <li className="py-6 text-center text-xs text-muted-foreground">Loading…</li>
        ) : queryUsers.length === 0 ? (
          <li className="py-6 text-center text-xs text-muted-foreground">{emptyLabel}</li>
        ) : (
          queryUsers.map((user) => {
            const isSelected = selectedSet.has(user.id);

            return (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => toggle(user.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition-colors hover:bg-muted',
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
