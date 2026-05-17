import { cookies } from 'next/headers';

import type { ApiError, ApiResponse, ApiSuccess } from '@open-meet/types';

import { env } from '@/lib/env';

import { ApiClientError } from './client';

interface ServerRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
}

async function serverRequest<TData>(
  path: string,
  options: ServerRequestOptions = {},
): Promise<TData> {
  const { method = 'GET', body, headers, cache, next } = options;
  const url = `${env.NEXT_PUBLIC_API_URL}/api${path.startsWith('/') ? path : `/${path}`}`;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const hasBody = body !== undefined;
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    Cookie: cookieHeader,
    ...headers,
  };

  if (hasBody) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers: requestHeaders,
    body: hasBody ? JSON.stringify(body) : undefined,
    cache,
    next,
  });

  const contentType = res.headers.get('content-type') ?? '';
  if (! contentType.includes('application/json')) {
    throw new ApiClientError(
      'INVALID_RESPONSE',
      res.status,
      `Unexpected response: ${res.status}`,
    );
  }

  const json = (await res.json()) as ApiResponse<TData>;

  if (! res.ok || ! json.success) {
    const errBody = (json as ApiError).error;
    throw new ApiClientError(
      errBody?.code ?? 'UNKNOWN',
      errBody?.statusCode ?? res.status,
      errBody?.message ?? 'Request failed',
      errBody?.details,
    );
  }

  return (json as ApiSuccess<TData>).data;
}

export const serverApi = {
  get: <TData>(path: string, opts?: Omit<ServerRequestOptions, 'method' | 'body'>) =>
    serverRequest<TData>(path, { ...opts, method: 'GET' }),
  post: <TData>(path: string, body?: unknown, opts?: Omit<ServerRequestOptions, 'method' | 'body'>) =>
    serverRequest<TData>(path, { ...opts, method: 'POST', body }),
  patch: <TData>(path: string, body?: unknown, opts?: Omit<ServerRequestOptions, 'method' | 'body'>) =>
    serverRequest<TData>(path, { ...opts, method: 'PATCH', body }),
  put: <TData>(path: string, body?: unknown, opts?: Omit<ServerRequestOptions, 'method' | 'body'>) =>
    serverRequest<TData>(path, { ...opts, method: 'PUT', body }),
  delete: <TData>(path: string, opts?: Omit<ServerRequestOptions, 'method' | 'body'>) =>
    serverRequest<TData>(path, { ...opts, method: 'DELETE' }),
};
