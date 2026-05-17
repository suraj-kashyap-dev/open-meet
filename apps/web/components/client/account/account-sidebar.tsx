'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { UserAvatar } from '@/components/shared/user-avatar';
import { useCurrentUser } from '@/hooks/client/use-auth';
import { cn } from '@/lib/shared/cn';

import { accountNav, isAccountActive } from './nav-config';

export function AccountSidebar() {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();

  return (
    <aside className="shrink-0 lg:w-64 xl:w-72">
      <div className="lg:sticky lg:top-[4.5rem] flex flex-col gap-4">
        {user ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <UserAvatar user={user} size="xl" className="ring-2 ring-background" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        ) : null}

        <nav className="rounded-2xl border border-border bg-card p-2 shadow-sm">
          <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Account
          </p>
          <ul className="flex flex-col gap-0.5">
            {accountNav.map((item) => {
              const Icon = item.icon;
              const active = isAccountActive(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                      active
                        ? 'bg-accent/10 text-accent'
                        : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                        active
                          ? 'bg-accent/15 text-accent'
                          : 'bg-muted text-muted-foreground group-hover:bg-background',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cn('truncate font-medium', active ? '' : 'text-foreground')}>
                        {item.label}
                      </span>
                      {item.description ? (
                        <span
                          className={cn(
                            'truncate text-xs',
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
      </div>
    </aside>
  );
}
