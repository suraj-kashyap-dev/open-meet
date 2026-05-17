export const RecordingStatus = {
  RECORDING: 'RECORDING',
  STOPPING: 'STOPPING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type RecordingStatus = (typeof RecordingStatus)[keyof typeof RecordingStatus];

export interface RecordingDto {
  id: string;
  meetingId: string;
  status: RecordingStatus;
  startedById: string;
  startedByName: string | null;
  url: string | null;
  mime: string;
  durationMs: number;
  sizeBytes: number;
  error: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export interface RecordingActiveStateDto {
  active: boolean;
  recording: RecordingDto | null;
}
