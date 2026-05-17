'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { UserSettingsDto } from '@open-meet/types';
import { DEFAULT_PRIVACY_SETTINGS, ProfileVisibility } from '@open-meet/types';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUpdateUserSettings } from '@/features/account/hooks/use-settings';
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

export function PrivacySettings({
  settings,
}: {
  settings: UserSettingsDto | undefined;
}) {
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
      toast.success('Privacy settings updated');
    } catch (err) {
      toast.error(messageFromError(err, 'Failed to update privacy settings'));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>

      <Row
        title="Profile visibility"
        description="Who can see your profile outside of meetings."
      >
        <div className="w-56">
          <Label className="sr-only">Profile visibility</Label>

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
              <SelectItem value={ProfileVisibility.PUBLIC}>Public</SelectItem>

              <SelectItem value={ProfileVisibility.PARTICIPANTS_ONLY}>
                Participants only
              </SelectItem>

              <SelectItem value={ProfileVisibility.PRIVATE}>Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Row>

      <Row
        title="Show email to participants"
        description="Let people in your meetings see your email address."
      >
        <Switch
          checked={values.showEmailToParticipants}
          onCheckedChange={(c) =>
            setValue('showEmailToParticipants', c, { shouldDirty: true })
          }
        />
      </Row>

      <Row
        title="Allow direct messages"
        description="Let others start a 1-1 chat with you outside of meetings."
      >
        <Switch
          checked={values.allowDirectMessages}
          onCheckedChange={(c) =>
            setValue('allowDirectMessages', c, { shouldDirty: true })
          }
        />
      </Row>

      <Row
        title="Share anonymous usage data"
        description="Helps us improve Open Meet. No meeting content is ever shared."
      >
        <Switch
          checked={values.shareUsageData}
          onCheckedChange={(c) => setValue('shareUsageData', c, { shouldDirty: true })}
        />
      </Row>

      <FormActions
        pending={pending}
        dirty={isDirty}
        onReset={() =>
          reset(settings?.privacySettings ?? DEFAULT_PRIVACY_SETTINGS)
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
