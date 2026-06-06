'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateRoleDto, UpdateRoleDto } from '@open-meet/types';

import { adminRolesApi } from '@/features/rbac/services/roles';

export const ADMIN_ROLES_KEY = ['admin', 'roles'] as const;
export const PERMISSION_CATALOG_KEY = ['admin', 'permissions', 'catalog'] as const;

export function useAdminRoles() {
  return useQuery({
    queryKey: ADMIN_ROLES_KEY,
    queryFn: ({ signal }) => adminRolesApi.list(signal),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useAdminRole(id: string | null) {
  return useQuery({
    queryKey: [...ADMIN_ROLES_KEY, id],
    queryFn: ({ signal }) => adminRolesApi.detail(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useCreateAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoleDto) => adminRolesApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_ROLES_KEY });
      void qc.invalidateQueries({ queryKey: ['admin-datagrid', 'roles'] });
    },
  });
}

export function useUpdateAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoleDto }) =>
      adminRolesApi.update(id, body),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ADMIN_ROLES_KEY });
      void qc.invalidateQueries({ queryKey: [...ADMIN_ROLES_KEY, id] });
      void qc.invalidateQueries({ queryKey: ['admin-datagrid', 'roles'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'me'] });
    },
  });
}

export function useDeleteAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminRolesApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_ROLES_KEY });
      void qc.invalidateQueries({ queryKey: ['admin-datagrid', 'roles'] });
    },
  });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: PERMISSION_CATALOG_KEY,
    queryFn: ({ signal }) => adminRolesApi.catalog(signal),
    staleTime: 60 * 60_000,
  });
}
