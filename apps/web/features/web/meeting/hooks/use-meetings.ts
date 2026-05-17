'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  MeetingDto,
  ParticipantDto,
  ScheduleMeetingDto,
  UpcomingMeetingDto,
  UpdateMeetingDto,
} from '@open-meet/types';

import { meetingsApi } from '@/features/web/meeting/services/meetings';
import { useMeetingStore } from '@/features/web/meeting/stores';

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

export function useScheduleMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ScheduleMeetingDto) => meetingsApi.schedule(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meetings', 'upcoming'] });
    },
  });
}

export function useUpcomingMeetings() {
  return useQuery<UpcomingMeetingDto[]>({
    queryKey: ['meetings', 'upcoming'],
    queryFn: ({ signal }) => meetingsApi.upcoming(signal),
    refetchInterval: 60_000,
  });
}

export function useUpdateMeeting(code: string) {
  const queryClient = useQueryClient();
  const setMeeting = useMeetingStore((s) => s.setMeeting);
  const liveMeeting = useMeetingStore((s) => s.meeting);

  return useMutation({
    mutationFn: (input: UpdateMeetingDto) => meetingsApi.update(code, input),
    onSuccess: (meeting) => {
      queryClient.setQueryData<MeetingDto>(['meeting', code], meeting);

      if (liveMeeting && liveMeeting.code === code) {
        setMeeting(meeting);
      }
    },
  });
}

export function useJoinMeeting() {
  return useMutation({ mutationFn: (code: string) => meetingsApi.join(code) });
}

export function useEndMeeting() {
  return useMutation({ mutationFn: (code: string) => meetingsApi.end(code) });
}
