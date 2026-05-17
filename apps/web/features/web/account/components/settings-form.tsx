'use client';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { useUserSettings } from '@/features/web/account/hooks/use-settings';

import { LocalizationSettings } from './localization-settings';
import { MeetingPreferences } from './meeting-preferences';
import { PageHeader, SectionCard } from './section';
import { PrivacySettings } from './privacy-settings';

export function SettingsForm() {
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
        eyebrow="Account"
        title="Settings"
        description="Defaults for meetings, what others can see, and your language."
      />

      <SectionCard
        title="Localization"
        description="Used for meeting times, dates, and the UI language."
      >
        <LocalizationSettings user={user} />
      </SectionCard>

      <SectionCard
        title="Meeting defaults"
        description="What happens when you start or join a meeting."
      >
        {settingsLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <MeetingPreferences settings={settings} />
        )}
      </SectionCard>

      <SectionCard title="Privacy" description="Control what others see and how your data is used.">
        {settingsLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (
          <PrivacySettings settings={settings} />
        )}
      </SectionCard>
    </div>
  );
}
