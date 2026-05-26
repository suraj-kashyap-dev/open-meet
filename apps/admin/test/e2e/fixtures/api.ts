import type { Page } from '@playwright/test';

import type { AdminDto } from '@open-meet/types';

import * as fixtures from './data';

function ok<T>(data: T) {
  return { success: true, data, meta: { timestamp: new Date().toISOString() } };
}

function err(code: string, message: string, statusCode: number) {
  return { success: false, error: { code, message, statusCode } };
}

export interface AdminApiMockOptions {
  me?: AdminDto | null;
  overview?: typeof fixtures.overview;
  users?: typeof fixtures.usersList;
  meetings?: typeof fixtures.meetingsList;
  analyticsDeep?: typeof fixtures.deepAnalytics;
  accounts?: typeof fixtures.accounts;
  invites?: typeof fixtures.invites;
  branding?: typeof fixtures.branding;
  configuration?: typeof fixtures.configuration;
  inviteLookup?: typeof fixtures.inviteLookup | { errorStatus: number };
}

export async function mockAdminApi(page: Page, options: AdminApiMockOptions = {}): Promise<void> {
  const me = options.me === undefined ? fixtures.currentAdmin : options.me;
  const overview = options.overview ?? fixtures.overview;
  const users = options.users ?? fixtures.usersList;
  const meetings = options.meetings ?? fixtures.meetingsList;
  const analyticsDeep = options.analyticsDeep ?? fixtures.deepAnalytics;
  const accounts = options.accounts ?? fixtures.accounts;
  const invites = options.invites ?? fixtures.invites;
  const branding = options.branding ?? fixtures.branding;
  const configuration = options.configuration ?? fixtures.configuration;
  const inviteLookup = options.inviteLookup ?? fixtures.inviteLookup;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');

    const json = (status: number, body: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

    if (path === '/admin/auth/me' && method === 'GET') {
      return me
        ? json(200, ok(me))
        : json(401, err('UNAUTHORIZED', 'Authentication required', 401));
    }

    if (path === '/admin/auth/login' && method === 'POST') {
      return json(200, ok(fixtures.loginResponse));
    }

    if (path === '/admin/auth/logout' && method === 'POST') {
      return json(200, ok({ loggedOut: true }));
    }

    if (path.startsWith('/admin/invite/') && method === 'GET') {
      if ('errorStatus' in inviteLookup) {
        return json(
          inviteLookup.errorStatus,
          err('INVITE_NOT_FOUND', 'Invite not found', inviteLookup.errorStatus),
        );
      }

      return json(200, ok(inviteLookup));
    }

    if (method === 'GET') {
      switch (path) {
        case '/admin/analytics/overview':
          return json(200, ok(overview));
        case '/admin/analytics/deep':
          return json(200, ok(analyticsDeep));
        case '/admin/users':
          return json(200, ok(users));
        case '/admin/meetings':
          return json(200, ok(meetings));
        case '/admin/accounts':
          return json(200, ok(accounts));
        case '/admin/accounts/invites':
          return json(200, ok(invites));
        case '/admin/branding':
          return json(200, ok(branding));
        case '/admin/configuration':
          return json(200, ok(configuration));
        default:
          break;
      }
    }

    return json(200, ok({ ok: true }));
  });
}
