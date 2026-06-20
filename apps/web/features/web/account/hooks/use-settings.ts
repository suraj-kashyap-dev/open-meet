'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateUserSettingsDto, UserSettingsDto } from '@open-meet/types';
import { DEFAULT_USER_SETTINGS } from '@open-meet/types';

import { settingsApi } from '@/features/web/account/services/settings';

const SETTINGS_KEY = ['auth', 'me', 'settings'] as const;

function mergeSettings(
  current: UserSettingsDto | undefined,
  input: UpdateUserSettingsDto,
): UserSettingsDto {
  const base = current ?? DEFAULT_USER_SETTINGS;

  return {
    ...base,
    meetingPreferences: {
      ...base.meetingPreferences,
      ...(input.meetingPreferences ?? {}),
    },
    privacySettings: {
      ...base.privacySettings,
      ...(input.privacySettings ?? {}),
    },
    appearance: {
      ...base.appearance,
      ...(input.appearance ?? {}),
    },
    composerPreferences: {
      ...base.composerPreferences,
      ...(input.composerPreferences ?? {}),
    },
  };
}

export function useUserSettings(enabled: boolean = true) {
  return useQuery<UserSettingsDto>({
    queryKey: SETTINGS_KEY,
    queryFn: ({ signal }) => settingsApi.me(signal),
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateUserSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.update,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: SETTINGS_KEY });

      const previous = qc.getQueryData<UserSettingsDto>(SETTINGS_KEY);
      const hadPrevious = previous !== undefined;

      qc.setQueryData<UserSettingsDto>(SETTINGS_KEY, (current) => mergeSettings(current, input));

      return { hadPrevious, previous };
    },
    onError: (_err, _input, context) => {
      if (context?.hadPrevious) {
        qc.setQueryData(SETTINGS_KEY, context.previous);
      } else {
        qc.removeQueries({ queryKey: SETTINGS_KEY, exact: true });
      }
    },
    onSuccess: (settings) => {
      qc.setQueryData(SETTINGS_KEY, settings);
    },
  });
}
