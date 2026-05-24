import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { Link } from '@/i18n/navigation';
import { LoginForm } from '@/features/web/auth/components/login-form';
import { REDIRECT_PARAM, resolveRedirect } from '@/features/web/auth/lib/redirect';
import { Logo } from '@open-meet/ui/logo';

export const metadata: Metadata = {
  title: 'Sign in · Open Meet',
};

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [REDIRECT_PARAM]?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  const target = resolveRedirect((await searchParams)[REDIRECT_PARAM]);
  const registerQuery =
    target === '/' ? undefined : { [REDIRECT_PARAM]: target };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Logo className="h-7 w-7" />
        <span>Open Meet</span>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{t('login.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </header>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t('login.no-account')}{' '}
        <Link
          href={{ pathname: '/register', query: registerQuery }}
          className="underline hover:text-foreground"
        >
          {t('login.create-one')}
        </Link>
      </p>
    </div>
  );
}
