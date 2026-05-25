'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminBrandingDto, UpdateBrandingInput } from '@open-meet/types';

import { adminBrandingApi } from '@/features/branding/services/branding';

const KEY = 'admin-branding' as const;

export function useAdminBranding() {
  return useQuery({
    queryKey: [KEY],
    queryFn: ({ signal }) => adminBrandingApi.get(signal),
    staleTime: 30_000,
  });
}

export function useUpdateBrandingName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBrandingInput) => adminBrandingApi.updateName(input),
    onSuccess: (data: AdminBrandingDto) => {
      qc.setQueryData([KEY], data);
    },
  });
}

export function useUploadBrandingLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => adminBrandingApi.uploadLogo(file),
    onSuccess: (data: AdminBrandingDto) => {
      qc.setQueryData([KEY], data);
    },
  });
}

export function useRemoveBrandingLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminBrandingApi.removeLogo(),
    onSuccess: (data: AdminBrandingDto) => {
      qc.setQueryData([KEY], data);
    },
  });
}
