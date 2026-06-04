import type {
  CreateRoleDto,
  PermissionCatalogResponseDto,
  RoleDto,
  RoleListResponseDto,
  UpdateRoleDto,
} from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminRolesApi = {
  list: (signal?: AbortSignal) => api.get<RoleListResponseDto>('/admin/roles', { signal }),

  detail: (id: string, signal?: AbortSignal) => api.get<RoleDto>(`/admin/roles/${id}`, { signal }),

  create: (body: CreateRoleDto) => api.post<RoleDto>('/admin/roles', body),

  update: (id: string, body: UpdateRoleDto) => api.patch<RoleDto>(`/admin/roles/${id}`, body),

  remove: (id: string) => api.delete<{ deleted: true }>(`/admin/roles/${id}`),

  catalog: (signal?: AbortSignal) =>
    api.get<PermissionCatalogResponseDto>('/admin/permissions/catalog', { signal }),
};
