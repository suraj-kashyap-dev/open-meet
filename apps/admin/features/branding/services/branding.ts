import type { AdminBrandingDto, UpdateBrandingInput } from '@open-meet/types';

import { api, ApiClientError } from '@/lib/api/client';
import { env } from '@/lib/env';

function uploadLogo(file: File): Promise<AdminBrandingDto> {
  return new Promise((resolve, reject) => {
    const url = `${env.NEXT_PUBLIC_API_URL}/api/admin/branding/logo`;
    const form = new FormData();

    form.append('file', file, file.name);

    const xhr = new XMLHttpRequest();

    xhr.open('POST', url);

    xhr.withCredentials = true;

    xhr.onload = () => {
      const isJson = (xhr.getResponseHeader('content-type') ?? '').includes('application/json');

      if (!isJson) {
        reject(
          new ApiClientError('INVALID_RESPONSE', xhr.status, `Unexpected response: ${xhr.status}`),
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
        data?: AdminBrandingDto;
        error?: { code: string; message: string; statusCode: number };
      };

      if (!envelope.success || !envelope.data) {
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

    xhr.send(form);
  });
}

export const adminBrandingApi = {
  get: (signal?: AbortSignal) => api.get<AdminBrandingDto>('/admin/branding', { signal }),

  update: (input: UpdateBrandingInput) => api.patch<AdminBrandingDto>('/admin/branding', input),

  updateName: (input: UpdateBrandingInput) => api.patch<AdminBrandingDto>('/admin/branding', input),

  uploadLogo,

  removeLogo: () => api.delete<AdminBrandingDto>('/admin/branding/logo'),
};
