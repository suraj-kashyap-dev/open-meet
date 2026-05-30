'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { ThemeToggle } from '@open-meet/ui/theme-toggle';

import type { UserSettingsDto } from '@open-meet/types';

import { AccentPicker } from '@/components/web/theme/accent-picker';
import { useBranding } from '@/components/web/branding/branding-provider';
import { useUpdateUserSettings } from '@/features/web/account/hooks/use-settings';

export function AppearanceSettings({ settings }: { settings: UserSettingsDto | undefined }) {
  const t = useTranslations('account');
  const { theme, setTheme } = useTheme();
  const branding = useBranding();
  const update = useUpdateUserSettings();

  const accentOverride = settings?.appearance?.accentColorOverride ?? null;

  const setAccent = (value: string | null) => {
    update.mutate({ appearance: { accentColorOverride: value } });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{t('appearance.theme-label')}</p>
          <p className="text-xs text-muted-foreground">{t('appearance.theme-hint')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{theme === 'dark' ? t('appearance.dark') : t('appearance.light')}</span>
          <ThemeToggle />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">{t('appearance.accent-label')}</p>
        <p className="mb-3 text-xs text-muted-foreground">{t('appearance.accent-hint')}</p>
        <AccentPicker
          value={accentOverride}
          workspaceDefault={branding.accentColor}
          onChange={(value) => setAccent(value)}
          onReset={() => setAccent(null)}
        />
        {accentOverride === null ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t('appearance.using-workspace')}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="hidden"
      >
        toggle
      </button>
    </div>
  );
}
