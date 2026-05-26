'use client';

import { useTranslations } from 'next-intl';

import { useCurrentAdmin } from '@/features/auth/hooks/use-admin-auth';
import { ChangePasswordForm } from '@/features/profile/components/change-password-form';
import { ProfileAccountForm } from '@/features/profile/components/profile-account-form';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { data: admin, isLoading } = useCurrentAdmin();

  return (
    <main className="w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      {isLoading || !admin ? (
        <div className="space-y-6">
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
        </div>
      ) : (
        <div className="space-y-6">
          <ProfileAccountForm admin={admin} />
          <ChangePasswordForm />
        </div>
      )}
    </main>
  );
}
