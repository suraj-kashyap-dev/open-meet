import type {
  PermissionCatalogNodeDto,
  PermissionType,
} from '../permissions';

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
  permissionType: PermissionType;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleListResponseDto {
  items: RoleDto[];
}

export interface CreateRoleDto {
  name: string;
  description?: string | null;
  permissionType?: PermissionType;
  permissions?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string | null;
  permissionType?: PermissionType;
  permissions?: string[];
}

export interface AssignRoleDto {
  roleId: string;
}

export interface PermissionCatalogResponseDto {
  tree: PermissionCatalogNodeDto[];
  keys: string[];
}

export interface RoleSummaryDto {
  id: string;
  name: string;
  permissionType: PermissionType;
}
