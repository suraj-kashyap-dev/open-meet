'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UserSettingsDto } from '@open-meet/types';

import { settingsApi } from '@/features/web/account/services/settings';

const SETTINGS_KEY = ['auth', 'me', 'settings'] as const;

export function useUserSettings() {
  return useQuery<UserSettingsDto>({
    queryKey: SETTINGS_KEY,
    queryFn: ({ signal }) => settingsApi.me(signal),
    staleTime: 60_000,
  });
}

export function useUpdateUserSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (settings) => {
      qc.setQueryData(SETTINGS_KEY, settings);
    },
  });
}
