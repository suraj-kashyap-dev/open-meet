import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { Link } from '@/i18n/navigation';
import { RegisterForm } from '@/features/web/auth/components/register-form';
import { REDIRECT_PARAM, resolveRedirect } from '@/features/web/auth/lib/redirect';
import { Logo } from '@open-meet/ui/logo';

export const metadata: Metadata = {
  title: 'Create account · Open Meet',
};

export default async function RegisterPage({
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
  const loginQuery = target === '/' ? undefined : { [REDIRECT_PARAM]: target };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Logo className="h-7 w-7" />
        <span>Open Meet</span>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{t('register.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('register.subtitle')}</p>
        </header>

        <Suspense fallback={null}>
          <RegisterForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t('register.have-account')}{' '}
        <Link
          href={{ pathname: '/login', query: loginQuery }}
          className="underline hover:text-foreground"
        >
          {t('register.sign-in')}
        </Link>
      </p>
    </div>
  );
}
