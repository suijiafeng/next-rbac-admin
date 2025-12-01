import { getCurrentAdminUser } from '@/lib/admin-user';
export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
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