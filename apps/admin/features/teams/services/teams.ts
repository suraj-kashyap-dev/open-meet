import type {
  AdminAddTeamMembersDto,
  AdminChannelDto,
  AdminChannelListResponseDto,
  AdminCreateChannelDto,
  AdminCreateTeamDto,
  AdminTeamDetailDto,
  AdminTeamDto,
  AdminTeamListResponseDto,
  AdminUpdateTeamDto,
} from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminTeamsApi = {
  list: (signal?: AbortSignal) => api.get<AdminTeamListResponseDto>('/admin/teams', { signal }),

  detail: (id: string, signal?: AbortSignal) =>
    api.get<AdminTeamDetailDto>(`/admin/teams/${id}`, { signal }),

  create: (body: AdminCreateTeamDto) => api.post<AdminTeamDto>('/admin/teams', body),

  update: (id: string, body: AdminUpdateTeamDto) => api.patch<AdminTeamDto>(`/admin/teams/${id}`, body),

  remove: (id: string) => api.delete<{ deleted: true }>(`/admin/teams/${id}`),

  addMembers: (id: string, body: AdminAddTeamMembersDto) =>
    api.post<AdminTeamDetailDto>(`/admin/teams/${id}/members`, body),

  removeMember: (id: string, userId: string) =>
    api.delete<{ removed: true }>(`/admin/teams/${id}/members/${userId}`),

  listChannels: (id: string, signal?: AbortSignal) =>
    api.get<AdminChannelListResponseDto>(`/admin/teams/${id}/channels`, { signal }),

  createChannel: (id: string, body: AdminCreateChannelDto) =>
    api.post<AdminChannelDto>(`/admin/teams/${id}/channels`, body),

  deleteChannel: (id: string, channelId: string) =>
    api.delete<{ deleted: true }>(`/admin/teams/${id}/channels/${channelId}`),
};
