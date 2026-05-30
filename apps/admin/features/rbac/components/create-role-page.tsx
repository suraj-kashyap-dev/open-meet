'use client';

import { ArrowLeft } from 'lucide-react';
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
  const router = useRouter();
  const create = useCreateAdminRole();

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="w-fit gap-2 px-0 hover:bg-transparent">
          <Link href="/roles">
            <ArrowLeft className="h-4 w-4" />
            {t('title.admin-roles')}
          </Link>
        </Button>
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t('eyebrow')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('create.title')}</h1>
        </header>
      </div>

      <RoleForm
        submitLabel={t('create.submit')}
        isSubmitting={create.isPending}
        onSubmit={async (input) => {
          // RoleForm widens to CreateRoleDto | UpdateRoleDto; on the create page
          // we know the name is always present.
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
