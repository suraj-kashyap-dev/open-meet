'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateRoleDto, UpdateRoleDto } from '@open-meet/types';

import { adminUserRolesApi } from '@/features/rbac/services/user-roles';

export const ADMIN_USER_ROLES_KEY = ['admin', 'user-roles'] as const;
export const USER_PERMISSION_CATALOG_KEY = ['admin', 'permissions', 'user-catalog'] as const;

export function useAdminUserRoles() {
  return useQuery({
    queryKey: ADMIN_USER_ROLES_KEY,
    queryFn: ({ signal }) => adminUserRolesApi.list(signal),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useAdminUserRole(id: string | null) {
  return useQuery({
    queryKey: [...ADMIN_USER_ROLES_KEY, id],
    queryFn: ({ signal }) => adminUserRolesApi.detail(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useCreateAdminUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoleDto) => adminUserRolesApi.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_USER_ROLES_KEY });
    },
  });
}

export function useUpdateAdminUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoleDto }) =>
      adminUserRolesApi.update(id, body),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ADMIN_USER_ROLES_KEY });
      void qc.invalidateQueries({ queryKey: [...ADMIN_USER_ROLES_KEY, id] });
    },
  });
}

export function useDeleteAdminUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUserRolesApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_USER_ROLES_KEY });
    },
  });
}

export function useUserPermissionCatalog() {
  return useQuery({
    queryKey: USER_PERMISSION_CATALOG_KEY,
    queryFn: ({ signal }) => adminUserRolesApi.catalog(signal),
    staleTime: 60 * 60_000,
  });
}
