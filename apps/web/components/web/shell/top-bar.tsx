'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCommandPalette } from '@/components/shared/command-palette-store';
import { PresenceStatusPicker } from '@/features/web/chat/components/presence-status-picker';

import { UserMenu } from './user-menu';

export function TopBar() {
  const t = useTranslations('nav');
  const setOpen = useCommandPalette((s) => s.setOpen);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
      <div className="hidden flex-1 sm:block" />

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full max-w-xl items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span>{t('search-placeholder')}</span>
      </button>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <PresenceStatusPicker />
        <UserMenu />
      </div>
    </header>
  );
}
