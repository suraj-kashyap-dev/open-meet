import type {
  AuthResponseDto,
  ChangePasswordDto,
  UpdateProfileDto,
  UserDto,
} from '@open-meet/types';

import { api, ApiClientError } from '@/lib/shared/api';
import { env } from '@/lib/shared/env';

interface UploadAvatarOptions {
  signal?: AbortSignal;
  onProgress?: (loaded: number, total: number) => void;
}

function uploadAvatar(file: File, options: UploadAvatarOptions = {}): Promise<UserDto> {
  return new Promise((resolve, reject) => {
    const url = `${env.NEXT_PUBLIC_API_URL}/api/auth/me/avatar`;
    const form = new FormData();

    form.append('file', file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;

    if (options.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          options.onProgress!(event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      const isJson = (xhr.getResponseHeader('content-type') ?? '').includes(
        'application/json',
      );

      if (! isJson) {
        reject(
          new ApiClientError(
            'INVALID_RESPONSE',
            xhr.status,
            `Unexpected response: ${xhr.status}`,
          ),
        );
        return;
      }

      let body: unknown;

      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        reject(new ApiClientError('INVALID_RESPONSE', xhr.status, 'Invalid JSON'));
        return;
      }

      const envelope = body as {
        success: boolean;
        data?: UserDto;
        error?: { code: string; message: string; statusCode: number };
      };

      if (! envelope.success || ! envelope.data) {
        const err = envelope.error;
        reject(
          new ApiClientError(
            err?.code ?? 'UPLOAD_FAILED',
            err?.statusCode ?? xhr.status,
            err?.message ?? 'Upload failed',
          ),
        );
        return;
      }

      resolve(envelope.data);
    };

    xhr.onerror = () => {
      reject(new ApiClientError('NETWORK_ERROR', 0, 'Network error during upload'));
    };

    xhr.onabort = () => {
      reject(new ApiClientError('UPLOAD_ABORTED', 0, 'Upload was aborted'));
    };

    if (options.signal) {
      options.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
}

export const authApi = {
  register: (input: { name: string; email: string; password: string }) =>
    api.post<AuthResponseDto>('/auth/register', input),

  login: (input: { email: string; password: string }) =>
    api.post<AuthResponseDto>('/auth/login', input),

  logout: () => api.post<{ loggedOut: true }>('/auth/logout'),

  refresh: () => api.post<{ refreshed: true }>('/auth/refresh'),

  me: (signal?: AbortSignal) => api.get<UserDto>('/auth/me', { signal }),

  updateMe: (input: UpdateProfileDto) => api.patch<UserDto>('/auth/me', input),

  changePassword: (input: ChangePasswordDto) =>
    api.post<{ changed: true }>('/auth/me/password', input),

  uploadAvatar,

  deleteAvatar: () => api.delete<UserDto>('/auth/me/avatar'),
};
