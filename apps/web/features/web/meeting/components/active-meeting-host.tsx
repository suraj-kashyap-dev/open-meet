'use client';

import '@livekit/components-styles';

import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';

import { useActiveMeeting } from '@/features/web/meeting/stores';
import { MeetingShell } from './meeting-shell';

export function ActiveMeetingHost() {
  const session = useActiveMeeting((s) => s.session);
  const minimized = useActiveMeeting((s) => s.minimized);

  if (!session) {
    return null;
  }

  return (
    <LiveKitRoom
      key={session.code}
      token={session.token}
      serverUrl={session.serverUrl}
      connect
      audio={session.audio}
      video={session.video}
      style={{ display: 'contents' }}
      options={{
        publishDefaults: { stopMicTrackOnMute: false },
        stopLocalTrackOnUnpublish: false,
      }}
      onDisconnected={() => {
        const state = useActiveMeeting.getState();
        const current = state.session;

        if (!current) {
          return;
        }

        if (state.minimized) {
          state.clear();
        } else {
          state.markEnded({ code: current.code, title: current.meeting.title });
        }
      }}
    >
      <MeetingShell code={session.code} meeting={session.meeting} minimized={minimized} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
