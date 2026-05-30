import type { Leaves } from './shared';
import { flattenLeaves } from './shared';

export const PERMISSION_TREE_ADMIN = {
  users: {
    view: null,
    invite: null,
    update: null,
    delete: null,
    'manage-avatar': null,
    'disable-chat': null,
  },
  meetings: {
    view: null,
    'force-end': null,
    delete: null,
    kick: null,
  },
  teams: {
    view: null,
    create: null,
    update: null,
    delete: null,
    'manage-members': null,
    channels: {
      view: null,
      create: null,
      update: null,
      delete: null,
    },
  },
  groups: {
    view: null,
    create: null,
    update: null,
    delete: null,
    'manage-members': null,
  },
  branding: {
    view: null,
    update: null,
    'manage-logo': null,
  },
  configuration: {
    view: null,
    update: null,
  },
  analytics: {
    view: null,
    'view-deep': null,
  },
  'admin-accounts': {
    view: null,
    create: null,
    update: null,
    delete: null,
    invite: null,
  },
  roles: {
    view: null,
    create: null,
    update: null,
    delete: null,
    assign: null,
  },
  'user-roles': {
    view: null,
    create: null,
    update: null,
    delete: null,
    assign: null,
  },
} as const;

export type AdminPermissionKey = Leaves<typeof PERMISSION_TREE_ADMIN>;

export const ADMIN_PERMISSION_KEYS: readonly AdminPermissionKey[] = flattenLeaves(
  PERMISSION_TREE_ADMIN,
) as AdminPermissionKey[];

export const DEFAULT_ADMIN_MEMBER_PERMISSIONS: readonly AdminPermissionKey[] = [
  'users.view',
  'meetings.view',
  'teams.view',
  'groups.view',
  'analytics.view',
];
