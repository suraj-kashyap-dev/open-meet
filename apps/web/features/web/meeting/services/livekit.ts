import type { LiveKitTokenResponseDto } from '@open-meet/types';

import { api } from '@/lib/api/client';

export const livekitApi = {
  token: (input: { meetingCode: string }, authToken?: string | null) =>
    api.post<LiveKitTokenResponseDto>('/livekit/token', input, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    }),
};
