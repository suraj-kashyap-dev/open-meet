import type { Leaves } from './shared';
import { flattenLeaves } from './shared';

/**
 * Permission tree for the user-facing app (`apps/web` + `modules/client/*`).
 *
 * These RBAC keys gate "can this user *at all*" actions. They run ON TOP OF
 * existing object-scoped checks (e.g. host-of-meeting, member-of-team) — both
 * must pass.
 */
export const PERMISSION_TREE_USER = {
  meetings: {
    create: null,
    schedule: null,
    host: null,
  },
  teams: {
    create: null,
    update: null,
    delete: null,
    'manage-members': null,
    channels: {
      create: null,
      update: null,
      delete: null,
    },
  },
  groups: {
    create: null,
    update: null,
    delete: null,
    'manage-members': null,
  },
  chat: {
    send: null,
    react: null,
    upload: null,
    polls: {
      create: null,
    },
  },
  presence: {
    'change-status': null,
  },
} as const;

export type UserPermissionKey = Leaves<typeof PERMISSION_TREE_USER>;

export const USER_PERMISSION_KEYS: readonly UserPermissionKey[] = flattenLeaves(
  PERMISSION_TREE_USER,
) as UserPermissionKey[];

/**
 * Default permission set for the seeded `Member` user role — a normal active user.
 */
export const DEFAULT_USER_MEMBER_PERMISSIONS: readonly UserPermissionKey[] = [
  'meetings.create',
  'meetings.schedule',
  'meetings.host',
  'teams.create',
  'teams.update',
  'teams.delete',
  'teams.manage-members',
  'teams.channels.create',
  'teams.channels.update',
  'teams.channels.delete',
  'groups.create',
  'groups.update',
  'groups.delete',
  'groups.manage-members',
  'chat.send',
  'chat.react',
  'chat.upload',
  'chat.polls.create',
  'presence.change-status',
];

/**
 * Default permission set for the seeded `Restricted` user role — empty.
 * Operators assign this to chat-disabled / banned users to strip capability.
 */
export const DEFAULT_USER_RESTRICTED_PERMISSIONS: readonly UserPermissionKey[] = [];
