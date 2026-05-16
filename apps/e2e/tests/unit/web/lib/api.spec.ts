import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError, UNAUTHORIZED_EVENT, api } from '@/lib/shared/api';

import { server } from '../../mocks/server';

const API = 'http://localhost:3001/api';

describe('api client', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('unwraps a success envelope', async () => {
    server.use(
      http.get(`${API}/widgets`, () =>
        HttpResponse.json({
          success: true,
          data: { id: '1', name: 'gear' },
          meta: { timestamp: '2026-05-16T00:00:00.000Z' },
        }),
      ),
    );

    const result = await api.get<{ id: string; name: string }>('/widgets');

    expect(result).toEqual({ id: '1', name: 'gear' });
  });

  it('sends the body and Content-Type on POST', async () => {
    const seen = vi.fn();

    server.use(
      http.post(`${API}/widgets`, async ({ request }) => {
        seen({
          ct: request.headers.get('content-type'),
          body: await request.json(),
        });

        return HttpResponse.json({ success: true, data: { ok: true } });
      }),
    );

    await api.post('/widgets', { color: 'orange' });

    expect(seen).toHaveBeenCalledWith({
      ct: 'application/json',
      body: { color: 'orange' },
    });
  });

  it('omits Content-Type when there is no body', async () => {
    const seen = vi.fn();

    server.use(
      http.post(`${API}/widgets/poke`, ({ request }) => {
        seen(request.headers.get('content-type'));
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    await api.post('/widgets/poke');

    expect(seen).toHaveBeenCalledWith(null);
  });

  it('maps an error envelope to ApiClientError with code and statusCode', async () => {
    server.use(
      http.get(`${API}/missing`, () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Widget gone', statusCode: 404 },
          },
          { status: 404 },
        ),
      ),
    );

    await expect(api.get('/missing')).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'NOT_FOUND',
      statusCode: 404,
      message: 'Widget gone',
    });
  });

  it('dispatches the unauthorized event on 401', async () => {
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);

    server.use(
      http.get(`${API}/private`, () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'no', statusCode: 401 },
          },
          { status: 401 },
        ),
      ),
    );

    await expect(api.get('/private')).rejects.toBeInstanceOf(ApiClientError);

    expect(listener).toHaveBeenCalledOnce();

    const event = listener.mock.calls[0]![0] as CustomEvent<{ path: string }>;
    expect(event.detail.path).toBe('/private');

    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it('throws INVALID_RESPONSE when the server returns non-JSON', async () => {
    server.use(
      http.get(`${API}/broken`, () =>
        new HttpResponse('plain text', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    );

    await expect(api.get('/broken')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });
});
