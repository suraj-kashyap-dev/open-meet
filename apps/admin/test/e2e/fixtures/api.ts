import type { Page } from '@playwright/test';

import type { AdminMeResponseDto } from '@open-meet/types';

import * as fixtures from './data';

function ok<T>(data: T) {
  return { success: true, data, meta: { timestamp: new Date().toISOString() } };
}

function err(code: string, message: string, statusCode: number) {
  return { success: false, error: { code, message, statusCode } };
}

export interface AdminApiMockOptions {
  me?: AdminMeResponseDto | null;
  overview?: typeof fixtures.overview;
  users?: typeof fixtures.usersList;
  meetings?: typeof fixtures.meetingsList;
  analyticsDeep?: typeof fixtures.deepAnalytics;
  accounts?: typeof fixtures.accounts;
  invites?: typeof fixtures.invites;
  branding?: typeof fixtures.branding;
  configuration?: typeof fixtures.configuration;
  inviteLookup?: typeof fixtures.inviteLookup | { errorStatus: number };
  teams?: typeof fixtures.teamsList;
  teamDetail?: typeof fixtures.teamDetail;
  groups?: typeof fixtures.groupsList;
  groupDetail?: typeof fixtures.groupDetail;
  userInvites?: typeof fixtures.userInvites;
  adminRoles?: typeof fixtures.adminRoles;
  permissionCatalog?: typeof fixtures.permissionCatalog;
  userRoles?: typeof fixtures.userRoles;
  userPermissionCatalog?: typeof fixtures.userPermissionCatalog;
}

export async function mockAdminApi(page: Page, options: AdminApiMockOptions = {}): Promise<void> {
  const me = options.me === undefined ? fixtures.currentAdminMe : options.me;
  const overview = options.overview ?? fixtures.overview;
  const users = options.users ?? fixtures.usersList;
  const meetings = options.meetings ?? fixtures.meetingsList;
  const analyticsDeep = options.analyticsDeep ?? fixtures.deepAnalytics;
  const accounts = options.accounts ?? fixtures.accounts;
  const invites = options.invites ?? fixtures.invites;
  const branding = options.branding ?? fixtures.branding;
  const configuration = options.configuration ?? fixtures.configuration;
  const inviteLookup = options.inviteLookup ?? fixtures.inviteLookup;
  const teams = options.teams ?? fixtures.teamsList;
  const teamDetail = options.teamDetail ?? fixtures.teamDetail;
  const groups = options.groups ?? fixtures.groupsList;
  const groupDetail = options.groupDetail ?? fixtures.groupDetail;
  const userInvites = options.userInvites ?? fixtures.userInvites;
  const adminRoles = options.adminRoles ?? fixtures.adminRoles;
  const permissionCatalog = options.permissionCatalog ?? fixtures.permissionCatalog;
  const userRoles = options.userRoles ?? fixtures.userRoles;
  const userPermissionCatalog = options.userPermissionCatalog ?? fixtures.userPermissionCatalog;

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
        case '/admin/users/invites':
          return json(200, ok(userInvites));
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
        case '/admin/teams':
          return json(200, ok(teams));
        case '/admin/groups':
          return json(200, ok(groups));
        case '/admin/roles':
          return json(200, ok(adminRoles));
        case '/admin/user-roles':
          return json(200, ok(userRoles));
        case '/admin/permissions/catalog':
          return json(200, ok(permissionCatalog));
        case '/admin/permissions/user-catalog':
          return json(200, ok(userPermissionCatalog));
        default:
          break;
      }

      // Role detail: /admin/roles/:id
      const roleMatch = /^\/admin\/roles\/([^/]+)$/.exec(path);
      if (roleMatch) {
        const found = adminRoles.items.find((r) => r.id === roleMatch[1]);
        return found
          ? json(200, ok(found))
          : json(404, err('ROLE_NOT_FOUND', 'Role not found', 404));
      }

      // User role detail: /admin/user-roles/:id
      const userRoleMatch = /^\/admin\/user-roles\/([^/]+)$/.exec(path);
      if (userRoleMatch) {
        const found = userRoles.items.find((r) => r.id === userRoleMatch[1]);
        return found
          ? json(200, ok(found))
          : json(404, err('ROLE_NOT_FOUND', 'Role not found', 404));
      }


      // Team detail (members): /admin/teams/:id
      if (/^\/admin\/teams\/[^/]+$/.test(path)) {
        return json(200, ok(teamDetail));
      }

      // Group detail (members): /admin/groups/:id
      if (/^\/admin\/groups\/[^/]+$/.test(path)) {
        return json(200, ok(groupDetail));
      }

      // User detail: /admin/users/:id (invites handled above)
      const userMatch = /^\/admin\/users\/([^/]+)$/.exec(path);
      if (userMatch) {
        const found = users.items.find((u) => u.id === userMatch[1]) ?? users.items[0];
        return found
          ? json(200, ok(found))
          : json(404, err('NOT_FOUND', 'User not found', 404));
      }
    }

    if (method === 'POST') {
      if (path === '/admin/teams') {
        return json(200, ok(teams.items[0]));
      }
      if (path === '/admin/groups') {
        return json(200, ok(groupDetail));
      }
      if (path === '/admin/users/invite') {
        return json(200, ok(fixtures.userInvites.items[0]));
      }
      if (path === '/admin/users') {
        return json(200, ok(users.items[0]));
      }
    }

    return json(200, ok({ ok: true }));
  });
}
