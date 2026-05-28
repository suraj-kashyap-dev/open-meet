import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { LoginForm } from '@/features/web/auth/components/login-form';
import { BrandLockup } from '@/components/web/branding/brand-lockup';
import { getBranding } from '@/lib/branding';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const { appName, logoUrl } = await getBranding();

  return (
    <div className="w-full max-w-sm">
      <BrandLockup
        appName={appName}
        logoUrl={logoUrl}
        className="mb-8"
        textClassName="text-sm font-semibold tracking-tight"
      />

      <div className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{t('login.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </header>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
