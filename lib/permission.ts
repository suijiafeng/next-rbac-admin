import { getCurrentAdminUser } from '@/lib/admin-user';
import { PERMISSIONS, PermissionValue } from '@/constants/permission';

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

export function hasPermission(
  role: Role,
  permission: PermissionValue,
): boolean {
  const permissions = getPermissionsByRole(role);

  return permissions.includes(permission);
}

export async function requireAdminUser() {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    throw new Error('未登录');
  }

  return currentUser;
}

export async function requireRole(allowRoles: Role[]) {
  const currentUser = await requireAdminUser();

  if (!allowRoles.includes(currentUser.role as Role)) {
    throw new Error('无权限');
  }

  return currentUser;
}

/**
 * 获取当前登录用户的完整权限信息
 */
export async function getCurrentAdminAuth() {
  const currentUser = await requireAdminUser();
  const role = currentUser.role as Role;
  const permissions = getPermissionsByRole(role);

  return {
    user: currentUser,
    role,
    permissions,
  };
}

/**
 * 服务端权限校验
 */
export async function requirePermission(permission: PermissionValue) {
  const authInfo = await getCurrentAdminAuth();

  if (!hasPermission(authInfo.role, permission)) {
    throw new Error('无权限');
  }

  return authInfo;
}