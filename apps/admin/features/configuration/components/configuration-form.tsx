'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@open-meet/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@open-meet/ui/card';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { Switch } from '@open-meet/ui/switch';

import {
  useUpdateWorkspaceConfig,
  useWorkspaceConfig,
} from '@/features/configuration/hooks/use-configuration';
import { ApiClientError } from '@/lib/api/client';

export function ConfigurationForm() {
  const t = useTranslations('configuration');
  const { data, isLoading } = useWorkspaceConfig();
  const update = useUpdateWorkspaceConfig();

  const schema = useMemo(
    () =>
      z.object({
        defaultMeetingTitle: z
          .string()
          .trim()
          .min(1, t('form.title-required'))
          .max(120, t('form.title-too-long')),
        allowGuestJoin: z.boolean(),
        maxMeetingMinutes: z
          .string()
          .refine(
            (v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 5 && Number(v) <= 1440),
            t('form.duration-range'),
          ),
      }),
    [t],
  );

  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      defaultMeetingTitle: data?.defaultMeetingTitle ?? '',
      allowGuestJoin: data?.allowGuestJoin ?? true,
      maxMeetingMinutes: data?.maxMeetingMinutes != null ? String(data.maxMeetingMinutes) : '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        defaultMeetingTitle: values.defaultMeetingTitle,
        allowGuestJoin: values.allowGuestJoin,
        maxMeetingMinutes:
          values.maxMeetingMinutes === '' ? null : Number(values.maxMeetingMinutes),
      });
      toast.success(t('form.saved'));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('form.error'));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.title')}</CardTitle>
        <CardDescription>{t('form.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="defaultMeetingTitle">{t('form.default-title-label')}</Label>
            <Input
              id="defaultMeetingTitle"
              maxLength={120}
              disabled={isLoading}
              {...form.register('defaultMeetingTitle')}
            />
            <p className="text-xs text-muted-foreground">{t('form.default-title-help')}</p>
            {form.formState.errors.defaultMeetingTitle ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.defaultMeetingTitle.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="allowGuestJoin">{t('form.allow-guests-label')}</Label>
              <p className="text-xs text-muted-foreground">{t('form.allow-guests-help')}</p>
            </div>
            <Controller
              control={form.control}
              name="allowGuestJoin"
              render={({ field }) => (
                <Switch
                  id="allowGuestJoin"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isLoading}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxMeetingMinutes">{t('form.max-duration-label')}</Label>
            <Input
              id="maxMeetingMinutes"
              inputMode="numeric"
              placeholder={t('form.max-duration-placeholder')}
              disabled={isLoading}
              className="max-w-40"
              {...form.register('maxMeetingMinutes')}
            />
            <p className="text-xs text-muted-foreground">{t('form.max-duration-help')}</p>
            {form.formState.errors.maxMeetingMinutes ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.maxMeetingMinutes.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={update.isPending || isLoading} className="gap-2">
            {update.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('form.saving')}
              </>
            ) : (
              t('form.save')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
