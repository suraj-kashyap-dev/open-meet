'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@open-meet/ui/button';

import { RoleForm } from '@/features/rbac/components/role-form';
import { useAdminRole, useUpdateAdminRole } from '@/features/rbac/hooks/use-admin-roles';
import { Link } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  roleId: string;
}

export function RoleDetailPage({ roleId }: Props) {
  const t = useTranslations('rbac');
  const { data: role, isLoading } = useAdminRole(roleId);
  const update = useUpdateAdminRole();

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t('eyebrow')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {role?.name ?? t('edit.title')}
          </h1>
        </header>
        <Button variant="ghost" size="sm" asChild className="w-fit gap-2 px-0 hover:bg-transparent">
          <Link href="/roles">
            <ArrowLeft className="h-4 w-4" />
            {t('title.admin-roles')}
          </Link>
        </Button>
      </div>

      {isLoading || !role ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <RoleForm
          initial={role}
          systemLocked={role.isSystem}
          submitLabel={t('edit.submit')}
          isSubmitting={update.isPending}
          onSubmit={async (input) => {
            try {
              await update.mutateAsync({ id: role.id, body: input });
              toast.success(t('edit.success'));
            } catch (err) {
              toast.error(err instanceof ApiClientError ? err.message : t('edit.error'));
            }
          }}
        />
      )}
    </main>
  );
}
