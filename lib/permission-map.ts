import { PERMISSIONS, type PermissionValue } from '@/constants/permission';

export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

const rolePermissionMap: Record<Role, PermissionValue[]> = {
  USER: [
    PERMISSIONS.USER_VIEW,
  ],
  ADMIN: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
  ],
  SUPER_ADMIN: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
  ],
};

export function getPermissionsByRole(role: Role): PermissionValue[] {
  return rolePermissionMap[role] ?? [];
}

export function hasPermission(role: Role, permission: PermissionValue): boolean {
  return getPermissionsByRole(role).includes(permission);
}
