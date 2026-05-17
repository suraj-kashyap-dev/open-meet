'use client';

import { ExternalLink, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/shared/logo';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { useAdminLogout, useCurrentAdmin } from '@/features/admin/auth/hooks/use-admin-auth';
import { cn } from '@/lib/cn';

import { adminNav, isActive } from './admin-nav-config';

export function AdminSidebarMobile({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const { data: admin } = useCurrentAdmin();
  const logout = useAdminLogout();

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Logo className="h-7 w-7 shrink-0" />
          <span className="truncate">Open Meet</span>
        </Link>

        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
          <Shield className="h-3 w-3" />
          Admin
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {adminNav.map((section) => (
            <div key={section.label} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {section.label}
              </p>

              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);

                  if (item.disabled) {
                    return (
                      <li key={item.href}>
                        <span
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
                          aria-disabled
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                          active
                            ? 'bg-accent/10 font-semibold text-accent'
                            : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground',
                        )}
                      >
                        {active ? (
                          <span
                            aria-hidden
                            className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
                          />
                        ) : null}

                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            active
                              ? 'text-accent'
                              : 'text-muted-foreground group-hover:text-foreground',
                          )}
                        />

                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="mt-auto border-t border-border p-3">
        <Link
          href="/"
          onClick={onNavigate}
          className="mb-2 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Visit Open Meet
        </Link>

        {admin ? (
          <div className="flex items-center gap-3 rounded-md bg-muted/50 px-2.5 py-2">
            <UserAvatar user={admin} size="sm" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{admin.name}</p>
              <p className="truncate pt-0.5 text-[11px] text-muted-foreground">
                {admin.role === 'SUPERADMIN' ? 'Super admin' : 'Admin'}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
