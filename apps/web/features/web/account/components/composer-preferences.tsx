'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { UserSettingsDto } from '@open-meet/types';
import { ComposerMode, DEFAULT_COMPOSER_PREFERENCES } from '@open-meet/types';

import { Label } from '@open-meet/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-meet/ui/select';

import { useUpdateUserSettings } from '@/features/web/account/hooks/use-settings';
import { ApiClientError } from '@/lib/api/client';

import { FormActions } from './form-actions';

const schema = z.object({
  composerMode: z.enum([ComposerMode.NORMAL, ComposerMode.MARKDOWN, ComposerMode.WYSIWYG]),
});

type Values = z.infer<typeof schema>;

export function ComposerPreferences({ settings }: { settings: UserSettingsDto | undefined }) {
  const t = useTranslations('account');
  const updateSettings = useUpdateUserSettings();

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: settings?.composerPreferences ?? DEFAULT_COMPOSER_PREFERENCES,
  });

  useEffect(() => {
    reset(settings?.composerPreferences ?? DEFAULT_COMPOSER_PREFERENCES);
  }, [settings, reset]);

  const values = watch();
  const pending = isSubmitting || updateSettings.isPending;

  const onSubmit = handleSubmit(async (v) => {
    try {
      await updateSettings.mutateAsync({ composerPreferences: v });
      toast.success(t('toast.preferences-updated'));
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : t('toast.preferences-update-failed'),
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">{t('composer.mode-title')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('composer.mode-description')}</p>
        </div>
        <div className="w-44 shrink-0 pt-0.5">
          <Label className="sr-only">{t('composer.mode-title')}</Label>
          <Select
            value={values.composerMode}
            onValueChange={(v) =>
              setValue('composerMode', v as ComposerMode, { shouldDirty: true })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ComposerMode.NORMAL}>{t('composer.mode-normal')}</SelectItem>
              <SelectItem value={ComposerMode.MARKDOWN}>{t('composer.mode-markdown')}</SelectItem>
              <SelectItem value={ComposerMode.WYSIWYG}>{t('composer.mode-wysiwyg')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <FormActions
        pending={pending}
        dirty={isDirty}
        onReset={() => reset(settings?.composerPreferences ?? DEFAULT_COMPOSER_PREFERENCES)}
      />
    </form>
  );
}
