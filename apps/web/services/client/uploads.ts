import type { AttachmentDto } from '@open-meet/types';

import { env } from '@/lib/shared/env';
import { ApiClientError } from '@/lib/shared/api';

interface UploadOptions {
  onProgress?: (loaded: number, total: number) => void;
  signal?: AbortSignal;
}

export function uploadAttachment(
  file: File,
  options: UploadOptions = {},
): Promise<AttachmentDto> {
  return new Promise((resolve, reject) => {
    const url = `${env.NEXT_PUBLIC_API_URL}/api/uploads`;
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
      const isJson = (xhr.getResponseHeader('content-type') ?? '').includes('application/json');

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
        reject(
          new ApiClientError('INVALID_RESPONSE', xhr.status, 'Invalid JSON'),
        );
        return;
      }

      const envelope = body as {
        success: boolean;
        data?: AttachmentDto;
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
