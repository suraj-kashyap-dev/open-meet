'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import type { MeetingDto, ParticipantDto } from '@open-meet/types';

import { meetingsApi } from '@/services/client/meetings';

export function useMeeting(code: string | undefined) {
  return useQuery<MeetingDto>({
    queryKey: ['meeting', code],
    queryFn: ({ signal }) => meetingsApi.get(code as string, signal),
    enabled: Boolean(code),
  });
}

export function useParticipants(code: string | undefined) {
  return useQuery<ParticipantDto[]>({
    queryKey: ['meeting', code, 'participants'],
    queryFn: ({ signal }) => meetingsApi.participants(code as string, signal),
    enabled: Boolean(code),
    refetchInterval: 10_000,
  });
}

export function useCreateMeeting() {
  return useMutation({ mutationFn: meetingsApi.create });
}

export function useJoinMeeting() {
  return useMutation({ mutationFn: (code: string) => meetingsApi.join(code) });
}

export function useEndMeeting() {
  return useMutation({ mutationFn: (code: string) => meetingsApi.end(code) });
}
