'use client';

import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Input } from '@open-meet/ui/input';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { useAdminUsers } from '@/features/users/hooks/use-admin-users';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const PAGE_SIZE = 20;

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const [userCache, setUserCache] = useState<Record<string, MemberOption>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const showDropdown = open && search.trim().length > 0;
  const isSearchPending = showDropdown && search.trim() !== debouncedSearch;

  const { data, isFetching } = useAdminUsers(
    { page: 1, pageSize: PAGE_SIZE, search: debouncedSearch },
    { enabled: showDropdown && debouncedSearch.length > 0 },
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const results = useMemo<MemberOption[]>(
    () =>
      Array.from(new Map((data?.items ?? []).map((user) => [user.id, user])).values()).map(
        (user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        }),
      ),
    [data?.items],
  );
  const availableResults = results.filter((user) => !selectedSet.has(user.id));

  useEffect(() => {
    const merged = [...initialSelectedUsers, ...results];

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
  }, [initialSelectedUsers, results]);

  useEffect(() => {
    if (!showDropdown) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);

    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [showDropdown]);

  const selectedUsers = Array.from(new Set(selectedIds))
    .map((id) => userCache[id])
    .filter((user): user is MemberOption => Boolean(user));

  const toggle = (id: string) => {
    const next = new Set(selectedSet);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    onSelectedIdsChange(Array.from(next));
  };

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative">
        <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);

            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={searchPlaceholder}
          className="ps-9 pe-9"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute end-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {showDropdown ? (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
            <ul className="max-h-64 overflow-y-auto p-1">
              {(isSearchPending || isFetching) && availableResults.length === 0 ? (
                <li className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </li>
              ) : availableResults.length === 0 ? (
                <li className="py-6 text-center text-xs text-muted-foreground">{emptyLabel}</li>
              ) : (
                availableResults.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => toggle(user.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <UserAvatar user={user} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{user.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>

      {selectedUsers.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {selectedUsers.map((user) => (
            <li key={user.id} className="flex items-center gap-3 px-3 py-2">
              <UserAvatar user={user} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              <button
                type="button"
                onClick={() => toggle(user.id)}
                aria-label={removeLabel}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
