import { HttpResponse, http } from 'msw';

const API = 'http://localhost:3001/api';

function ok<T>(data: T) {
  return HttpResponse.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
}

function fail(code: string, message: string, statusCode: number) {
  return HttpResponse.json(
    { success: false, error: { code, message, statusCode } },
    { status: statusCode },
  );
}

export const defaultUser = {
  id: 'user-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  createdAt: '2026-05-01T00:00:00.000Z',
};

export const handlers = [
  http.get(`${API}/auth/me`, () => ok(defaultUser)),

  http.post(`${API}/auth/login`, () => ok({ user: defaultUser })),

  http.post(`${API}/auth/register`, () => ok({ user: defaultUser })),

  http.post(`${API}/auth/logout`, () => ok({ success: true })),

  http.get(`${API}/meetings`, () => ok([])),

  http.post(`${API}/meetings`, () =>
    ok({
      id: 'meeting-1',
      code: 'abc-defg-hij',
      hostId: defaultUser.id,
      status: 'SCHEDULED',
      createdAt: '2026-05-16T10:00:00.000Z',
    }),
  ),
];

export { ok, fail };
