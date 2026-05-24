'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { UserSettingsDto } from '@open-meet/types';
import { DEFAULT_PRIVACY_SETTINGS, ProfileVisibility } from '@open-meet/types';

import { Label } from '@open-meet/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-meet/ui/select';
import { Switch } from '@open-meet/ui/switch';
import { useUpdateUserSettings } from '@/features/web/account/hooks/use-settings';
import { ApiClientError } from '@/lib/api/client';

import { FormActions } from './form-actions';

const schema = z.object({
  showEmailToParticipants: z.boolean(),
  allowDirectMessages: z.boolean(),
  profileVisibility: z.enum([
    ProfileVisibility.PUBLIC,
    ProfileVisibility.PARTICIPANTS_ONLY,
    ProfileVisibility.PRIVATE,
  ]),
  shareUsageData: z.boolean(),
});

type Values = z.infer<typeof schema>;

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export function PrivacySettings({ settings }: { settings: UserSettingsDto | undefined }) {
  const t = useTranslations('account');
  const updateSettings = useUpdateUserSettings();

  const current = settings?.privacySettings ?? DEFAULT_PRIVACY_SETTINGS;

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: current,
  });

  useEffect(() => {
    reset(settings?.privacySettings ?? DEFAULT_PRIVACY_SETTINGS);
  }, [settings, reset]);

  const values = watch();
  const pending = isSubmitting || updateSettings.isPending;

  const onSubmit = handleSubmit(async (v) => {
    try {
      await updateSettings.mutateAsync({ privacySettings: v });
      toast.success(t('toast.privacy-updated'));
    } catch (err) {
      toast.error(messageFromError(err, t('toast.privacy-update-failed')));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Row
        title={t('preferences.visibility-title')}
        description={t('preferences.visibility-description')}
      >
        <div className="w-56">
          <Label className="sr-only">{t('preferences.visibility-title')}</Label>

          <Select
            value={values.profileVisibility}
            onValueChange={(v) =>
              setValue('profileVisibility', v as ProfileVisibility, {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value={ProfileVisibility.PUBLIC}>
                {t('preferences.visibility-public')}
              </SelectItem>

              <SelectItem value={ProfileVisibility.PARTICIPANTS_ONLY}>
                {t('preferences.visibility-participants')}
              </SelectItem>

              <SelectItem value={ProfileVisibility.PRIVATE}>
                {t('preferences.visibility-private')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Row>

      <Row
        title={t('preferences.show-email-title')}
        description={t('preferences.show-email-description')}
      >
        <Switch
          checked={values.showEmailToParticipants}
          onCheckedChange={(c) => setValue('showEmailToParticipants', c, { shouldDirty: true })}
        />
      </Row>

      <Row
        title={t('preferences.direct-messages-title')}
        description={t('preferences.direct-messages-description')}
      >
        <Switch
          checked={values.allowDirectMessages}
          onCheckedChange={(c) => setValue('allowDirectMessages', c, { shouldDirty: true })}
        />
      </Row>

      <Row
        title={t('preferences.usage-data-title')}
        description={t('preferences.usage-data-description')}
      >
        <Switch
          checked={values.shareUsageData}
          onCheckedChange={(c) => setValue('shareUsageData', c, { shouldDirty: true })}
        />
      </Row>

      <FormActions
        pending={pending}
        dirty={isDirty}
        onReset={() => reset(settings?.privacySettings ?? DEFAULT_PRIVACY_SETTINGS)}
      />
    </form>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{title}</p>

        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}
