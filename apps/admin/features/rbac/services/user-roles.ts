import type {
  CreateRoleDto,
  PermissionCatalogResponseDto,
  RoleDto,
  RoleListResponseDto,
  UpdateRoleDto,
} from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminUserRolesApi = {
  list: (signal?: AbortSignal) =>
    api.get<RoleListResponseDto>('/admin/user-roles', { signal }),

  detail: (id: string, signal?: AbortSignal) =>
    api.get<RoleDto>(`/admin/user-roles/${id}`, { signal }),

  create: (body: CreateRoleDto) => api.post<RoleDto>('/admin/user-roles', body),

  update: (id: string, body: UpdateRoleDto) =>
    api.patch<RoleDto>(`/admin/user-roles/${id}`, body),

  remove: (id: string) => api.delete<{ deleted: true }>(`/admin/user-roles/${id}`),

  catalog: (signal?: AbortSignal) =>
    api.get<PermissionCatalogResponseDto>('/admin/permissions/user-catalog', { signal }),
};
