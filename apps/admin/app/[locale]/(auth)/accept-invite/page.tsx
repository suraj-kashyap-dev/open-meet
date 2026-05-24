import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { Logo } from '@open-meet/ui/logo';

import { AcceptInviteForm } from '@/features/accounts/components/accept-invite-form';

export const metadata: Metadata = {
  title: 'Accept invite · Open Meet Admin',
};

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('accept-invite');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo className="h-7 w-7" />
          <span>Open Meet</span>
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm">
          <header className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
          </header>

          <Suspense fallback={null}>
            <AcceptInviteForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
