'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { CreateRoleDto } from '@open-meet/types';
import { Button } from '@open-meet/ui/button';

import { RoleForm } from '@/features/rbac/components/role-form';
import { useCreateAdminRole } from '@/features/rbac/hooks/use-admin-roles';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

export function CreateRolePage() {
  const t = useTranslations('rbac');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const create = useCreateAdminRole();

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t('eyebrow')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('create.title')}</h1>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            form="role-form"
            variant="accent"
            disabled={create.isPending}
            className="min-w-32 gap-2"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('create.submit')}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/roles">{tCommon('back')}</Link>
          </Button>
        </div>
      </div>

      <RoleForm
        id="role-form"
        onSubmit={async (input) => {
          const body = input as CreateRoleDto;

          try {
            const role = await create.mutateAsync(body);

            toast.success(t('create.success'));

            router.replace(`/roles/${role.id}`);
          } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : t('create.error'));
          }
        }}
      />
    </main>
  );
}
