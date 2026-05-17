import { beforeEach, describe, expect, it } from 'vitest';

import type { RecordingDto } from '@open-meet/types';

import { useRecordingStore } from '@/features/web/meeting/stores/recording-store';

function makeRecording(overrides: Partial<RecordingDto> = {}): RecordingDto {
  return {
    id: 'r-1',
    meetingId: 'm-1',
    status: 'RECORDING',
    startedById: 'u-1',
    startedByName: 'Ada',
    url: null,
    mime: 'video/mp4',
    durationMs: 0,
    sizeBytes: 0,
    error: null,
    startedAt: '2026-05-17T10:00:00.000Z',
    endedAt: null,
    createdAt: '2026-05-17T10:00:00.000Z',
    ...overrides,
  };
}

describe('recording-store', () => {
  beforeEach(() => {
    useRecordingStore.getState().reset();
  });

  it('starts inactive', () => {
    expect(useRecordingStore.getState().active).toBeNull();
  });

  it('setActive stores the recording', () => {
    const rec = makeRecording();
    useRecordingStore.getState().setActive(rec);
    expect(useRecordingStore.getState().active).toBe(rec);
  });

  it('reset clears the active recording', () => {
    useRecordingStore.getState().setActive(makeRecording());
    useRecordingStore.getState().reset();
    expect(useRecordingStore.getState().active).toBeNull();
  });
});
