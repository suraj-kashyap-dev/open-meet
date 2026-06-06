import type {
  AdminAddGroupMembersDto,
  AdminCreateGroupDto,
  AdminGroupDetailDto,
  AdminUpdateGroupDto,
} from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminGroupsApi = {
  detail: (id: string, signal?: AbortSignal) =>
    api.get<AdminGroupDetailDto>(`/admin/groups/${id}`, { signal }),

  create: (body: AdminCreateGroupDto) => api.post<AdminGroupDetailDto>('/admin/groups', body),

  update: (id: string, body: AdminUpdateGroupDto) =>
    api.patch<AdminGroupDetailDto>(`/admin/groups/${id}`, body),

  remove: (id: string) => api.delete<{ deleted: true }>(`/admin/groups/${id}`),

  addMembers: (id: string, body: AdminAddGroupMembersDto) =>
    api.post<AdminGroupDetailDto>(`/admin/groups/${id}/members`, body),

  removeMember: (id: string, userId: string) =>
    api.delete<{ removed: true }>(`/admin/groups/${id}/members/${userId}`),
};
