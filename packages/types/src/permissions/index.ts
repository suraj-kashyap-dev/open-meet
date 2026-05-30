export * from './shared';
export * from './admin-catalog';
export * from './user-catalog';

export const PermissionType = {
  ALL: 'ALL',
  CUSTOM: 'CUSTOM',
} as const;
export type PermissionType = (typeof PermissionType)[keyof typeof PermissionType];
