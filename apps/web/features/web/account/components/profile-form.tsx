'use client';

import { useTranslations } from 'next-intl';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';

import { AvatarUploader } from './avatar-uploader';
import { PageHeader, SectionCard } from './section';
import { PasswordForm } from './password-form';
import { ProfileEditForm } from './profile-edit-form';

export function ProfileForm() {
  const t = useTranslations('account');
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
      />

      <SectionCard title={t('profile.image-title')} description={t('profile.image-description')}>
        <AvatarUploader user={user} />
      </SectionCard>

      <SectionCard
        title={t('profile.personal-title')}
        description={t('profile.personal-description')}
      >
        <ProfileEditForm user={user} />
      </SectionCard>

      <SectionCard
        title={t('profile.password-title')}
        description={t('profile.password-description')}
      >
        <PasswordForm />
      </SectionCard>
    </div>
  );
}
