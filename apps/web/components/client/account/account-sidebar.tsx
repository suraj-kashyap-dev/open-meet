'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/client/use-auth';
import { cn } from '@/lib/shared/cn';

import { accountNav, isAccountActive } from './nav-config';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function AccountSidebar() {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();

  return (
    <aside className="flex shrink-0 flex-col gap-4 border-b border-border bg-card p-4 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-72 lg:border-b-0 lg:border-r lg:overflow-y-auto">
      {user ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-accent/15 text-sm font-semibold text-accent">
              {initialsOf(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ) : null}

      <nav>
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Account
        </p>
        <ul className="space-y-0.5">
          {accountNav.map((item) => {
            const Icon = item.icon;
            const active = isAccountActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-start gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                    active
                      ? 'bg-accent/10 font-medium text-accent'
                      : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex flex-col">
                    <span>{item.label}</span>
                    {item.description ? (
                      <span
                        className={cn(
                          'text-xs',
                          active ? 'text-accent/80' : 'text-muted-foreground',
                        )}
                      >
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
