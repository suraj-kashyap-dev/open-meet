export interface ApiSuccess<TData> {
  success: true;
  data: TData;
  meta?: ApiMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiError;

export interface ApiMeta {
  timestamp: string;
  page?: number;
  pageSize?: number;
  total?: number;
}

export const ApiErrorCode = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  EMAIL_TAKEN: 'EMAIL_TAKEN',

  // Meetings
  MEETING_NOT_FOUND: 'MEETING_NOT_FOUND',
  MEETING_ENDED: 'MEETING_ENDED',
  MEETING_FORBIDDEN: 'MEETING_FORBIDDEN',
  ALREADY_JOINED: 'ALREADY_JOINED',

  // Recording
  RECORDING_NOT_FOUND: 'RECORDING_NOT_FOUND',
  RECORDING_ALREADY_ACTIVE: 'RECORDING_ALREADY_ACTIVE',
  RECORDING_NOT_ACTIVE: 'RECORDING_NOT_ACTIVE',
  RECORDING_FAILED: 'RECORDING_FAILED',

  // Generic
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
