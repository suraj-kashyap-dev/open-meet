'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { UserSettingsDto } from '@open-meet/types';
import { DEFAULT_MEETING_PREFERENCES, MeetingDefaultView } from '@open-meet/types';

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
import { ensureNotificationPermission, notificationsSupported } from '@/lib/notifications';
import { playSound } from '@/lib/sounds';
import { Button } from '@open-meet/ui/button';
import { Volume2 } from 'lucide-react';

import { FormActions } from './form-actions';

const schema = z.object({
  defaultMicMuted: z.boolean(),
  defaultCameraOff: z.boolean(),
  defaultView: z.enum([MeetingDefaultView.GALLERY, MeetingDefaultView.SPEAKER]),
  enableJoinSound: z.boolean(),
  enableNotifications: z.boolean(),
});

type Values = z.infer<typeof schema>;

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export function MeetingPreferences({ settings }: { settings: UserSettingsDto | undefined }) {
  const t = useTranslations('account');
  const updateSettings = useUpdateUserSettings();

  const current = settings?.meetingPreferences ?? DEFAULT_MEETING_PREFERENCES;

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
    reset(settings?.meetingPreferences ?? DEFAULT_MEETING_PREFERENCES);
  }, [settings, reset]);

  const values = watch();
  const pending = isSubmitting || updateSettings.isPending;

  const onSubmit = handleSubmit(async (v) => {
    try {
      await updateSettings.mutateAsync({ meetingPreferences: v });
      toast.success(t('toast.preferences-updated'));
    } catch (err) {
      toast.error(messageFromError(err, t('toast.preferences-update-failed')));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Row
        title={t('preferences.mic-muted-title')}
        description={t('preferences.mic-muted-description')}
      >
        <Switch
          checked={values.defaultMicMuted}
          onCheckedChange={(c) => setValue('defaultMicMuted', c, { shouldDirty: true })}
        />
      </Row>

      <Row
        title={t('preferences.camera-off-title')}
        description={t('preferences.camera-off-description')}
      >
        <Switch
          checked={values.defaultCameraOff}
          onCheckedChange={(c) => setValue('defaultCameraOff', c, { shouldDirty: true })}
        />
      </Row>

      <Row
        title={t('preferences.default-view-title')}
        description={t('preferences.default-view-description')}
      >
        <div className="w-44">
          <Label className="sr-only">{t('preferences.default-view-title')}</Label>

          <Select
            value={values.defaultView}
            onValueChange={(v) =>
              setValue('defaultView', v as MeetingDefaultView, { shouldDirty: true })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value={MeetingDefaultView.GALLERY}>
                {t('preferences.view-gallery')}
              </SelectItem>

              <SelectItem value={MeetingDefaultView.SPEAKER}>
                {t('preferences.view-speaker')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Row>

      <Row title={t('preferences.sounds-title')} description={t('preferences.sounds-description')}>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('preferences.preview-sound')}
            onClick={() => void playSound('join')}
            disabled={!values.enableJoinSound}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
          <Switch
            checked={values.enableJoinSound}
            onCheckedChange={(c) => setValue('enableJoinSound', c, { shouldDirty: true })}
          />
        </div>
      </Row>

      <Row
        title={t('preferences.notifications-title')}
        description={t('preferences.notifications-description')}
      >
        <Switch
          checked={values.enableNotifications}
          onCheckedChange={async (c) => {
            if (c) {
              if (!notificationsSupported()) {
                toast.error(t('toast.notifications-unsupported'));
                return;
              }
              const permission = await ensureNotificationPermission();
              if (permission !== 'granted') {
                toast.error(t('toast.notifications-denied'));
                return;
              }
            }
            setValue('enableNotifications', c, { shouldDirty: true });
          }}
        />
      </Row>

      <FormActions
        pending={pending}
        dirty={isDirty}
        onReset={() => reset(settings?.meetingPreferences ?? DEFAULT_MEETING_PREFERENCES)}
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
