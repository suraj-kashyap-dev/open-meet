import type { ApiError, ApiResponse, ApiSuccess } from '@open-meet/types';

import { env } from '@/lib/env';

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export const UNAUTHORIZED_EVENT = 'open-meet:unauthorized' as const;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function request<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
  const { method = 'GET', body, signal, headers } = options;
  const url = `${env.NEXT_PUBLIC_API_URL}/api${path.startsWith('/') ? path : `/${path}`}`;

  const hasBody = body !== undefined;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...currentLocaleHeader(),
    ...headers,
  };

  if (hasBody) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: requestHeaders,
    body: hasBody ? JSON.stringify(body) : undefined,
    signal,
  });

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (res.status === 401) {
      emitUnauthorized(path);
    }

    throw new ApiClientError('INVALID_RESPONSE', res.status, `Unexpected response: ${res.status}`);
  }

  const json = (await res.json()) as ApiResponse<TData>;

  if (!res.ok || !json.success) {
    const errBody = (json as ApiError).error;
    const status = errBody?.statusCode ?? res.status;

    if (status === 401) {
      emitUnauthorized(path);
    }

    throw new ApiClientError(
      errBody?.code ?? 'UNKNOWN',
      status,
      errBody?.message ?? 'Request failed',
      errBody?.details,
    );
  }

  return (json as ApiSuccess<TData>).data;
}

function emitUnauthorized(path: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { path } }));
}

/**
 * Tell the API which locale to answer in (error messages, emails). Derived
 * from the locale prefix in the URL, which next-intl keeps in sync with the
 * user's choice. No-op during SSR.
 */
function currentLocaleHeader(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  const segment = window.location.pathname.split('/')[1];

  return segment ? { 'x-locale': segment } : {};
}

export const api = {
  get: <TData>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TData>(path, { ...opts, method: 'GET' }),
  post: <TData>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TData>(path, { ...opts, method: 'POST', body }),
  patch: <TData>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TData>(path, { ...opts, method: 'PATCH', body }),
  put: <TData>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TData>(path, { ...opts, method: 'PUT', body }),
  delete: <TData>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TData>(path, { ...opts, method: 'DELETE' }),
};
