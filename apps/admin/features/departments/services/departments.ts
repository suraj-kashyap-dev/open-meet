import type {
  AdminAddDepartmentMembersDto,
  AdminCreateDepartmentDto,
  AdminDepartmentDetailDto,
  AdminDepartmentDto,
  AdminDepartmentListResponseDto,
  AdminUpdateDepartmentDto,
} from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminDepartmentsApi = {
  list: (signal?: AbortSignal) => api.get<AdminDepartmentListResponseDto>('/admin/departments', { signal }),

  detail: (id: string, signal?: AbortSignal) =>
    api.get<AdminDepartmentDetailDto>(`/admin/departments/${id}`, { signal }),

  create: (body: AdminCreateDepartmentDto) => api.post<AdminDepartmentDto>('/admin/departments', body),

  update: (id: string, body: AdminUpdateDepartmentDto) =>
    api.patch<AdminDepartmentDto>(`/admin/departments/${id}`, body),

  remove: (id: string) => api.delete<{ deleted: true }>(`/admin/departments/${id}`),

  addMembers: (id: string, body: AdminAddDepartmentMembersDto) =>
    api.post<AdminDepartmentDetailDto>(`/admin/departments/${id}/members`, body),

  removeMember: (id: string, userId: string) =>
    api.delete<{ removed: true }>(`/admin/departments/${id}/members/${userId}`),
};
