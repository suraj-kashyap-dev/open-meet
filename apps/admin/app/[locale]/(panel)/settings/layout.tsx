import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { SettingsTabs } from '@/components/settings/tabs';

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tNav = await getTranslations('nav');

  const tConfig = await getTranslations('configuration');

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.5rem)]">
      <div className="shrink-0 px-4 pt-8 sm:px-6 lg:px-8">
        <div className="w-full space-y-6">
          <header className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {tConfig('eyebrow')}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {tNav('items.settings')}
            </h1>
            <p className="text-sm text-muted-foreground">{tConfig('description')}</p>
          </header>

          <SettingsTabs />
        </div>
      </div>

      <div className="px-4 pb-12 pt-6 sm:px-6 lg:flex-1 lg:overflow-y-auto lg:px-8">
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
