'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/shared/logo';
import { cn } from '@/lib/shared/cn';

import { adminNav, isActive } from './nav-config';

interface Props {
  open: boolean;
}

export function AdminSidebar({ open }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden w-64 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200 ease-out lg:flex',
        open ? 'translate-x-0' : '-translate-x-full pointer-events-none',
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo className="h-7 w-7" />
          <span>Open Meet</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {adminNav.map((section) => (
            <div key={section.label} className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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
                          className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground/60"
                          aria-disabled
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                          {item.badge ? (
                            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                              {item.badge}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors',
                          active
                            ? 'bg-accent/10 font-medium text-accent'
                            : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                        {item.badge ? (
                          <span className="ml-auto rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-accent">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
