import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Logo } from '@open-meet/ui/logo';

import { LanguageSwitcher } from '@/components/language-switcher';
import { AdminLoginForm } from '@/features/auth/components/admin-login-form';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Admin sign in · Open Meet',
};

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Logo className="h-7 w-7" />
            <span>Open Meet</span>
          </div>
          <LanguageSwitcher />
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
  );
}
