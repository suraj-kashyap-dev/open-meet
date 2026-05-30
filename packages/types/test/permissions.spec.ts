import { describe, expect, it } from 'vitest';

import {
  ADMIN_PERMISSION_KEYS,
  PERMISSION_TREE_ADMIN,
  PERMISSION_TREE_USER,
  USER_PERMISSION_KEYS,
  buildCatalogTree,
  expandToLeaves,
  flattenLeaves,
  leavesUnder,
  unknownKeys,
} from '../src/permissions';

describe('flattenLeaves()', () => {
  it('should yield every leaf as a dot-key when given a nested tree', () => {
    const tree = { a: { b: null, c: { d: null } }, e: null } as const;
    expect(flattenLeaves(tree)).toEqual(['a.b', 'a.c.d', 'e']);
  });

  it('should match ADMIN_PERMISSION_KEYS for the admin tree', () => {
    expect(flattenLeaves(PERMISSION_TREE_ADMIN)).toEqual([...ADMIN_PERMISSION_KEYS]);
  });

  it('should match USER_PERMISSION_KEYS for the user tree', () => {
    expect(flattenLeaves(PERMISSION_TREE_USER)).toEqual([...USER_PERMISSION_KEYS]);
  });
});

describe('leavesUnder()', () => {
  it('should return [key] when key is already a leaf', () => {
    expect(leavesUnder('users.view', PERMISSION_TREE_ADMIN)).toEqual(['users.view']);
  });

  it('should return all descendant leaves when key is a parent', () => {
    expect(leavesUnder('teams.channels', PERMISSION_TREE_ADMIN)).toEqual([
      'teams.channels.view',
      'teams.channels.create',
      'teams.channels.update',
      'teams.channels.delete',
    ]);
  });

  it('should return an empty array when key matches nothing', () => {
    expect(leavesUnder('nope.here', PERMISSION_TREE_ADMIN)).toEqual([]);
  });
});

describe('expandToLeaves()', () => {
  it('should return leaves untouched when input contains only leaves', () => {
    expect(expandToLeaves(['users.view', 'users.invite'], PERMISSION_TREE_ADMIN)).toEqual([
      'users.invite',
      'users.view',
    ]);
  });

  it('should expand a parent key into all descendant leaves', () => {
    expect(expandToLeaves(['teams.channels'], PERMISSION_TREE_ADMIN)).toEqual([
      'teams.channels.create',
      'teams.channels.delete',
      'teams.channels.update',
      'teams.channels.view',
    ]);
  });

  it('should expand a mid-level parent and merge with explicit leaves', () => {
    expect(
      expandToLeaves(['analytics', 'users.view'], PERMISSION_TREE_ADMIN),
    ).toEqual(['analytics.view', 'analytics.view-deep', 'users.view']);
  });

  it('should deduplicate when both a parent and one of its leaves are selected', () => {
    const result = expandToLeaves(['analytics', 'analytics.view'], PERMISSION_TREE_ADMIN);
    expect(result).toEqual(['analytics.view', 'analytics.view-deep']);
  });

  it('should drop unknown keys silently', () => {
    expect(expandToLeaves(['users.flying'], PERMISSION_TREE_ADMIN)).toEqual([]);
  });
});

describe('unknownKeys()', () => {
  it('should return [] when every key is a valid leaf or parent', () => {
    expect(unknownKeys(['users', 'users.view', 'teams.channels'], PERMISSION_TREE_ADMIN)).toEqual([]);
  });

  it('should return the keys that are neither leaves nor known parents', () => {
    expect(
      unknownKeys(['users.view', 'mystery.leaf', 'teams.channels.fly'], PERMISSION_TREE_ADMIN),
    ).toEqual(['mystery.leaf', 'teams.channels.fly']);
  });
});

describe('buildCatalogTree()', () => {
  it('should yield a recursive DTO with i18n label keys (parents use ._self)', () => {
    const tree = { a: { b: null }, c: null } as const;
    expect(buildCatalogTree(tree, 'rbac.permissions')).toEqual([
      {
        key: 'a',
        labelKey: 'rbac.permissions.a._self',
        children: [{ key: 'a.b', labelKey: 'rbac.permissions.a.b', children: [] }],
      },
      { key: 'c', labelKey: 'rbac.permissions.c', children: [] },
    ]);
  });
});
