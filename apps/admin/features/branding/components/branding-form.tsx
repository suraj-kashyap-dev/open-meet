'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@open-meet/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@open-meet/ui/card';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';

import { AccentPicker } from '@/components/branding/accent-picker';
import { SettingsSubpageShell } from '@/components/settings/settings-subpage-shell';
import {
  useAdminBranding,
  useRemoveBrandingLogo,
  useUpdateBranding,
  useUpdateBrandingName,
  useUploadBrandingLogo,
} from '@/features/branding/hooks/use-admin-branding';
import { useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

const LOGO_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const NAME_FORM_ID = 'branding-name-form';

export function BrandingForm() {
  const t = useTranslations('branding');
  const { data, isLoading } = useAdminBranding();
  const updateName = useUpdateBrandingName();
  const updateBranding = useUpdateBranding();
  const uploadLogo = useUploadBrandingLogo();
  const removeLogo = useRemoveBrandingLogo();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const schema = useMemo(
    () =>
      z.object({
        appName: z.string().trim().min(1, t('form.name-required')).max(60, t('form.name-too-long')),
      }),
    [t],
  );

  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: { appName: data?.appName ?? '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateName.mutateAsync({ appName: values.appName });
      toast.success(t('form.name-saved'));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('form.error'));
    }
  });

  const onLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) {
      return;
    }

    if (!LOGO_MIMES.includes(file.type)) {
      toast.error(t('form.logo-invalid-type'));
      return;
    }

    if (file.size > LOGO_MAX_BYTES) {
      toast.error(t('form.logo-too-large'));
      return;
    }

    try {
      await uploadLogo.mutateAsync(file);
      toast.success(t('form.logo-saved'));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('form.error'));
    }
  };

  const onRemoveLogo = async () => {
    try {
      await removeLogo.mutateAsync();
      toast.success(t('form.logo-removed'));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('form.error'));
    }
  };

  const onAccentChange = async (next: string) => {
    try {
      await updateBranding.mutateAsync({ accentColor: next });
      toast.success(t('form.accent-saved'));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('form.error'));
    }
  };

  const logoUrl = data?.logoUrl ?? null;
  const accentColor = data?.accentColor ?? 'indigo';

  const saveAction = (
    <Button
      type="submit"
      form={NAME_FORM_ID}
      variant="accent"
      disabled={updateName.isPending || isLoading}
      className="min-w-32 gap-2"
    >
      {updateName.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {updateName.isPending ? t('form.saving') : t('form.save')}
    </Button>
  );

  return (
    <SettingsSubpageShell titleKey="hub.cards.branding.title" actions={saveAction}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('name.title')}</CardTitle>
            <CardDescription>{t('name.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form id={NAME_FORM_ID} onSubmit={onSubmit} className="space-y-1.5">
              <Label htmlFor="appName">{t('name.label')}</Label>
              <Input
                id="appName"
                maxLength={60}
                disabled={isLoading}
                placeholder={t('name.placeholder')}
                {...form.register('appName')}
              />
              {form.formState.errors.appName ? (
                <p className="text-xs text-destructive">{form.formState.errors.appName.message}</p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('logo.title')}</CardTitle>
            <CardDescription>{t('logo.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={t('logo.alt')}
                    className="h-full w-full object-contain p-1.5"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadLogo.isPending}
                  className="gap-2"
                >
                  {uploadLogo.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('form.uploading')}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {logoUrl ? t('logo.replace') : t('logo.upload')}
                    </>
                  )}
                </Button>

                {logoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onRemoveLogo}
                    disabled={removeLogo.isPending}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('logo.remove')}
                  </Button>
                ) : null}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept={LOGO_MIMES.join(',')}
                className="hidden"
                onChange={onLogoChange}
              />
            </div>

            <p className="text-xs text-muted-foreground">{t('logo.hint')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('accent.title')}</CardTitle>
            <CardDescription>{t('accent.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <AccentPicker
              value={accentColor}
              onChange={onAccentChange}
              disabled={isLoading || updateBranding.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </SettingsSubpageShell>
  );
}
