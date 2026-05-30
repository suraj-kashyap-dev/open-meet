'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { CreateRoleDto, RoleDto, UpdateRoleDto } from '@open-meet/types';
import { PermissionType } from '@open-meet/types';
import { Button } from '@open-meet/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@open-meet/ui/card';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-meet/ui/select';
import { Textarea } from '@open-meet/ui/textarea';

import { PermissionTreePicker } from '@/features/rbac/components/permission-tree-picker';
import { usePermissionCatalog } from '@/features/rbac/hooks/use-admin-roles';

interface Props {
  initial?: RoleDto;
  /** Existing system roles render a read-only banner — name + type are immutable. */
  systemLocked?: boolean;
  submitLabel: string;
  onSubmit: (input: CreateRoleDto | UpdateRoleDto) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function RoleForm({ initial, systemLocked = false, submitLabel, onSubmit, isSubmitting = false }: Props) {
  const t = useTranslations('rbac');
  const catalog = usePermissionCatalog();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [permissionType, setPermissionType] = useState<PermissionType>(
    initial?.permissionType ?? PermissionType.CUSTOM,
  );
  const [permissions, setPermissions] = useState<string[]>(initial?.permissions ?? []);

  const treeReady = catalog.data?.tree ?? [];
  const isAll = permissionType === PermissionType.ALL;
  const canSubmit = name.trim().length > 0 && !isSubmitting;

  const handleSubmit = () => {
    void onSubmit({
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      permissionType,
      permissions: isAll ? [] : permissions,
    });
  };

  return (
    <div className="space-y-6">
      {systemLocked ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          {t('edit.system-locked')}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>{t('create.type-label')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <Select
                value={permissionType}
                disabled={systemLocked}
                onValueChange={(v) => setPermissionType(v as PermissionType)}
              >
                <SelectTrigger id="role-type" aria-label={t('create.type-label')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PermissionType.CUSTOM}>{t('type.custom')}</SelectItem>
                  <SelectItem value={PermissionType.ALL}>{t('type.all')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isAll ? t('create.type-all') : t('create.type-custom')}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>{t('permissions.tree-heading')}</CardTitle>
            </CardHeader>
            <CardContent>
              {catalog.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : isAll ? (
                <p className="text-sm text-muted-foreground">{t('create.type-all')}</p>
              ) : (
                <PermissionTreePicker
                  tree={treeReady}
                  value={permissions}
                  onChange={setPermissions}
                  disabled={systemLocked && initial?.id === 'role_sys_admin'}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="rounded-xl lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>{t('create.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="role-name">{t('create.name-label')}</Label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('create.name-placeholder')}
                  maxLength={60}
                  disabled={systemLocked}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-description">{t('create.description-label')}</Label>
                <Textarea
                  id="role-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('create.description-placeholder')}
                  maxLength={280}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
