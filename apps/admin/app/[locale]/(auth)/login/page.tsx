import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AppLogo } from '@/components/branding/app-logo';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { AdminGuestGuard } from '@/features/auth/components/admin-guest-guard';
import { AdminLoginForm } from '@/features/auth/components/admin-login-form';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Admin sign in · Open Meet',
};

export default async function AdminLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations('auth');

  return (
    <AdminGuestGuard>
      <main className="relative flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
        <div className="absolute end-4 top-4">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-tight">
            <AppLogo className="h-7 w-7" />
            <span>Open Meet</span>
          </div>

          <div className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm">
            <header className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">{t('login.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
            </header>

            <AdminLoginForm />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t('login.user-app-prompt')}{' '}
            <a href={env.NEXT_PUBLIC_WEB_URL} className="underline hover:text-foreground">
              {t('login.go-to-open-meet')}
            </a>
          </p>
        </div>
      </main>
    </AdminGuestGuard>
  );
}
