'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@open-meet/ui/button';
import { Link } from '@/i18n/navigation';

interface Props {
  eyebrowKey?: string;
  titleKey: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSubpageShell({
  eyebrowKey = 'eyebrow',
  titleKey,
  description,
  children,
}: Props) {
  const t = useTranslations('configuration');

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t(eyebrowKey)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t(titleKey)}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </header>

        <Button
          variant="ghost"
          size="sm"
          asChild
          className="w-fit gap-2 px-0 hover:bg-transparent"
        >
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
            {t('eyebrow')}
          </Link>
        </Button>
      </div>

      {children}
    </main>
  );
}
