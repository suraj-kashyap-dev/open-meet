'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { UserSettingsDto } from '@open-meet/types';
import {
  DEFAULT_MEETING_PREFERENCES,
  MeetingDefaultView,
} from '@open-meet/types';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUpdateUserSettings } from '@/hooks/client/use-settings';
import { ApiClientError } from '@/lib/shared/api';

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

export function MeetingPreferences({
  settings,
}: {
  settings: UserSettingsDto | undefined;
}) {
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
      toast.success('Meeting preferences updated');
    } catch (err) {
      toast.error(messageFromError(err, 'Failed to update preferences'));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>

      <Row
        title="Join muted by default"
        description="Start every meeting with your microphone off."
      >
        <Switch
          checked={values.defaultMicMuted}
          onCheckedChange={(c) => setValue('defaultMicMuted', c, { shouldDirty: true })}
        />
      </Row>

      <Row
        title="Camera off by default"
        description="Keep your camera off until you turn it on."
      >
        <Switch
          checked={values.defaultCameraOff}
          onCheckedChange={(c) => setValue('defaultCameraOff', c, { shouldDirty: true })}
        />
      </Row>

      <Row
        title="Default view"
        description="Gallery shows everyone; speaker focuses the active talker."
      >
        <div className="w-44">
          <Label className="sr-only">Default view</Label>

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
              <SelectItem value={MeetingDefaultView.GALLERY}>Gallery</SelectItem>

              <SelectItem value={MeetingDefaultView.SPEAKER}>Speaker</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Row>

      <Row
        title="Join sound"
        description="Hear a soft chime when someone joins."
      >
        <Switch
          checked={values.enableJoinSound}
          onCheckedChange={(c) => setValue('enableJoinSound', c, { shouldDirty: true })}
        />
      </Row>

      <Row
        title="Browser notifications"
        description="Get notified about chat, reactions, and invites."
      >
        <Switch
          checked={values.enableNotifications}
          onCheckedChange={(c) => setValue('enableNotifications', c, { shouldDirty: true })}
        />
      </Row>

      <FormActions
        pending={pending}
        dirty={isDirty}
        onReset={() =>
          reset(settings?.meetingPreferences ?? DEFAULT_MEETING_PREFERENCES)
        }
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
