'use client';

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/shared/logo';
import { cn } from '@/lib/shared/cn';

import { adminNav, isActive } from './nav-config';

export function AdminSidebarMobile({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
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
                        <span className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground/60">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                          active
                            ? 'bg-accent/10 font-medium text-accent'
                            : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
