'use client';

import { useTranslations } from 'next-intl';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { useUserSettings } from '@/features/web/account/hooks/use-settings';

import { LocalizationSettings } from './localization-settings';
import { MeetingPreferences } from './meeting-preferences';
import { PageHeader, SectionCard } from './section';
import { PrivacySettings } from './privacy-settings';

export function SettingsForm() {
  const t = useTranslations('account');
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: settings, isLoading: settingsLoading } = useUserSettings();

  if (userLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        description={t('settings.description')}
      />

      <SectionCard
        title={t('settings.localization-title')}
        description={t('settings.localization-description')}
      >
        <LocalizationSettings user={user} />
      </SectionCard>

      <SectionCard
        title={t('settings.defaults-title')}
        description={t('settings.defaults-description')}
      >
        {settingsLoading ? (
          <p className="text-xs text-muted-foreground">{t('settings.loading')}</p>
        ) : (
          <MeetingPreferences settings={settings} />
        )}
      </SectionCard>

      <SectionCard
        title={t('settings.privacy-title')}
        description={t('settings.privacy-description')}
      >
        {settingsLoading ? (
          <p className="text-xs text-muted-foreground">{t('settings.loading')}</p>
        ) : (
          <PrivacySettings settings={settings} />
        )}
      </SectionCard>
    </div>
  );
}
