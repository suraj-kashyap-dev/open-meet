'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/shared/logo';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useCurrentAdmin } from '@/features/admin/auth/hooks/use-admin-auth';
import { cn } from '@/lib/cn';

import { adminNav, isActive } from './admin-nav-config';

/**
 * The full inner content of the admin sidebar — brand, navigation, and the
 * account footer. Shared by the fixed desktop rail (`AdminSidebar`) and the
 * mobile sheet so the two never drift apart. Pass `onNavigate` on mobile to
 * close the sheet after a link is followed.
 */
export function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: admin } = useCurrentAdmin();

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Logo className="h-8 w-8 shrink-0" />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-sm font-semibold tracking-tight">Open Meet</span>
            <span className="truncate pt-1 text-[11px] font-medium text-muted-foreground">
              Admin console
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {adminNav.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {section.label}
            </p>

            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);

                const badge = item.badge ? (
                  <span
                    className={cn(
                      'ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      active
                        ? 'bg-accent-foreground/20 text-accent-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null;

                if (item.disabled) {
                  return (
                    <li key={item.href}>
                      <span
                        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
                        aria-disabled
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {badge}
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
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent',
                        active
                          ? 'bg-accent text-accent-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-colors',
                          active
                            ? 'text-accent-foreground'
                            : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {badge}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        <Link
          href="/"
          target="_blank"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          Visit Open Meet
        </Link>

        {admin ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-2.5 py-2">
            <UserAvatar user={admin} size="sm" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{admin.name}</p>
              <p className="truncate pt-0.5 text-[11px] text-muted-foreground">
                {admin.role === 'SUPERADMIN' ? 'Super admin' : 'Admin'}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
