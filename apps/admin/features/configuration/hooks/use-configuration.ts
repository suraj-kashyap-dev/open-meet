'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateWorkspaceConfigInput, WorkspaceConfigDto } from '@open-meet/types';

import { adminConfigurationApi } from '@/features/configuration/services/configuration';

const KEY = 'admin-configuration' as const;

export function useWorkspaceConfig() {
  return useQuery({
    queryKey: [KEY],
    queryFn: ({ signal }) => adminConfigurationApi.get(signal),
    staleTime: 30_000,
  });
}

export function useUpdateWorkspaceConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWorkspaceConfigInput) => adminConfigurationApi.update(input),
    onSuccess: (data: WorkspaceConfigDto) => {
      qc.setQueryData([KEY], data);
    },
  });
}
