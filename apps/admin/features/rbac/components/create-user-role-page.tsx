'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { CreateRoleDto } from '@open-meet/types';
import { Button } from '@open-meet/ui/button';

import { UserRoleForm } from '@/features/rbac/components/user-role-form';
import { useCreateAdminUserRole } from '@/features/rbac/hooks/use-admin-user-roles';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

export function CreateUserRolePage() {
  const t = useTranslations('rbac');
  const router = useRouter();
  const create = useCreateAdminUserRole();

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t('eyebrow')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('create.title')}</h1>
        </header>
        <Button variant="ghost" size="sm" asChild className="w-fit gap-2 px-0 hover:bg-transparent">
          <Link href="/user-roles">
            <ArrowLeft className="h-4 w-4" />
            {t('title.user-roles')}
          </Link>
        </Button>
      </div>

      <UserRoleForm
        submitLabel={t('create.submit')}
        isSubmitting={create.isPending}
        onSubmit={async (input) => {
          try {
            const role = await create.mutateAsync(input as CreateRoleDto);
            toast.success(t('create.success'));
            router.replace(`/user-roles/${role.id}`);
          } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : t('create.error'));
          }
        }}
      />
    </main>
  );
}
