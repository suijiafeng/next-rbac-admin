export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}
export const rolePageMap = {
  [Role.SUPER_ADMIN]: ['*'],
  [Role.ADMIN]: [
    '/dashboard',
    '/monitoring',
    '/users',
    '/profile',
    '/feedback',
  ],
  [Role.USER]: [
    '/dashboard',
    '/monitoring',
    '/profile',
    '/feedback',
  ],
  // 注：超级管理员为顶层，无需提交反馈，故 rolePageMap 中其使用 '*' 通配
  // 但 page-registry 的 /feedback 守卫限定为 [ADMIN, USER]，超管访问该页将看到 403
};

export const PERMISSIONS = {
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',

  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',

  ROLE_VIEW: 'role:view',
  ROLE_CREATE: 'role:create',
  ROLE_EDIT: 'role:edit',
  ROLE_DELETE: 'role:delete',
} as const;

export type PermissionValue =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
