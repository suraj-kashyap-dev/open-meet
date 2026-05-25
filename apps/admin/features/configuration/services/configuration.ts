import type { UpdateWorkspaceConfigInput, WorkspaceConfigDto } from '@open-meet/types';

import { api } from '@/lib/api/client';

export const adminConfigurationApi = {
  get: (signal?: AbortSignal) => api.get<WorkspaceConfigDto>('/admin/configuration', { signal }),

  update: (input: UpdateWorkspaceConfigInput) =>
    api.patch<WorkspaceConfigDto>('/admin/configuration', input),
};
