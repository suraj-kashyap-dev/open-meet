import type {
  UpdateUserSettingsDto,
  UserSettingsDto,
} from '@open-meet/types';

import { api } from '@/lib/shared/api';

export const settingsApi = {
  me: (signal?: AbortSignal) =>
    api.get<UserSettingsDto>('/auth/me/settings', { signal }),

  update: (input: UpdateUserSettingsDto) =>
    api.patch<UserSettingsDto>('/auth/me/settings', input),
};
