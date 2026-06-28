import { ROLE_PERMISSION_MAP } from '@/constants/permission';
import type { PermissionValue } from '@/constants/permission';

export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export function getPermissionsByRole(role: Role): PermissionValue[] {
  return ROLE_PERMISSION_MAP[role] ?? [];
}

export function hasPermission(role: Role, permission: PermissionValue): boolean {
  return getPermissionsByRole(role).includes(permission);
}
