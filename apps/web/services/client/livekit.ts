import type { LiveKitTokenResponseDto } from '@open-meet/types';

import { api } from '@/lib/shared/api';

export const livekitApi = {
  token: (input: { meetingCode: string }) => api.post<LiveKitTokenResponseDto>('/livekit/token', input),
};
